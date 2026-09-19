# Kalki BOS Notification / Reminder / Escalation Engine
**Implementation Architecture v1.0**

**Status:** DESIGN ONLY.

## 1. Domain Model

- **Work Definition:** Authoritative business rule (existing `workSituationDefinitions`). Owns timing, evidence, and reminder/escalation rules. Immutable rules applied per instance. Organization scoped.
- **Work Instance:** Concrete operational occurrence (existing `workInstances`). Owns its completion lifecycle (`SEEN`, `ACKNOWLEDGED`, `COMPLETED`, `VERIFIED`). Branch scoped.
- **Work Assignee:** The resolved individual(s) or role responsible for the Work Instance.
- **Schedule Rule:** Defined within `Work Definition`, controls when a due time applies (fixed time, event offset).
- **Due Rule:** The calculated absolute timestamp for a specific Work Instance.
- **Reminder Stage:** Configuration owned by the Work Definition. Can be ONE-TIME (default) or RECURRING (explicitly configured with repeat intervals and max occurrences).
- **Escalation Stage:** Configuration owned by the Work Definition. Evaluates positive offsets from Due time.
- **Operational Condition:** Derived state calculated by Scheduler evaluating current time against Due Rule (`On Time`, `Overdue`, `Escalated`).
- **Notification Event:** Durable logical request to notify a user (`notification_events`). Owned by Orchestrator. Organization scoped.
- **Notification Delivery:** Physical attempt to send a payload via a channel (`notification_deliveries`). Mutable (status updates).
- **Notification Preference:** User opt-ins/push tokens. Owned by the user.
- **Acknowledgement:** Positive confirmation of receipt (reflected in `work_instances.state` = `ACKNOWLEDGED`).
- **Work State History:** Immutable ledger of state changes (existing `audit_events`).
- **Escalation History:** Immutable ledger recording that a specific stage/occurrence executed for an instance (`work_escalation_history`).
- **Scheduler Run:** Distributed lock and heartbeat table (`scheduler_runs`).
- **Provider Event:** Webhook callback from delivery channel (normalized to update `Notification Delivery`).

## 2. State / Condition Model

We operate two distinct but related models to separate completion lifecycle from timing conditions.

**1. Work Lifecycle (Authoritative State - `workInstances.state`)**
- `SEEN` → `ACKNOWLEDGED` → `COMPLETED` → `VERIFIED`

**2. Operational Timing (Derived Conditions)**
- **Due:** Calculated timestamp.
- **Overdue:** Current time > Due Time AND `state` NOT IN (`COMPLETED`, `VERIFIED`).
- **Escalated:** Overdue duration > Escalation Rule AND Escalation Stage executed.

**Critical Rules:**
- **Overdue != Failed/Cancelled:** A Work Instance that is `ACKNOWLEDGED` but remains incomplete and becomes overdue remains ACTIVE by default. It does NOT automatically fail or expire merely because it becomes overdue.
- The `OVERDUE` and `ESCALATED` concepts do NOT overwrite the `ACKNOWLEDGED` or `SEEN` state.

## 3. Due-Time Engine

The database column `work_instances.due_at` is implemented **strictly as a query-efficient materialized cache**. It is NOT the sole business source of truth.

**Calculation:**
- Authoritative scheduling information remains derived from the Work Definition / Schedule Rule / Work Instance snapshot.
- Evaluated and materialized centrally upon Work Instance creation or when explicitly requested.
- **Timezone:** Resolved exclusively from `Organization` or `Location` metadata. Never uses server local time.

**Staleness and Recalculation:**
- The materialized `due_at` cache must be invalidated and recalculated if the schedule rule, assignment, timezone, or effective date changes.
- The scheduler must verify the materialized `due_at` aligns with the authoritative rule (or trust an event-driven cache invalidation layer) to prevent silently acting on stale data.
- Changes to `due_at` are rigorously audited in `audit_events`.

## 4. Reminder Engine

- **Trigger:** Configured negative or positive offset (e.g., 30 mins before `due_at`).
- **Repetition Policy:** A configured reminder stage executes **ONCE by default**.
- **Recurring Reminders:** Allowed only when explicitly configured with deterministic controls:
  - Repeat interval (e.g., every 15 minutes).
  - Maximum occurrences OR specific end condition.
  - Cancellation condition.
- **Cancellation:** If `work_instances.state` transitions to `COMPLETED` before execution, the reminder stage is ignored.

## 5. Escalation Engine

- **Trigger:** Configured positive offset (e.g., 15 mins after `due_at`).
- **Recipient Resolution:** Evaluated *at the time of execution*, not at Work Instance creation. (E.g., if a manager changes, the current manager receives the escalation).
- **Duplicate Prevention:** Protected via multi-layer idempotency (see Section 6).
- **Cancellation:** Transition to `COMPLETED` or `VERIFIED` suppresses all future escalations.

## 6. Multi-Layer Idempotency

The system must protect against duplicate scheduler execution, worker restarts, transaction retries, and duplicate provider callbacks. We use a 4-layer idempotency model:

1. **Stage Definition Identity:** The ID of the configured rule.
2. **Execution Occurrence Identity:** For a one-time stage, this is `work_instance_id + stage_position`. For a recurring stage, this is `work_instance_id + stage_position + occurrence_index`. This is the universal idempotency lock recorded in `work_escalation_history`.
3. **Notification Event Identity:** `notification_events.id`. Ensures we don't orchestrate delivery twice for the same logical event.
4. **Notification Delivery Identity:** `notification_deliveries.id` / `provider_id`. Ensures the physical channel adapter deduplicates physical attempts.

## 7. Scheduler Architecture (Modular Monolith Worker)

- **Architecture:** The server-side scheduler runs in a **Separate Worker Process**. We do NOT run a long-lived scheduler loop inside the Next.js web process.
- **Monolith:** This remains a modular monolith (same repository, database, shared domain services). We avoid microservices.
- **Locking:** Claims a heartbeat record in `scheduler_runs`. Only one worker executes the escalation check at a time for a given partition.
- **Reliability:** The worker must be restartable and horizontally safe through database-level concurrency controls. It never depends on the browser or app being open.

## 8. Transactional Boundary (The Handoff)

We strictly define the transaction boundary to ensure data synchronization between the operational state and the notification orchestrator:

**Boundary:**
`Scheduler Evaluation` → `[ DB TRANSACTION: Create Operational History (work_escalation_history) + Create Notification Event (notification_events) ]` → `Notification Orchestrator`

- **Rule:** The database MUST atomically record both the fact that the escalation executed AND the durable request to notify.
- **Outcome:** We avoid split-brain scenarios where the DB says an escalation happened but no notification was queued, or vice-versa.
- Physical notification delivery is asynchronous and updates `notification_deliveries` post-transaction.

## 9. Notification Orchestrator

**Flow:**
1. Orchestrator reads `notification_events`.
2. Resolves Recipients (Checking authorization and preferences).
3. Creates `notification_deliveries` records for relevant channels.
4. Invokes Provider-neutral Channel Adapters.
5. Updates `notification_deliveries` with success/fail/retry status.

**Channels (Initial):** In-App, **Standard Web Push + VAPID + Service Worker**.
**Channels (Future):** Android Push, SMS, WhatsApp.
*The Orchestrator explicitly avoids tight coupling to Firebase Cloud Messaging (FCM) or any specific provider.*

## 10. Acknowledgement Model

- **Notification Delivered:** Provider accepted the payload (Web Push 201).
- **Notification Seen:** User opened the notification tray (In-App).
- **Work Acknowledged:** User explicitly accepted responsibility (`work_instances.state` = `ACKNOWLEDGED`).
- **Work Completed:** User fulfilled business criteria and provided evidence (`COMPLETED`).
- **Work Verified:** Supervisor reviewed completion (`VERIFIED`).

## 11. Security Model

- **Organization/Branch Isolation:** Enforced deeply in SQL queries. A scheduler run for Org A cannot see Org B instances.
- **Notification Leakage:** Notification payloads contain minimal contextual IDs, avoiding PII where possible.
- **Escalation Auth:** Escalation recipients are validated against `businessRoles` reporting hierarchy.

## 12. Audit Model

The `audit_events` and `work_escalation_history` form the immutable audit trail.
- **WHO:** System (Scheduler) or specific Actor.
- **WHAT:** Event Type.
- **WHEN:** Timestamp (UTC).
- **WHY:** Trigger condition.
- **SOURCE:** The triggering instance ID.
- **RESULT:** Success or failure metadata.

## 13. Critical Notification Reliability

For **CRITICAL** work, there is no "best effort". Physical delivery can never be mathematically guaranteed when a device/network is unavailable, so reliability comes from system design:
- **Offline Recipient:** The server continues tracking. If Web Push fails, the orchestrator logs failure in `notification_deliveries` and retries via exponential backoff.
- **Escalation Continuation:** If a recipient is unreachable, the system continues to the next escalation stage (e.g., Supervisor → Manager) based strictly on time.
- **In-app Fallback:** Whenever the user reconnects and opens the application, the critical notification is durably awaiting them in-app.

## 14. Command Center Integration

- Command Center queries `work_instances` with derived operational rules.
- **Due Soon:** `state` = `SEEN/ACKNOWLEDGED` AND `due_at` within X hours.
- **Overdue:** `state` = `SEEN/ACKNOWLEDGED` AND `due_at` < NOW.
- **Escalated:** Joins `work_escalation_history` to surface actively escalated instances.
- **Notification Failures:** Queries `notification_deliveries` where status = `FAILED`.

## 15. Administration / Configuration

Administrators can configure:
- Global Retry Policies (e.g., max 3 attempts for Push).
- Notification Channel Enablement.
- Template Overrides (Tamil/English).
- Criticality Levels.
*(Reminder/Escalation rules remain on the Work Definition).*

## 16. Database Design (Conceptual)

- **`work_instances` (Extend):** Add `due_at` (timestamp, indexed) as a query-efficient materialized cache.
- **`work_escalation_history` (New):**
  - Columns: `id`, `organization_id`, `work_instance_id`, `stage_position`, `occurrence_index`, `executed_at`, `notification_event_id`.
  - Unique Constraint: `(work_instance_id, stage_position, occurrence_index)`. (Core idempotency key).
- **`notification_events` (New):**
  - Columns: `id`, `organization_id`, `type`, `recipient_user_id`, `payload`, `status`.
- **`notification_deliveries` (New):**
  - Columns: `id`, `event_id`, `channel`, `provider_reference`, `status` (PENDING, SUCCESS, FAILED), `retry_count`.
- **`scheduler_runs` (New):**
  - Columns: `id`, `partition`, `locked_at`, `locked_by`.
- **`notification_preferences` (New):**
  - Columns: `user_id`, `push_subscription_json`.

## 17. API Boundary

Future APIs to be designed:
- `POST /api/notifications/preferences` (Save Web Push Subscriptions).
- `GET /api/notifications/in-app` (List seen/unseen).
- `POST /api/notifications/in-app/mark-read`.
- `GET /api/work-instances/:id/escalations` (History view).

## 18. Implementation Phases

- **Phase 0:** Requirements & Architecture Finalization (Current).
- **Phase 1 (Data Model):** Extend `work_instances`, create notification schemas.
- **Phase 2 (Due-Time Engine):** Centralize calculations and safely materialize `due_at`.
- **Phase 3 (Scheduler & Escalation Engine):** Separate background worker and multi-layer idempotency logic.
- **Phase 4 (Notification Orchestrator):** Abstract events and in-app delivery.
- **Phase 5 (Web Push):** Standard Web Push + VAPID + Service Worker.
- **Phase 6 (Reliability Testing):** Kill-testing the scheduler, testing idempotency.
- **Phase 7 (Command Center):** UI visibility.
- **Phase 8 (Pilot Acceptance):** End-to-end testing with Anakul Palayam / TEST-001.

## 19. Pilot Scenario

**Setup:** Anakul Palayam Branch. Employee: TEST-001.
1. System generates **Kitchen Purchase Order** (Work Instance). State = `SEEN`. `due_at` = 07:00.
2. Scheduler worker evaluates one-time Reminder Rule (06:30). Atomically creates `work_escalation_history` and `notification_events`.
3. Notification Orchestrator resolves provider-neutral rules, delivers Web Push (06:30).
4. Time passes to 07:05. Work is now Overdue (State is still `SEEN`).
5. At 07:15, Scheduler claims E1, writes to `work_escalation_history`, emits Notification Event for **Supervisor**.
6. TEST-001 opens app, clicks Acknowledge. State = `ACKNOWLEDGED`. (Still Overdue).
7. TEST-001 completes work at 07:20. State = `COMPLETED`.
8. At 07:30, Scheduler checks E2 (Manager Escalation). Sees state is `COMPLETED`. Skips and cancels future stages.
9. Supervisor verifies at 08:00. State = `VERIFIED`.
10. Complete trace verified in `audit_events`.

## 20. Definition of Done

- **Durable Scheduling:** Separate worker triggers accurately when the browser is closed.
- **Recovery:** A simulated server crash and restart results in missed escalations firing immediately upon startup, safely guarded by idempotency keys.
- **Idempotency:** A simulated network partition/duplicate scheduler run never inserts two identical `work_escalation_history` records.
- **Transactional Consistency:** Notification events are durably created in the exact same transaction as their operational trigger.
- **Isolation:** Unauthorized cross-branch access is strictly denied.
- **Delivery Visibility:** Failed Web Push attempts are tracked and retried via durable orchestration.
- **Pilot Acceptance:** TEST-001 scenario passes fully on a real device.
