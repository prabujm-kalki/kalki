# ADR: Work and Notification Engine Integration

**Date:** 2026-09-19
**Status:** Accepted

## Context
Kalki BOS has a robust, highly tested existing Work Engine (`workInstances`, `workSituationDefinitions`) that manages the lifecycle of operational work (`SEEN` → `ACKNOWLEDGED` → `COMPLETED` → `VERIFIED`). It includes ordered Reminder and Escalation stages (`work_situation_reminder_escalation_stages`).

However, the existing system lacks a durable background scheduler to evaluate time-bound rules, and lacks a physical notification delivery orchestration layer. 

The new "Notification, Reminder & Escalation Engine Specification v1.0" demands a highly reliable, asynchronous, server-side evaluation of due dates and escalation paths, decoupled from browser sessions. A conceptual conflict existed between the Specification's state machine (`CREATED` → `ACKNOWLEDGED` → `IN_PROGRESS` → `OVERDUE` → `ESCALATED`) and the existing implementation's state machine.

## Decision
We will **preserve the existing Work/Situation/Task engine** and its state enum (`workInstanceStates`).

We will extend the architecture by building a separate **Scheduler + Reminder/Escalation Engine + Notification Orchestrator** subsystem.

### Core Architectural Decisions
- **Lifecycle Independence:** `OVERDUE` and `ESCALATED` will be treated as **Operational Timing Conditions** evaluated dynamically or logged in history, NOT as replacements for the Work lifecycle state. The `work_instances.state` will remain the authoritative source for the *User Completion Lifecycle*.
- **Overdue != Failed:** A Work Instance that is `ACKNOWLEDGED` but becomes `OVERDUE` remains active by default. It does not automatically fail, expire, or complete merely because time passed.
- **Reminder Frequency:** Reminder stages execute ONCE by default. Recurring reminders must be explicitly configured with deterministic controls (repeat interval, max occurrences, cancellation conditions).
- **Web Push Architecture:** Initial delivery will use **Standard Web Push + VAPID + Service Worker**. We will build a provider-neutral orchestration layer so future channels (Android Push, SMS, WhatsApp) can be cleanly integrated.
- **Process Architecture:** The Scheduler will run in a **Separate Worker Process**, but within the same Modular Monolith. It shares the same repository, database, and domain architecture as the Next.js web application. We will not use microservices.
- **Due Time Caching:** A `work_instances.due_at` column will be implemented as a **query-efficient materialized cache** only. Authoritative scheduling relies on the Work Definition / Schedule Rule / Work Instance snapshot, and the system must handle staleness and recalculation events safely.
- **Multi-layer Idempotency:** We will implement distinct idempotency layers for stage definition, stage execution occurrence, notification event generation, and physical notification delivery to prevent duplicate executions across worker restarts or network retries.

## Alternatives Considered

### Alternative 1: Merge `OVERDUE` and `ESCALATED` into `work_instances.state`
- **Description:** Alter the existing state enum to include the specification's states, overwriting `ACKNOWLEDGED` or `SEEN` when time passes.
- **Consequences:** If a user acknowledges a task, and it later becomes overdue, the state changes to `OVERDUE`. We lose the knowledge that the user actually saw and accepted it.
- **Status:** **Rejected**. Timing conditions are a separate dimension from user acceptance.

### Alternative 2: Build a completely separate Notifications Module
- **Description:** Build an isolated notification module with its own state machine and task tracking.
- **Consequences:** Creates a duplicate source of truth. Violates the specification's rule that "No module should implement its own independent reminder/escalation scheduler."
- **Status:** **Rejected**.

### Alternative 3: In-process Next.js Scheduler
- **Description:** Run a long-lived scheduler loop inside the Next.js web process.
- **Consequences:** Next.js serverless/API request limits or process restarts interrupt scheduling. Harder to guarantee reliable polling.
- **Status:** **Rejected**. We require a durable, separate worker process.

### Alternative 4: Tight coupling to Firebase Cloud Messaging (FCM)
- **Description:** Hardcode the notification logic specifically around FCM.
- **Consequences:** Makes it difficult to add SMS, WhatsApp, or alternative push services in the future.
- **Status:** **Rejected**. Provider-neutral abstractions are required.

## Consequences

**Positive:**
- The frozen People module and existing Work engine tests remain valid.
- We achieve mathematical separation of concerns: The Work engine owns authorization and completion rules; the separate Scheduler worker owns time and idempotency; the Notification Orchestrator owns delivery attempts.

**Negative/Complexity:**
- Multi-layer idempotency requires robust state checking.
- Transaction boundaries between creating an operational history record and emitting a notification event must be extremely strict to avoid data desynchronization.
