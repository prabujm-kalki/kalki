# Task Audit & History Timeline Design

To achieve absolute transparency and a 100% auditable lifecycle for every task in the system, we need to implement a **Chronological Timeline View**. When a user clicks "View" on any task in the Recent Activity feed, they should see a detailed, tamper-proof log of exactly what happened.

Here is the architectural design and implementation plan to build this.

## 1. The Database Architecture (The "Event Sourcing" Pattern)
Currently, we store the *current state* of a task in `task_instances`. To track history, we must implement an Event Sourced model by creating a new `task_events` (or `task_audit_logs`) table.

Every time a task's state changes, a new row is appended to this table. It should contain:
- `id` (UUID)
- `task_instance_id` (Foreign Key to the task)
- `event_type` (Enum: `CREATED`, `ASSIGNED`, `STARTED`, `COMPLETED`, `ESCALATED`, `RETURNED`, `APPROVED`, `EXTENSION_GRANTED`)
- `actor_id` (Who performed the action? System, User UUID, or Manager UUID)
- `actor_role_id` (The role of the actor at the time)
- `timestamp` (Exact datetime of the event)
- `metadata` (JSON blob containing specifics: e.g., "Reason for rejection", "Extension minutes requested", "Escalation Level 2 -> 3").

## 2. The Complete Lifecycle Tracking
With this table in place, the system will track the following chronological flow:

*   **T0:** Task Engine generates task `[Event: CREATED]`
*   **T1:** Task routed to Cashier Role `[Event: ASSIGNED]` (Shows: *Assigned to Cashier by System*)
*   **T2:** Cashier clicks 'Start' `[Event: STARTED]` (Captures the exact start timestamp)
*   **T3:** Cashier requests 15 min extension `[Event: EXTENSION_REQUESTED]`
*   **T4:** Manager approves extension `[Event: EXTENSION_GRANTED]` (Shows: *Approved by Manager John Doe*)
*   **T5:** Cashier submits work `[Event: COMPLETED]` (Task moves to `audit_pending`)
*   **T6:** 24 hours pass. System escalates `[Event: ESCALATED]` (Shows: *Escalated to Level 2 by Task Engine. Reason: SLA Breached*)
*   **T7:** Auditor reviews and Rejects `[Event: RETURNED]` (Shows: *Returned by Auditor Jane. Reason: Missing invoice attachment*)
*   **T8:** Cashier fixes and resubmits `[Event: COMPLETED]`
*   **T9:** Auditor Approves `[Event: APPROVED]` (Final closure).

## 3. The Frontend UI (The Timeline Modal)
When "View" is clicked, a slide-over pane or modal should open. 
It will be divided into two sections:

### Section A: Task Header (Current State)
- **Process Owner:** The user who ultimately completed the task (or is currently assigned).
- **Current Status:** e.g., `Awaiting Audit (Level 2)`
- **SLA Metrics:** 
  - *Time Allowed:* 60 minutes
  - *Time Taken:* 14 hours
  - *Extensions:* 1 Granted (+15 mins)

### Section B: Chronological Audit Trail (The Timeline)
We will use a vertical timeline UI component (similar to GitHub Pull Requests or Jira Tickets).
Each node on the timeline represents an event from the `task_events` table.
- A **Blue Node** for standard lifecycle events (Created, Assigned, Started).
- A **Green Node** for positive resolutions (Completed, Approved).
- A **Red Node** for warnings and negative actions (Escalated, Rejected, Returned).
- A **Gray Node** for background system actions.

Each node will display the **Exact Timestamp**, the **Actor Name**, and the **Action Details** parsed from the JSON metadata.

## 4. Alternative / Additional Visibility Options
To take this to an industrial standard, we can add:
1. **SLA Heatmaps:** A separate dashboard for Managers showing which tasks are consistently breaching SLAs, pointing to operational bottlenecks.
2. **Read Receipts:** Track when the assigned user actually *viewed* the task in their inbox, differentiating between "Ignored" and "Seen but not started".
3. **Immutable Blockchain/Ledger:** For ultra-strict compliance, the `task_events` table can be implemented as an append-only ledger where `UPDATE` and `DELETE` commands are strictly disabled at the PostgreSQL database level using triggers.
