# Kalki BOS Work/Notification Architecture Audit

**Date:** 2026-09-19
**Scope:** Existing Work/Situation/Task architecture vs Notification/Reminder/Escalation Engine Specification v1.0.
**Status:** Audit Only. No code modified.

## 1. Executive Summary
Kalki BOS currently possesses two parallel but overlapping foundational models for operational work: the **Work Situation** engine (heavyweight, evidence-based, robust state tracking) and the **Task** engine (lightweight, event/time triggered). Both models support defining work, assigning it, and tracking its state. However, **neither model currently possesses a durable, asynchronous, server-side scheduler**, nor do they have a physical notification delivery orchestration layer. The authoritative specification introduces the durable scheduling, escalation execution, and notification delivery mechanisms necessary to make these existing definitions reliable and actionable. The existing Work/Situation architecture is sound and should be extended, not replaced. The new Notification Engine should be built as a separate but deeply integrated subsystem that orchestrates delivery based on the existing Work/Situation rules.

## 2. Existing Work/Situation/Task Architecture
The existing application handles work in two domains:
1. **Work / Situation (`src/domains/roles-work/service.ts`)**
   - Supports definition of Work Situations (`workSituationDefinitions`).
   - Supports evidence requirements and robust role responsibilities.
   - Includes ordered Reminder/Escalation stages via `workSituationReminderEscalationStages` (e.g. `due_notification`, `reminder`, `escalation`, etc.).
   - Concrete work is instantiated as `workInstances` with a state machine (`SEEN`, `ACKNOWLEDGED`, `COMPLETED`, `VERIFIED`).
2. **Task Engine (`src/lib/task-engine.ts`, `src/db/schema.ts`)**
   - Lightweight event-triggered engine for specific modules.
   - Uses `taskDefinitions` and `taskInstances`.
   - Supports simple `escalationRoleId` and `dueAt` tracking.
   - Automatically creates `taskInstances` synchronously on events (`processEvent`).

## 3. Existing Database Model
**Work Engine Tables:**
- `work_situation_definitions`: Configuration of work, trigger categories (routine, event-based).
- `work_situation_evidence_requirements`: Required proof of completion.
- `work_situation_reminder_escalation_stages`: Configured ordered stages (`stage`, `position`, `configuration`).
- `work_instances`: Concrete work (`state`, `assigned_employee_id`, `location_id`).
- `work_instance_evidence_presences` & `work_instance_verification_presences`: Proof records.

**Task Engine Tables:**
- `task_definitions`: Task configurations (`trigger_type`, `action_type`, `target_role_id`, `escalation_role_id`).
- `task_instances`: Concrete tasks (`status`, `due_at`, `completed_at`).
- `task_audit_logs`: Task history.

**Audit Table:**
- `audit_events`: Generic robust auditing across the system.

## 4. Existing Services / APIs
- **Work / Situation API (`src/domains/roles-work/service.ts`)**: 
  - `createWorkSituationDefinition`, `setWorkSituationReminderEscalationStageActive`
  - `createWorkInstance`, `transitionWorkInstance`
  - Highly robust authorization and idempotency for state transitions.
- **Task API (`src/lib/task-engine.ts`)**:
  - `processEvent`: Synchronously listens to system events and generates `taskInstances`. No background polling or time-based delayed evaluation exists yet.

## 5. Existing Test Coverage
| Area | Test File | What It Verifies | Coverage Strength |
|---|---|---|---|
| Work Definitions | `roles-work.service.test.ts` | Creates and retrieves role baselines with ordered children | Strong |
| Work Instances | `work-instances.service.test.ts` | Instance foundation, unauthenticated/unauthorized rejection | Strong |
| Instance State | `work-instance-operations.service.test.ts` | Visibility and filtering of instances by identity | Strong |
| Evidence | `work-instance-evidence.service.test.ts` | Evidence presence creation and retrieval | Strong |
| Reminder Snapshot | `work-instance-snapshot.service.test.ts` | Captures ordered reminder/escalation config on instance snapshot | Strong |

## 6. Existing Reminder / Escalation Capability
- **Current State:** The database *models* Reminder and Escalation stages (`work_situation_reminder_escalation_stages`) and takes a snapshot of them when an instance is created (`definitionSnapshot` in `workInstances`).
- **Gap:** There is **no execution engine**. No background scheduler polls `workInstances` to evaluate if a `due_at` has passed or if an escalation stage needs to trigger.

## 7. Existing Notification Capability
- **Current State:** Zero.
- **Gap:** There are no tables for `notification_events`, `notification_deliveries`, or `notification_preferences`. No channel adapters (Push, SMS, Web) exist.

## 8. Specification Crosswalk

| Notification Specification Concept | Existing Kalki BOS Concept | Existing Table/Service | Status | Gap | Integration Approach |
|---|---|---|---|---|---|
| Work Definitions | Work Situation Definitions | `work_situation_definitions` | Present | None | Preserve & Use |
| Work Instances | Work Instances | `work_instances` | Present | State machine slightly differs (`SEEN` vs `CREATED`) | Reconcile state enum |
| Reminder Stages | Reminder/Escalation Stages | `work_situation_reminder_escalation_stages` | Present | No execution engine | Build Scheduler to evaluate stages |
| Escalation Stages | Reminder/Escalation Stages | `work_situation_reminder_escalation_stages` | Present | No execution/history tracking | Build Scheduler & `work_escalation_history` |
| Notification Events | None | None | Missing | Entire schema missing | Build `notification_events` |
| Notification Deliveries| None | None | Missing | Entire schema missing | Build `notification_deliveries` |
| Scheduler Runs | None | None | Missing | No background processor | Build `scheduler_runs` & durable cron/worker |
| State History | Audit Events | `audit_events` | Present | Needs specific escalation tracking | Enhance or add `work_state_history` |
| Acknowledgement | Instance State (`ACKNOWLEDGED`) | `work_instances.state` | Present | Dedicated table suggested in spec | Use existing state or add table if multi-user |

## 9. Gaps
1. **Durable Scheduler:** Missing entirely.
2. **Notification Orchestrator:** Missing entirely.
3. **State Machine Divergence:** Spec mentions `CREATED`, `ASSIGNED`, `ACKNOWLEDGED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`, `ESCALATED`, `CANCELLED`. Existing codebase uses `SEEN`, `ACKNOWLEDGED`, `COMPLETED`, `VERIFIED`.

## 10. Security Findings
- **Organization Isolation:** Strongly enforced on `workInstances` and `taskInstances`.
- **Role Authorization:** Verified existing APIs (`transitionWorkInstance`) correctly enforce that only assigned employees or authorized supervisors can progress states.
- **No leakage:** Verified no cross-organization leakage in schemas or endpoints.
- **Provider Secrets:** Verified no provider secrets exist in source control currently, as no providers are implemented.

## 11. Reliability Findings
- The system is currently reliable for data integrity but **fails the timing reliability requirement** because there is no durable, restarting background process. A missed event or process restart currently means a time-bound task stays pending forever.

## 12. Recommended Integration Architecture
**Recommendation:** **C. Existing Work engine extended with notification capabilities**

**Reasoning:**
The specification explicitly demands we *"reconcile the existing shared Work/Situation/Task/Escalation implementation before adding duplicate structures"* and states *"No module should implement its own independent reminder/escalation scheduler."*
The existing `workInstances` and `work_situation_reminder_escalation_stages` are heavily tested and structurally sound. We should NOT redesign them. Instead, we should:
1. Build a separate, durable **Scheduler Engine** that periodically polls `workInstances` and `taskInstances` against current time.
2. Build the **Notification Orchestrator** (`notification_events`, `notification_deliveries`) as a separate supporting subsystem.
3. When the Scheduler detects an overdue stage, it triggers the Notification Orchestrator and updates the Work Engine's state.

## 13. What must NOT be changed
- The `work_instances` and `work_situation_definitions` authorization and multi-tenant schema foundations.
- Existing tests for `role-work` that validate evidence presences and snapshots.
- The People module (frozen).

## 14. What should be extended
- `work_instances` state machine should either map to the specification's states conceptually or be updated via migration to strictly follow `OVERDUE` and `ESCALATED` states.

## 15. What must be newly built
- `notification_events`, `notification_deliveries` database models.
- Server-side durable Scheduler loop with idempotency locking.
- Web/PWA Push Channel Adapter.
- Command Center integration.

## 16. Implementation Sequence
1. **Data Model:** Migrate schema to add Notification/Scheduler tables and update enums.
2. **Scheduler Engine:** Implement idempotent background claiming of overdue work stages.
3. **Notification Abstraction:** Implement generic event recording.
4. **Web Push:** Wire up the first delivery channel.
5. **Pilot Acceptance:** Verify with TEST-001.

## 17. Risks
- **Concurrency & Idempotency:** The scheduler must be mathematically sound to prevent sending duplicate critical notifications if multiple workers run.
- **Timezones:** The spec enforces organization/location timezones instead of server time. We must ensure Postgres timestamp comparisons correctly respect these local boundaries.

## 18. Manual Business Decisions Required
- The spec suggests states: `CREATED`, `ASSIGNED`, `ACKNOWLEDGED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`, `ESCALATED`, `CANCELLED`.
- Existing implementation uses: `SEEN`, `ACKNOWLEDGED`, `COMPLETED`, `VERIFIED`.
- **Decision Needed:** Should we migrate existing `SEEN/VERIFIED` data and Enums to match the spec strictly, or map the spec's conceptual states to the existing implementation?

## 19. Engineering decisions that can be made automatically
- We can auto-resolve the Notification tables (events, deliveries, preferences) as standard `uuid`, `organization_id`-scoped relational tables without breaking existing architectures.
- Idempotency key generation can automatically use `work_instance_id` + `stage_position` to guarantee safety.
