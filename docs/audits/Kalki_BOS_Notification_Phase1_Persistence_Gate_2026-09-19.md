# Kalki BOS Notification Phase 1 Persistence Gate
**Date:** 2026-09-19

## Verification Summary
- **Migration Name:** `0015_solid_moira_mactaggert`
- **147 Baseline Status:** Verified PASS (147 existing tests + 5 new tests = 152 total).
- **Typecheck:** Verified PASS.
- **Build:** Verified PASS.
- **Commit Hash:** `[PENDING]`
- **Pushed Branch:** `[PENDING]`
- **GitHub Push Verification:** `[PENDING]`

## Schema Changes

### Modified Tables
- **`work_instances`**:
  - Added `due_at` (`timestamp with time zone`).
  - Added index `work_instances_organization_due_idx` on `(organization_id, due_at)`.

### New Tables
1. **`work_escalation_history`**:
   - Primary idempotency log for escalations.
   - Core Constraint: `UNIQUE (work_instance_id, stage_position, occurrence_index)`.
2. **`notification_events`**:
   - Abstract domain intent to notify.
   - Core Constraint: `UNIQUE (idempotency_key)`.
3. **`notification_deliveries`**:
   - Physical delivery attempt state.
   - Core Constraint: `UNIQUE (idempotency_key)`.
   - Data Constraint: `CHECK (attempt_count >= 0)`.
4. **`scheduler_runs`**:
   - Worker lock/heartbeat table.
5. **`notification_provider_events`**:
   - Push provider callbacks.
   - Core Constraint: `UNIQUE (provider, provider_event_id)`.
6. **`notification_preferences`**:
   - User notification opt-ins and channel config.
   - Core Constraint: `UNIQUE (user_id, channel)`.

## Constraints & Isolation
- Deeply enforced `organization_id` isolation logic leveraging foreign key references to `organizations` and `work_instances`.
- Reused `authUsers` cascading delete restrictions for recipient identity consistency.

## Tests Added
Created `tests/domains/notification-persistence.test.ts` to strictly verify schema-level enforcement of:
- `due_at` persistence logic.
- Escalation idempotency (unique constraints).
- Notification event idempotency.
- Foreign key/Organization isolation verification for new events.
- Scheduler run persistence.

## Remaining Phase 1 Limitations
- `due_at` has been added, but no application-tier logic populates it yet.
- The schema is foundational; there is no Next.js worker logic or Notification Orchestrator logic.
- We did not implement Command Center UI or physical Push delivery, aligning strictly with Phase 1 boundaries.
