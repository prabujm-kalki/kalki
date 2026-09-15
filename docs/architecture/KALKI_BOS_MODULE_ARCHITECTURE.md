# Kalki BOS — Module Architecture v1

Initial Top-Level Module Structure & Architectural Boundaries
**Status:** FROZEN FOR INITIAL DEVELOPMENT
**Purpose:** Repository source of truth for the current top-level Kalki BOS module structure. Detailed sub-module design is intentionally completed one module at a time.

## 1. Current Top-Level Modules

1. **People** — Employee master, roles, branches, reporting hierarchy, documents, contacts, employment history and related workflows.
2. **Attendance** — Attendance capture/imports, validation, exceptions, corrections, approval/locking and payroll-ready attendance aggregation.
3. **Payroll** — Salary calculation, advances, holds, deductions, payslips, payroll history, approvals and future statutory compliance.
4. **Purchasing** — Vendors, purchase requests, purchase orders, receipts, discrepancies, bills, payables, payments and cost center tracking.
5. **Inventory** — Stock ledger, receipts, consumption, waste, transfers, stock counts, adjustments, recipes/production and valuation.
6. **Sales** — Sales/billing ingestion, reconciliation, sales reporting, item/order information and future POS integration.
7. **Customer / CRM** — Customer identity, history, segmentation, customer intelligence and controlled opportunity workflows.
8. **Finance** — Expenses, supplier invoices, payables, payments, allocations, reconciliation and financial controls.
9. **Reports / Command Center** — Management visibility, cross-module reporting, daily briefings, decisions, opportunities and command-center interventions.
10. **Administration / Settings** — Organization/branch configuration, permissions, integrations, system configuration and cross-system administration.

## 2. Development Strategy

Freeze only the top-level architecture now. Design detailed sub-modules only when that module is being developed.

For each module: `scope -> sub-modules -> functions -> business rules -> data model -> authorization -> UI -> integrations -> automated tests -> integrated scenario testing -> verification -> freeze.`

Initial development order: People -> Purchasing -> Attendance -> Payroll -> Inventory -> Sales -> Customer / CRM -> Finance -> Reports / Command Center -> Administration / Settings.

## 3. Navigation Principles

Keep the initial UI simple; do not create extra top-level navigation items merely because a feature exists.
The ten modules above are the official initial top-level navigation boundaries.
Future modules can be added later without restructuring the core architecture.
New functionality should normally live inside an existing module unless there is a genuine business/architectural reason for a new top-level module.
Do not prematurely define all future sub-modules.

## 4. Cross-System Capabilities — Not Top-Level Modules

- **AI / Intelligence** — Cross-system capability embedded in relevant modules and Command Center; not a separate top-level module.
- **Work / Situation / Task / Escalation** — Shared operational engine integrated into relevant workflows and Command Center; not a separate top-level module.
- **Assets & Maintenance** — Not a top-level module initially; may be introduced later if justified by operational requirements.
- **Contacts** — Initially part of People through the Contact Directory.
- **Integrations** — Initially managed through Administration / Settings and the provider-neutral Integration Gateway.

## 5. Authorization Principle

Keep the user-facing access model simple: module-level View / Manage / Approve, with branch scope where required.
Retain the underlying authorization architecture: `Module -> Resource/Submodule -> Action -> Branch Scope`. Server-side authorization is mandatory; UI visibility is not a security boundary.

## 6. Module Independence and Integration

Each module must maintain clear domain boundaries. Cross-module behavior should use defined services/contracts rather than uncontrolled direct data manipulation.

Examples:
- People -> Attendance -> Payroll
- Purchasing -> Inventory
- Sales -> Customer/CRM
- financial consequences -> Finance
- shared Work/Situation/Task/Escalation across operational domains.

## 7. Future Module Rules

Do not add a top-level module simply to solve a UI grouping problem.
Before adding one, determine whether the capability correctly belongs inside an existing module.
Any genuinely new module requires documented purpose, boundary, dependencies, authorization and navigation impact before implementation.
Future additions must preserve existing contracts and historical data.
The ten-module structure is frozen for the initial build, not a permanent prohibition on future modules.

## 8. Immediate Instruction

People is the current implementation priority. Before further People coding, reconcile the existing People implementation against the approved People requirements and the People Module Completion Master Plan. Do not redesign the remaining modules at this stage.

## 9. Verification Requirement

After every module change, verify against this architecture, the module's authoritative requirements, database integrity, authorization, auditability, integrations, automated tests and regression behavior before proceeding.
