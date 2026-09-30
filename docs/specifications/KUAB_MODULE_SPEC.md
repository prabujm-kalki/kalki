# Kalki Universal Automation Bus (KUAB) — Functional & Architectural Specification

Document ID: KALKI-SPEC-KUAB-001
Target Architecture: Next.js 16.3.3, React 19.2.7, Node.js 24 LTS, PostgreSQL 17.11, Drizzle ORM, Better Auth
Authority: Master Baseline Handover v1.0
Target Location: docs/specifications/KUAB_MODULE_SPEC.md

## 1. Executive Summary & Core Architectural Philosophy

### 1.1 Why It Exists
Across multi-format retail and hospitality operations (such as Kalki Family Restaurant, Multicuisine branches, and Kalki Department Store), operational execution involves recurring checklists, physical orders, and time-bound exception management. Previously, individual domains (People, Attendance, Payroll, Purchase, Hall Booking) were at risk of building isolated, brittle reminder scripts.

The Kalki Universal Automation Bus (KUAB) establishes a centralized, standalone engine serving all business domains within Kalki BOS. KUAB governs follow-ups, priorities, and multi-level escalations through a single, unified pipeline.

### 1.2 The Non-Negotiable Mandates
*   **Zero-Code Production Configuration:** Task Definitions, recurrence rules, dynamic inputs, escalation policies, grace periods, and evidence requirements must be fully configurable through the application UI after deployment without requiring Next.js code redeployments or developer intervention.
*   **Strict Separation of Blueprint vs. Occurrence:** The engine maintains an absolute boundary between reusable configuration definitions (`task_definitions`) and live operational executions (`task_instances`).
*   **Decoupled Domain Architecture:** Adjacent business modules (Attendance, Inventory, Purchase, Hall Booking) never handle notifications or timers directly. They interact exclusively by publishing events to KUAB.
*   **Ten-Year Architectural Stability:** Engineered to support a 10-year enterprise lifecycle using an append-only audit trail, strict database row-level locking, and decoupled, stateless worker processes.

## 2. Dynamic Configuration Wizard (5-Step Lifecycle)
To prevent data drift and eliminate hardcoded UI forms, KUAB implements an entity-aware rendering pipeline across five distinct steps:

```
[Step 1: Module & Context]
         │
         ▼
[Step 2: Trigger Strategy] ──► Path A: Scheduled (Recurrence/Cron)
         │                 ──► Path B: Event-Driven (Domain Actions)
         ▼
[Step 3: Entity-Aware Inputs & Conditions] (JSON Schema Dynamic Form)
         │
         ▼
[Step 4: Role Assignment & Evidence Requirements] (Business Roles / Audit Proof)
         │
         ▼
[Step 5: Escalation Policies & Checkpoint Rules] (1-to-N Tiers, Relational Windows)
```

**Step 1: Module & Context Selection**
*   **Action:** The user selects the business module domain.
*   **Integration:** Evaluated against `src/lib/permissions-registry.ts` to ensure multi-tenant RBAC containment. Supported domains include ATTENDANCE, PURCHASE, INVENTORY, HALL_BOOKING, PAYROLL, and OPERATIONS.

**Step 2: Trigger Strategy & Function Catalog**
The user designates whether the workflow is clock-driven or action-driven:
*   **Schedule-Driven (Recurrence Engine):** Defines routine operations (e.g., Daily Vegetable Order, Manager Opening Checklist). Recurrence rules support daily execution, specific weekdays, bi-weekly intervals, or monthly schedules.
*   **Event-Driven (Transactional Engine):** Defines reactive workflows listening for domain events (e.g., PUNCH_MISSED, CRITICAL_STOCK_REACHED, HALL_BOOKING_CONFIRMED).

**Step 3: Entity-Aware Dynamic Inputs & Conditions**
When a trigger function is chosen, the backend delivers a structured JSON Schema defining the required fields:
*   **Static Values:** Scalar thresholds (e.g., Grace Period = 15 mins, Minimum Stock = 5 units).
*   **Entity Dropdowns (Relational Mapping):** The schema instructs the frontend form to fetch active database entities (e.g., `/api/v1/shifts` for Attendance, `/api/v1/vendor-categories` for Purchase).
*   **Conditional Operators:** Evaluation rules stored as JSONB predicates (e.g., `{"operator": ">", "field": "currentStock", "value": "reorderPoint"}`).

**Step 4: Role Assignment & Evidence Protocol**
*   **Dynamic Role Binding:** Tasks route to a `businessRoleId` (e.g., "Kitchen In-Charge", "Store Floor Supervisor") rather than a hardcoded `employeeId`. If an individual resigns or swaps shifts, the task targets whoever holds that role on duty.
*   **Mandatory Evidence Requirements:** Tasks configure explicit completion proofs:
    *   **NONE:** Simple acknowledgement.
    *   **NUMERIC:** Numerical data capture.
    *   **CHECKLIST:** Sub-items that must all be marked true.
    *   **PHOTO:** Image capture with camera-lock and timestamp metadata.

**Step 5: Escalation Policies & Checkpoint Rules**
*   **Checkpoints:** Configures relative milestones for long-duration tasks (e.g., 50% and 70% duration prompts).
*   **1-to-N Escalation Tiers:** Defines sequential escalation routing, where each level specifies:
    *   Target recipient (Direct reporting manager, specific role, or Location Head).
    *   Grace window (minutes) before transitioning to the next tier.
    *   Notification channel (In-App, push banner, or high-priority audible alarm).

## 3. Operational Mechanics Across Workflow Scenarios

### 3.1 Attendance & Absenteeism Escalations (Example 1)
```
Shift Start: 09:00 AM
  │
  ├─ 09:00 AM: Biometric / Selfie Punch missing ──► Task Instance Created (PENDING)
  ├─ 09:15 AM (Grace Expires): Level 1 Escalation ──► In-App Prompt to Employee
  ├─ 09:30 AM (Level 1 Ignored): Level 2 Escalation ──► Alert to Shift Manager (Action: Call Staff)
  └─ 09:45 AM (Manager Inaction): Level 3 Escalation ──► High-Priority Alert to Location Head / Owner
```
*   **Mechanism:** Attendance Reconciliation publishes `ATTENDANCE_CHECK_IN_CONFIRMED` upon a valid punch. If missing past the configured startTime + gracePeriodMinutes, KUAB initiates the task instance.
*   **On-Duty Gating:** The engine validates the live attendance ledger before dispatching dependent tasks to floor employees.

### 3.2 Scheduled Daily & Weekly Purchasing (Examples 2, 3, 4)
*   **Mechanism:** A persistent cron worker evaluates recurring task definitions at scheduled execution times.
*   **Execution:** A task instance is created and assigned to the Purchase In-Charge. The UI provides a direct shortcut link to the Purchase Module with pre-filtered vendor categories.
*   **Escalation:** If unfulfilled within the priority grace window, Level 1 escalation notifies the Head Chef and General Manager.

### 3.3 Managerial & Kitchen Checklists (Examples 5, 6)
*   **Mechanism:** Time-based daily opening/closing routines instantiated for supervisory roles.
*   **Validation:** Bathroom checks at 10:00 AM and Kitchen inspections at 11:00 AM enforce evidence verification (CHECKLIST + PHOTO).
*   **Exception Handling:** If the facility is closed, managers submit a SKIP or SNOOZE exception with a mandatory text justification.

### 3.4 Ad-Hoc Voice-Generated Tasks with Relative Checkpoints (Example 7)
*   **Voice Parsing:** Captured string: "Create a new menu card. Assign it to Praveen. Deadline is 15 days. Every day at 8 PM, I need the status."
*   **Direct Instance Creation:** The payload bypasses `task_definitions` and directly seeds a `task_instances` record with: `assignedToUserId`, `dueDate`, `dailyReportingTime`.
*   **Relative Checkpoint Timers:** The engine mathematically computes relative durations at creation (Day 7.5 and Day 10.5).
*   **Status Prompts & Extensions:** Every evening at 8:00 PM, an interactive prompt appears. At Checkpoints, the engine dispatches a progress verification dialog. Extensions pause primary escalations and spawn a child approval task.

### 3.5 Event-Triggered Stock Depletion (Example 8)
*   **Mechanism:** When the Inventory ledger processes an ingredient adjustment that drops stock below `reorderPoint`, it publishes `INVENTORY_CRITICAL_LEVEL`.
*   **Action:** KUAB catches the event and renders a high-priority action modal on the Store Manager's dashboard. Approving the prompt automatically redirects to a pre-filled Draft Purchase Order.

## 4. Prioritization, Severity & Dynamic Routing
Escalation speed is governed strictly by the priority matrix configured in the Task Definition.
Hierarchy Traversal & Circuit Breaking prevents null-fallback, circular management loops, and sets a terminal escalation to the Organization Owner.

## 5. Drizzle ORM Database Schema Blueprint
*(Schema defined in the source document)*

## 6. Execution & Runtime Architecture
```
[External Event / Cron] 
       │
       ▼
 [Node.js Worker] ──► Reads kuab_trigger_catalog & task_definitions
       │
       ▼
 [PostgreSQL 17]  ──► Inserts task_instances (Row Locked via FOR UPDATE SKIP LOCKED)
       │
       ▼
 [Redis / BullMQ] ──► Schedules Delayed Checkpoints (50%, 70%) & Escalation Sweepers
       │
       ▼
 [Notification]   ──► WebSocket / Push Server dispatches alerts to AppShell UI (/work)
```
*   **Concurrency Control:** The worker queries pending escalations using `FOR UPDATE SKIP LOCKED`.
*   **Comprehensive Audit Logging:** Every change preserves an immutable operational log.
