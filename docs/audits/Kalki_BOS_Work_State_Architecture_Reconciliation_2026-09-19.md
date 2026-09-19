# Kalki BOS Work State Architecture Reconciliation

**Date:** 2026-09-19
**Scope:** Work State / Notification State Reconciliation.
**Status:** Architecture Reconciliation Only. No code modified.

## 1. Existing Work State Model

The current implementation in `src/domains/roles-work/service.ts` uses the following mutually exclusive states for a `workInstance`:

- **`SEEN`**:
  - **Meaning:** The work instance has been created and assigned, but the assignee has not yet explicitly accepted or viewed it in a meaningful way.
  - **Storage:** `work_instances.state`.
  - **Trigger:** System/Backend creates the instance.
  - **Audited:** Yes, via `audit_events` ("created").
- **`ACKNOWLEDGED`**:
  - **Meaning:** The assignee has positively confirmed they have seen and accepted responsibility for the work.
  - **Storage:** `work_instances.state`.
  - **Trigger:** Assignee action (via `transitionWorkInstance`).
  - **Audited:** Yes.
- **`COMPLETED`**:
  - **Meaning:** The operational work is done. It requires evidence (`work_instance_evidence_presences`) if configured.
  - **Storage:** `work_instances.state`.
  - **Trigger:** Assignee action.
  - **Audited:** Yes.
- **`VERIFIED`**:
  - **Meaning:** A supervisor has verified the completed work. Requires `work_instance_verification_presences`.
  - **Storage:** `work_instances.state`.
  - **Trigger:** Supervisor action.
  - **Audited:** Yes.

## 2. Notification Specification State Model

The specification (Sections 10 & 13) defines the following concepts:

- **`CREATED` / `ASSIGNED`**: Work exists and is targeted.
- **`ACKNOWLEDGED`**: Recipient confirmed receipt/acceptance.
- **`IN_PROGRESS`**: Work has started.
- **`COMPLETED`**: Completion conditions satisfied. Terminal state.
- **`OVERDUE`**: Due time passed without completion.
- **`ESCALATED`**: An escalation stage executed.
- **`CANCELLED`**: Work no longer applies.

## 3. State-By-State Comparison

| Existing State | Specification State | Equivalent? | Partially Equivalent? | Different Concept? | Evidence |
|---|---|---|---|---|---|
| `SEEN` | `CREATED`/`ASSIGNED` | Yes | - | - | Initial creation state in `service.ts` before user interaction. |
| `ACKNOWLEDGED` | `ACKNOWLEDGED` | Yes | - | - | Direct 1:1 mapping for user acceptance. |
| (None) | `IN_PROGRESS` | - | - | Yes | Explicitly missing in current enum. `ACKNOWLEDGED` loosely acts as in-progress. |
| `COMPLETED` | `COMPLETED` | Yes | - | - | Both systems treat this as the primary resolution state. |
| `VERIFIED` | (None) | - | - | Yes | Kalki BOS specific audit layer beyond completion. |
| (None) | `OVERDUE` | - | - | Yes | **Crucial difference** (see Section 4). |
| (None) | `ESCALATED` | - | - | Yes | **Crucial difference** (see Section 4). |

## 4. The "Overdue" and "Escalated" Conundrum

**Question:** Are `OVERDUE` and `ESCALATED` actual states of the Work itself (mutually exclusive with `ACKNOWLEDGED`/`IN_PROGRESS`), or are they derived operational conditions?

**Analysis:**
If a user acknowledges a task (`ACKNOWLEDGED`), but takes too long to finish it, it becomes `OVERDUE`. It is logically both acknowledged and overdue. If we overwrite `ACKNOWLEDGED` with `OVERDUE` in a single `state` enum, we lose the critical business knowledge that the user actually saw and accepted the task. 

Furthermore, Section 12 of the spec proposes `work_state_history` and `work_escalation_history` as separate tables.

**Conclusion:** 
The two models should represent **Two related state machines / dimensions**.
1. **User Completion Lifecycle:** (`SEEN` → `ACKNOWLEDGED` → `COMPLETED` → `VERIFIED`). This is owned by the assignee and supervisors.
2. **Timing/Escalation Lifecycle:** (On-Time → `OVERDUE` → `ESCALATED`). This is evaluated by the server-side Scheduler based on time and rules.

We must **NOT** pollute the existing `SEEN/ACKNOWLEDGED/COMPLETED/VERIFIED` enum with `OVERDUE` or `ESCALATED`. They are different dimensions.

## 5. Existing Components to Preserve

| Existing Component | Preserve? | Extend? | Replace? | Reason |
|---|---|---|---|---|
| `work_situation_definitions` | Preserve | No | No | Authoritative source of business rules and triggers. |
| `work_situation_reminder_escalation_stages` | Preserve | No | No | Perfectly models the spec's requirement for ordered reminder/escalation rules. |
| `work_instances` (Table) | Preserve | **Extend** | No | The core operational record. Needs a `due_at` column or similar derived timing cache so the scheduler can query it efficiently, or the scheduler must compute it from `createdAt` + `definitionSnapshot`. |
| `work_instances.state` (Enum) | Preserve | No | No | The existing `SEEN/ACKNOWLEDGED/COMPLETED/VERIFIED` pipeline is semantically robust. |
| `task_definitions` | Preserve | No | No | Event-triggered lightweight task definitions. |
| `task_instances` | Preserve | No | No | Currently contains `dueAt` and its own `status` enum. |
| `audit_events` | Preserve | No | No | Robust tracking. |

## 6. Target Conceptual Integration Architecture

```text
1. Work Instance Created (SEEN)
        ↓ (Persisted in DB)
2. Scheduler Engine (Durable Cron/Worker)
        ├─ Polls `work_instances` where state NOT IN (COMPLETED, VERIFIED)
        ├─ Evaluates current time against `definitionSnapshot` rules
        ↓ 
3. Reminder / Escalation Evaluation
        ├─ Identifies stage to execute (e.g. "E1")
        ├─ Checks `work_escalation_history` (Idempotency check: has E1 run?)
        ↓
4. Notification Orchestrator
        ├─ Generates `notification_events`
        ├─ Records execution in `work_escalation_history`
        ↓
5. Notification Delivery Channels
        ├─ Web/PWA Push Adapter attempts delivery
        └─ Records outcome in `notification_deliveries`
        ↓
6. User Action
        └─ User completes work → `work_instances.state` = COMPLETED. Scheduler stops tracking.
```

This architecture perfectly reconciles the specification with the existing code without breaking the frozen People module or requiring a rewrite of the Work engine.

## 7. Database Impact — Conceptual Only

- **`work_instances`:** May need an extension (e.g., a `due_at` timestamp or an `is_overdue` boolean) if querying raw JSON `definitionSnapshot` in the scheduler loop proves too slow.
- **`work_escalation_history`:** **Genuinely New.** We need a table to record that a specific stage (e.g., `position: 1`) ran for a specific `work_instance_id` to guarantee idempotency.
- **`notification_events`:** **Genuinely New.** Represents the abstract intent to notify a user.
- **`notification_deliveries`:** **Genuinely New.** Represents physical delivery attempts via Web Push.
- **`scheduler_runs`:** **Genuinely New.** Distributed lock/heartbeat table to ensure only one scheduler worker processes escalations at a time.
- **`notification_preferences`:** **Genuinely New.** User opt-ins/push tokens.

## 8. Temporary Spec File
The specification `spec.txt` extracted during the previous audit is a **TEMPORARY — NOT FOR COMMIT** working artifact. It exists purely for reference and will not be pushed to the repository.

## 9. Security & Reliability Implications
- **Security:** By keeping the Notification Orchestrator decoupled from the `work_instances` state machine, we avoid touching the highly sensitive `transitionWorkInstance` API logic, preserving existing authorization guarantees.
- **Reliability:** Idempotency is guaranteed by `work_escalation_history`. The scheduler can safely restart and retry without risking duplicate escalations.

## 10. Genuine Business Decision Required
Should we formally add `IN_PROGRESS` and `CANCELLED` to the `workInstanceStates` enum in Kalki BOS, or should we stick to the existing `SEEN`, `ACKNOWLEDGED`, `COMPLETED`, `VERIFIED` flow? The current flow functions effectively, but lacks a state for "work is no longer relevant" (`CANCELLED`), which may require manual deletion currently.
