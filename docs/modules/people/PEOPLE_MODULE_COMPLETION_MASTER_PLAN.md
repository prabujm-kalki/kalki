# PEOPLE MODULE COMPLETION MASTER PLAN v1.2.2

## 1. Approved People Requirements
The People module is the foundational module of Kalki BOS, responsible for managing the entire lifecycle of an employee from onboarding to exit. Key requirements include:
- **Employee Master**: Comprehensive personal, family, emergency, and demographic details.
- **Roles and Access**: Assignment of one or more roles, controlling system permissions and branch visibility. Direct add/remove with audit; no separate Owner approval workflow is needed for role changes.
- **Employee Lifecycle**: Strict status transitions (`DRAFT` -> `ACTIVE` <-> `INACTIVE` -> `EXITED`). HR / Manager / Owner may activate an employee after all required onboarding validation and onboarding declaration are complete. Owner approval is NOT required for normal activation.
- **Edit/Approval Workflow**: Changes to existing employee master records proposed by HR/Managers require Owner approval. Owners may directly edit records. Initial branch assignment is part of onboarding, but subsequent branch transfers/changes require the approved change workflow and Owner authorization.
- **Employment History**: Effective-dated history for role, branch, salary, reporting person, category, and status changes. History must be reliably queryable by effective date; do not make historical business facts dependent solely on an opaque JSON snapshot. No historical facts should be overwritten.
- **Documents & Photo**: Secure capture of Aadhaar and Photo ONLY (mandatory), plus up to 3 optional documents (Other 1, Other 2, Other 3). PAN is not a People field. Application Form is not mandatory.
- **Salary & Payment Info**: Storage of agreed salary details and payment methods (Bank, GPay, Cash). Payroll calculation is excluded. Salary changes require the Owner approval workflow, and salary history must be effective-dated and preserved.
- **Organization Hierarchy**: Tree-view based on direct employee-to-employee reporting lines. Must prevent self-reference and reporting cycles.
- **Contact Directory**: Shared directory for organizational contacts based on branch scope. Contact visibility must respect role/branch/configured visibility. Employee personal mobile numbers must not automatically be exposed to everyone.

## 2. Current Implementation
Based on the Reality Audit:
- **Implemented**: Basic database tables (`organizations`, `locations`, `departments`, `people`, `employees`, `businessRoles`). Basic CRUD APIs for employees. Initial Next.js pages for listing and profile. Server-side authorization for basic operations.
- **Partial/Conflicting**: Lifecycle status transitions lack full enforcement. Activation currently requires `applicationFormUrl` which conflicts with approved requirements. Direct edits immediately overwrite master records instead of using the approval workflow.
- **Missing**: Family/Emergency contacts, secondary mobile, gender, residential address, blood group, marital status, children, parents. Comprehensive, non-opaque history tracking. Salary/Payment info. Direct employee-to-employee reporting relationships (preventing cycles). End-to-end Approval Workflow.

## 3. Important Corrections to Enforce
- **Documents**: Aadhaar Card + Photo ONLY are mandatory. Other 1, Other 2, Other 3 are optional. PAN is NOT a People field. Application Form is NOT mandatory.
- **Activation**: HR / Manager / Owner may activate an employee. Owner approval is NOT required for normal activation.
- **Reporting Person**: Must be a direct employee-to-employee relationship. Must prevent self-reference and reporting cycles.
- **Employee ID format**: Exactly `KAL-EMP-0001` and never reused.
- **Categories**: Permanent / Temporary / Part-time.
- **Statuses**: `DRAFT` / `ACTIVE` / `INACTIVE` / `EXITED`.
- **Role Assignments**: Direct add/remove with audit. No Owner approval required.
- **Branch Assignments**: Initial assignment is onboarding. Transfers need Owner approval.
- **Salary/Payroll Boundary**: Salary calculation belongs to Payroll. People module stores agreed salary/payment information needed by Payroll. Changes need Owner approval.
- **History**: Preserve effective-dated history using queryable models, not just opaque JSON snapshots.
- **Contact Visibility**: Respect role/branch visibility; protect personal mobile numbers.
- **Authorization**: HR/Manager propose master/branch/salary changes; Owner approves or directly edits. Server-side authorization is mandatory. Organization and branch isolation must be preserved.

## 4. Required Database Changes
- **`employees` table**: Add `category` (Permanent/Temporary/Part-time), `reportingEmployeeId` (self-referencing FK), `secondaryMobile`, `gender`, `residentialAddress`, `bloodGroup`, `maritalStatus`. Adjust ID generation sequence.
- **`employee_family_contacts`**: New table for family and emergency details. The database design may use one typed table, but category-specific validation must preserve these exact requirements:
  - **Spouse**: Name (required when Marital Status = Married), Mobile (required when Marital Status = Married). No DOB required.
  - **Children**: Multiple allowed. Name only. No DOB requirement.
  - **Parents**: Father Name (required), Mother Name (required). No additional DOB requirement.
  - **Emergency Contacts**: At least one required, multiple allowed. Name, Relationship, Mobile.
- **`employee_salary_info`**: New table for Salary Type, Amount, Effective From, Payment Method, Payment Details.
- **`employee_history_*`**: New normalized tables (e.g., `employee_salary_history`, `employee_branch_history`) tracking effective-dated changes for role, branch, salary, reporting person, category, status.
- **`employee_change_requests`**: New table to handle HR/Manager proposed master, salary, and branch changes awaiting Owner approval. Uses a structured JSONB payload (validated server-side via Zod) strictly to record the proposed change for audit/review, while normalized history tables remain the permanent business history upon approval.

## 5. Required APIs/Services
- **Employee Lifecycle Service**: Enforce status transitions, validate mandatory fields/documents/declarations upon activation.
- **Approval Workflow Service**: Propose changes (store as JSONB snapshot in `employee_change_requests`), list pending changes, approve/reject changes. The approval operation must be transactional, applying the JSONB payload through the appropriate business service to update the master record and the normalized history tables.
- **History Service**: Fetch normalized historical timelines for an employee.
- **Hierarchy Service**: Build and return the employee-to-employee reporting tree. Enforce cycle and self-reference prevention during assignment.
- **Contact Directory Service**: Fetch contacts respecting branch/role visibility and redacting personal numbers where required.
  - **Employee**: contacts permitted within the employee's authorized branch scope.
  - **Supervisor/Manager/HR**: contacts permitted within their authorized branch scope.
  - **Owner**: organization-wide visibility.

## 6. Required UI/Screens
- **Employee Form**: Update to capture all new missing fields. Conditional sections for family/spouse based on marital status.
- **Approval Queue**: UI for Owners to review and approve/reject proposed employee/salary/branch changes.
- **Employee History Timeline**: Visual component in the profile page showing all effective-dated changes.
- **Organization Hierarchy Tree**: Interactive visual tree of reporting structures.
- **Contact Directory**: Searchable list of employee contacts with proper visibility controls.
- **Payment Info Tab**: Secure UI for managing salary/payment details within the profile.

## 7. Authorization Requirements
- **Module Access**: `people:read`, `people:manage`, `people:approve`.
- **Branch Isolation**: Data retrieval must be filtered by the actor's authorized `locationId`(s).
- **Server-Side Enforcement**: All APIs must validate the user's role and location scope before processing. UI visibility is not a security boundary. Contact visibility must be enforced server-side.

## 8. Audit/History Requirements
- All structural changes (role, branch, salary, status) must generate an immutable, queryable record in the respective effective-dated history tables. Do not use opaque JSON as the only historical representation.
- Role assignments require standard audit logging but no approval.
- Approved and rejected change requests remain available as audit evidence.
- Standard audit logging (`audit_events`) must capture who initiated and who approved changes.

## 9. Integration Dependencies
- **Authentication/Session**: Relies on existing foundation.
- **Storage**: Requires existing file/object storage for document/photo uploads.
- **Payroll (Future)**: Will consume the Salary/Payment Info data stored by this module.

## 10. Test Requirements
- **Unit Tests**: ID generation logic, lifecycle validation logic, approval state machine, hierarchy cycle prevention, Zod payload validation for proposed changes.
- **Integration Tests**: Database history creation, transactional approval boundaries, server-side authorization enforcement, visibility controls in contact directory.
- **E2E Tests**: Full lifecycle transition from DRAFT to EXITED, proposing a change -> owner approval -> history verification.

## 11. Implementation Phases in Dependency Order

### Phase 1: Database & Data Model Expansion
- Update `employees`, `people` schemas to include all missing demographic and employment fields.
- Create tables for Family Contacts, Salary Info, and Normalized History tracking.
- Adjust Employee ID generation to exactly `KAL-EMP-0001` format.
- *Verification Gate*: Database migrations run successfully. Unit tests for schema validation pass.

### Phase 2: Core Services & Lifecycle Enforcement
- Update `createEmployee` and `updateEmployee` services to handle new fields.
- Remove `applicationFormUrl` requirement; enforce Aadhaar + Photo for activation.
- Implement explicit lifecycle transition logic (`DRAFT` -> `ACTIVE`, etc.) with onboarding declaration.
- *Verification Gate*: API tests confirm proper validation, cycle prevention on reporting, and correct ID formatting. Activation succeeds for HR/Manager without Owner approval when complete.

### Phase 3: Approval Workflow & History Tracking
- Implement `employee_change_requests` table with JSONB proposed-change snapshot storage, and associated API routes (Propose, Approve, Reject).
- Implement transactional approval service that validates the JSONB payload and delegates to business services to update master records and normalized history.
- *Verification Gate*: Integration tests prove that HR/Manager edits on master/salary/branch create pending requests, Owner approvals transactionally apply to master and create queryable history records, and direct Owner edits apply immediately with history.

### Phase 4: Hierarchy & Salary Information
- Implement Salary/Payment Info CRUD within the approval workflow.
- Implement the Organization Hierarchy tree generation based on `reportingEmployeeId`.
- Implement Contact Directory API with branch/role visibility controls (Employee/Manager vs Owner scope).
- *Verification Gate*: Hierarchy API correctly returns tree without cycles. Salary data is securely stored and effectively dated. Contact directory protects personal numbers and respects scope.

### Phase 5: UI Implementation
- Update Employee List, Profile, and Form screens.
- Build Approval Queue UI.
- Build Organization Hierarchy UI.
- Build Contact Directory UI.
- *Verification Gate*: Manual UI testing with synthetic data. Forms correctly enforce mandatory fields based on state.

## 12. Final End-to-End People Acceptance Scenario
1. **Creation**: HR creates a `DRAFT` employee with initial branch assignment. Employee ID `KAL-EMP-XXXX` is generated.
2. **Onboarding**: HR fills out all demographics, uploads Aadhaar and Photo, adds Bank Details, Salary Info, and assigns initial roles (direct add, audited).
3. **Activation**: HR confirms onboarding declarations and activates the employee. The system verifies Aadhaar and Photo are present. Employee status becomes `ACTIVE`. A historical record of joining is created. The activation makes the employee eligible for the Contact Directory and Organization Hierarchy according to active-status, branch, role, and configured visibility rules.
4. **Modification**: HR/Manager proposes a salary increase and branch transfer. This creates a structured JSONB change request requiring Owner approval.
5. **Approval**: Owner logs in, views the pending branch/salary change request, and approves it. The system transactionally applies the business change.
6. **Verification**: History accurately reflects the salary and branch change with the effective date in queryable relational tables.
7. **Separation**: HR proposes employee exit. Owner approves. Status becomes `EXITED`, and access is immediately revoked.
