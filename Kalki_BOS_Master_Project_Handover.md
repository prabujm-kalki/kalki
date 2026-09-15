# KALKI BOS — MASTER PROJECT HANDOVER

Complete Requirements • Architecture • Business Rules • Security • Engineering Instructions
Antigravity IDE Initialization | v1.0 | 4 September 2026

**Purpose:** provide one durable, comprehensive handover of the Kalki BOS vision and all material requirements/decisions discussed so far, so a new engineering agent can initialize and continue the project without depending on fragmented chat history.

**Authority:** GitHub is the software source of truth. This document is the consolidated requirements/architecture baseline. The agent must inspect the live repository and reconcile it with this document; never blindly overwrite either.

## 1. Absolute Project Principles
- Production-grade, secure, stable, configurable, user-friendly and expandable for 10+ years.
- Quality/correctness is the top priority at every point. Never compromise quality for speed, token/usage limits, cost, or a target completion date. Taking 2–3 months or longer is acceptable.
- Configuration over hard-coded business rules.
- Organization/branch isolation everywhere.
- Historical truth must be preserved; no silent overwrite of financial, sales, inventory, employee, task or audit facts.
- Owner sees exceptions, decisions, risks and opportunities rather than rechecking routine work.
- Inspect before changing. Never blindly recreate/copy/overwrite.
- Bounded method: implement → verify against architecture/requirements/dependencies/security/data integrity → correct → verify again → commit.
- Continue automatically through safe deterministic steps; do not stop after every tiny step asking permission.
- Stop only at a genuine blocker, missing access, clarification, or real business/technical decision.
- Never mark a gate passed without actual execution evidence.
- No silent stack downgrade/substitution.
- No secrets, real Aadhaar, real customer or production data in Git.
- Do not invent third-party API endpoints, fields, authentication or capabilities.

## 2. Business Context and Pilot
- Kalki Family Restaurant — Avalpoondurai.
- Kalki Department Store — Avalpoondurai.
- Kalki Multicuisine Restaurant — Anakalpalayam; location spelling should be configurable/canonicalized rather than hard-coded.
- Future businesses/branches must be supported.
- Pilot branch: Anakul Palayam; pilot start 1 September 2026.
- Synthetic employee: TEST-001 — Kalki Test Employee; role Pilot Operations User.
- Live TMBill OFF; synthetic/manual sales only; no real customer data.
- POS/billing is future scope; reserve interfaces and offline-capable sync architecture.

## 3. Frozen Technology / Architecture
- Modular monolith: one controlled application/database with clean module boundaries.
- Next.js 16.3.3; React 19.2.7; TypeScript.
- Node.js 24 LTS.
- PostgreSQL 17.11.
- Drizzle ORM + Drizzle Kit.
- Zod.
- Better Auth authentication foundation + Kalki authorization layer.
- Vitest + Playwright.
- Docker/WSL-compatible PostgreSQL for local development.
- Provider-neutral object storage abstraction for files/evidence.
- Provider-neutral AI adapter and notification/messaging adapters.
- Next.js provides web + API boundary at pilot; no separate backend service unless deliberately approved.
- External systems enter through a central Integration Gateway; providers must not leak into core domain models.

## 4. Core Foundation / Organization / People
- Organization → branch/location → person/employee → user account → role → permissions.
- Employee/person and user account are separate.
- Employee history, performance, training/skills, attendance/HR data must be supportable.
- Roles contain purpose/responsibilities/actual work, KPIs and role-level checklist.
- Role baseline can be configured at individual employee level while preserving standard baseline.
- Role/user/employee assignments can be branch-scoped.
- Delegation/authority configurable; never hard-code one person.
- Owner approval where required; segregation of duties for sensitive/consequential operations.
- Deny-by-default; authorization enforced server-side on every protected read/write.

## 5. Employee Lifecycle / Onboarding / Documents / Access
- Reusable employee lifecycle/checklist framework; onboarding is configurable, not hard-coded.
- Aadhaar attachment is mandatory before employee can move from draft/onboarding to complete/active.
- Document metadata: type, employee, upload timestamp, uploader, verification status/date/by, version/history, private storage reference.
- Aadhaar and other sensitive documents require restricted access, controlled replacement/deletion and audit; minimize full-number display/storage.
- Future configurable docs: photo, PAN, bank proof, certificates, etc.
- Role-specific checks: e.g. Captain must have required documents, branch/role, mobile/order-app account provisioned, secure credential issuance/reset status, required configuration, training, manager confirmation.
- Never store/display an ordering-app password as ordinary employee data; record provisioning/credential status.
- Post-onboarding checks can be Day 1/Day 7/Day 30 or other configurable windows; examples include login test, app access, training, manager review, KPI review.
- Lifecycle checks can be mandatory/optional, evidence-required, verification-required, employee-visible or management-only.

## 6. Salary Hold / Payroll Policy
- Salary-hold policies such as 3 days or 4 days are configurable by applicable employee/group/category and effective period.
- Maintain applied policy and history in employee/payroll/accounting records.
- Employee view should show applicable hold and current held/remaining/released status, subject to visibility.
- Policy changes/overrides require authorization and audit.
- Historical payroll facts are preserved; corrections use controlled events/reversals.

## 7. Training / KPI / Activities / Points
- Training assignments are time-bounded: assigned date, due date/window, status, completion and verification where required.
- Overdue training can create reminders/escalation through the task engine.
- Role training baseline can be individually configured.
- KPI consists of measurable activities/metrics; do not rely on one opaque score.
- Track target, activity/metric, weight, points/rating, evidence, period, evaluator, verification and history.
- Points are configurable; activities under KPIs can award points by configured rules.
- Training may contribute to performance only by configured rules.
- Historical performance must be reproducible from underlying activities and versioned scoring rules.

## 8. Work / Situation / Task / Reminder / Escalation Engine
- Unified engine for routine and event-based work/reminders.
- Routine: daily, weekly, Monday-only/selected weekdays, recurring intervals and other configurable schedules.
- Event-based: business events create tasks.
- Item/order trigger example: catering order contains idli → create rice/dal soaking/preparation task.
- Priority: Low, Medium, High; Critical supported where required.
- SEEN ≠ ACKNOWLEDGED ≠ COMPLETED ≠ VERIFIED.
- High/Critical tasks may require independent verification. Employee marking completed is not automatically verification.
- Example: task due 9/10 → employee completes → after configured 30/60-minute delay next-level verifier receives notification → VERIFIED or EXCEPTION/VERIFICATION FAILED → escalation.
- Reminder sequence configurable: due → reminder → strong reminder → final reminder → escalation.
- Alarm-like/high-priority mobile notification desired within OS limits; never assume DND/silent bypass.
- Task generation and notification delivery must be idempotent.

## 9. Mandatory Task Fields / Evidence
- Task templates can require text, number, yes/no, photo, multiple photos, document, signature/approval, checklist, location and future requirement types.
- Example: manager 'Inspect drainage area' requires photo upload.
- Mandatory requirements block valid completion.
- Evidence is linked to task instance/requirement with uploader/time/audit trail.
- High/Critical work can require employee evidence plus independent verification.

## 10. Purchasing / Vendor Master
- Vendor: contact details, payment terms, credit days, item mappings, order frequency/day, normal quantities, minimum stock/buffer, lead time.
- Vendor-item: vendor item name/code, item, unit, normal quantity, last rate/history, active/preferred status, frequency and other useful configuration.
- Historical actual purchase rates are facts; defaults/suggestions never silently overwrite actuals.
- Purchase flow: requirement → request → approval → PO → receipt → discrepancy → invoice/bill → payable → payment → reconciliation.
- Support partial receipts, three-way match, emergency purchases, rate controls, vendor ledger, partial/multi-bill payment allocation.

## 11. Vendor Predefined Items + Scheduled Purchasing
Critical operational requirement: when a particular vendor is selected, ALL predefined items configured for that vendor automatically load. Example: Briny Chicken supplies 10 regular items; selecting Briny Chicken loads all 10 without retyping/searching.
- User enters only today's required quantities/rates/fields.
- Unused catalogue items remain unselected/zero and are not included in PO/bill.
- Same catalogue supports PO generation and quick purchase/bill generation.
- Optional 'Load usual quantities' provides editable suggestions, not automatic purchases.
- Vendor catalogue is separate from purchase schedule.
- Purchase schedule specifies vendor, predefined catalogue/item set, frequency/date rule, responsible person/role, reminder time and escalation.
- On scheduled date/time a task is generated for the responsible person; selecting vendor loads all predefined items.
- If incomplete by configured deadline/end-of-day, reminders/escalation occur.
- Uses the common Work/Task engine.

## 12. Inventory
- Event/ledger-based inventory balance model.
- Movements: opening, receipt, consumption, waste, transfer out/in, adjustment.
- Stock count: expected → physical → variance → review → adjustment.
- Inter-restaurant/branch transfer and borrowing.
- Prepared/semi-finished inventory and recipe/production linkage.
- Negative-stock policy configurable.
- Adjustments require reason and authority.
- Concurrency/idempotency on stock-changing operations.
- PO/receipts flow into stock quantity records.
- Track frequently purchased items and out-of-stock/availability history to improve purchasing.

## 13. Finance
- Expenses, supplier invoices, payables, payments, allocations and reconciliations.
- Three-way match PO + receipt + invoice.
- Full/partial payments; prevent over-allocation/overpayment; detect duplicates.
- Historical financial facts are append-only/controlled-event based; corrections via reversal rather than silent overwrite.
- Vendor ledger and payment history.
- Finance integration with asset/maintenance costs.

## 14. Assets / Maintenance
- Assets, locations, statuses and status history.
- Maintenance plans and records.
- Costs linked to finance.
- Asset failure → Situation → Work → repair/purchase → evidence → verification → asset history.
- Retired assets remain historically queryable.

## 15. Sales / TMBill / Future POS
- Integration flow: receive → batch → validate → normalize → map → deduplicate → persist source traceability → reconcile → business processing.
- TMBill API intended when actual current capability is verified.
- Manual Excel/CSV daily report upload is mandatory fallback; API/manual paths converge before business processing.
- Never invent TMBill API endpoints/auth/fields.
- Dedupe: source_system + source_bill_id; fallback controlled fingerprint with collision review.
- Reconciliation: source count vs accepted; source total vs Kalki total; duplicates; rejected; missing period; line mismatch where available.
- Customer name/mobile (where available/permitted), total value, repeat customers, inactive customers, customer-item history, segmentation.
- Separate sales and CRM reporting.
- Product-wise and captain/waiter-wise reporting for incentives where source data supports it.
- Do not assume TMBill 'User' and 'Waiter' semantics; verify actual meaning.
- Future POS must not be foundation; reserve normalized order/sales interface and offline-capable sync.

### 15.1 Observed TMBill report menu
Previously observed: Sales Report; DSR Bill Wise; DSR Item Wise; Today's report; Item report; Meal Time report; Hourly report; Waiter Incentive Report; Payment report; Expense Tracking; Order Type; Category; Kitchen Department; Coupon History; Due Payment; Start/Close Day; Shift Wise; Discount; Biller Wise Summary; Delivery; Day Wise Summary. This is an observation, not proof that every report/API is programmatically available.

## 16. Swiggy / Zomato / Third-Party Online Ordering
Treat this as a serious first-class future capability. Provider-neutral design is mandatory.
- Online Order Gateway/adapters behind Integration Gateway.
- Swiggy, Zomato and future apps are channels; Kalki owns normalized order model.
- Order ingestion/status updates where actual partner APIs permit.
- Item/menu mapping, modifiers/add-ons, taxes/charges/discounts, payment mode, order time.
- Kitchen preparation, dispatch/delivery status where available.
- Cancellations/refunds.
- Platform commission/settlement reconciliation.
- Duplicate/missing/failed-event detection, retry and manual review.
- Integration health/freshness monitoring.
- Menu availability synchronization only where actually supported.
- Credentials are secret/configuration data, never source code.
- Verify current partner APIs and commercial/account prerequisites before implementation.

## 17. Customer Intelligence / CRM
- Canonical customer identity layer before segmentation.
- customers; customer_source_identities; customer_identity_reviews; customer_merge_events.
- Source identity maps to at most one active canonical customer.
- Multiple source identities only when proven same.
- Ambiguous matches go to human review; never silent merge.
- Merges authorized/audited; source identifiers remain traceable; source sales bills not rewritten.
- Organization/branch scope enforced.
- Visit/value history derives only from accepted/reconciled sales.
- Segments: repeat, regular, previously regular/currently inactive, high-value, observed vegetarian dining pattern based on transaction behavior.
- Do not infer sensitive personal attributes.
- Version segment rules with period/scope for reproducibility.
- Opportunity: segment → evidence → opportunity → draft → review/approval → optional execution.

## 18. Owner Command Center
- Inputs: sales, purchasing/inventory, finance/assets, Work/Situations, customer intelligence, data freshness/quality.
- Daily brief: what changed, what needs attention, what needs decision, what opportunity exists.
- Insights evidence-backed with period, scope, freshness; distinguish fact/calculation/inference.
- Decision lifecycle: detected → review → decide → execute/delegate → verify → closed.
- Opportunity lifecycle: identified → review → approved → prepared → executed → measured/closed.

## 19. AI Architecture / Safety
- Provider-neutral AI adapter.
- Flow: auth → authorization → context scope → retrieval → controlled AI context.
- No unrestricted DB access.
- Tool allowlist; server-side authorization.
- AI cannot self-grant permissions or directly write DB.
- Consequential actions use normal business services with authorization and required confirmation.
- Audit material AI-assisted actions/recommendations.
- Prompt/context versioning; evaluation/regression suite; cost/quota controls.
- Provider/model, credentials, privacy/data processing, residency, retention/logging and production cost limits are explicit external decisions.

## 20. Contact Directory
- One central page/directory.
- Broad read-only access subject to per-contact/per-method visibility policy.
- Visibility configurable by role, branch, department, group/custom scope; 'everyone' can be an option.
- Normal users read-only; management edit/retire separately authorized.
- Categories: employees, managers, vendors, maintenance/service, emergency/business and future types.
- Contact methods can have independent visibility.
- Mobile phone provides direct device Call action.
- Do not automatically expose every employee's personal mobile number.
- Audit creation, changes, visibility changes and retirement.

## 21. Notifications
- Provider-neutral in-app and future email/SMS/WhatsApp/push.
- Priority/urgency and delivery/seen/acknowledged states where supported.
- Reminder timing belongs to Task Engine; channels deliver.
- OS constraints respected.
- Idempotency prevents duplicate notifications.

## 22. Database Format / Schema Blueprint
PostgreSQL relational schema. Stable IDs (UUID/equivalent), timezone-aware timestamps, explicit FKs, unique/check constraints, useful indexes, organization/branch scope, transactions. Avoid polymorphic FKs where explicit relationships are possible.
- Core: organizations, locations/branches, persons, employees, employee_status_history, users.
- Access: roles, permissions, role_permissions, user_role_assignments, employee_role_assignments, delegation/authority.
- Governance: audit_events, configurations/policy_versions.
- People docs: employee_document_requirements, employee_documents, document_versions/verification_history, employee_lifecycle_requirements/instances.
- Training/performance: training_definitions, training_assignments, kpi_definitions, kpi_activities/metrics, employee_kpi_assignments, performance_events/points.
- Tasks: work_definitions, situation_definitions, work_triggers, task_templates, task_requirements, task_instances, task_evidence, task_verifications, reminder/escalation stages, notification events/deliveries, idempotency.
- Purchasing: vendors, vendor_contacts/contact_methods, vendor_items, purchase_schedules, purchase_requests, purchase_orders/lines, receipts/lines, supplier_invoices/lines, payables, payments, payment_allocations.
- Inventory: items, inventory_ledger, stock_counts/lines, inventory_transfers, recipes/production definitions, production/prepared inventory.
- Assets: assets, asset_status_history, maintenance_plans, maintenance_records.
- Sales/integration: sales_import_batches, sales_source_records/raw traceability, sales_transactions/bills, sales_lines, sales_reconciliation_results, integration_sources, integration_connections metadata, integration_events, integration_errors.
- CRM: customers, customer_source_identities, customer_identity_reviews, customer_merge_events, customer_segments, segment_memberships, customer_opportunities.
- Online ordering: orders, order_lines, order_status_events.
- Directory: contact_directory, contact_methods.
- Command/AI: decisions, opportunities, AI prompt/context versions, evaluation records.

## 23. Database Integrity Rules
- Organization/branch isolation enforced at service/query level and appropriate database constraints/policies.
- Source-event and identity dedupe constraints.
- Inventory balances derived from controlled ledger.
- Negative stock only by explicit policy.
- Payment allocation cannot exceed allowed amount.
- Mandatory task requirements block completion.
- Verification separate from completion when required.
- Historical records immutable or corrected by explicit reversal/versioned event.
- Document version/history retained.
- Retired entities remain historically queryable.

## 24. Security
- Better Auth authentication + Kalki authorization.
- Deny-by-default; server-side authorization for every protected read/write.
- Secure sessions/cookies/tokens; CSRF protection as applicable; rate limiting/brute-force controls.
- Least privilege and segregation of duties.
- Aadhaar is highly sensitive: restricted access, minimum display, no real data in dev/test.
- Private object storage for documents/evidence; controlled file access.
- Passwords never stored as ordinary employee records.
- No API keys, private keys, provider credentials or secrets in Git.
- Schema validation, safe ORM/parameterized queries, safe output.
- Upload size/type/content validation, safe object keys, malware scanning where available.
- Cross-organization/branch leakage tests.
- Transactions, idempotency and concurrency controls.
- Audit sensitive-document access and security configuration.
- Backup/restore and disaster recovery must be documented and tested.

## 25. API / Integration Contracts
- Internal APIs expose business capabilities, not raw tables.
- External adapters behind Integration Gateway.
- Inbound events include source, source event ID, received time, source payload/reference/hash as appropriate, processing state, retry/error metadata.
- Retries are safe/idempotent; dead-letter/manual review supported.
- Integration freshness/reconciliation visible.
- Manual fallback required where specified, especially TMBill.

## 26. Reporting / Analytics
- Separate operational Sales and CRM reports.
- Purchasing/vendor: item, frequency, rate, quantity, availability/out-of-stock.
- Inventory: movement, stock variance, waste, transfers, adjustments.
- Finance: payables, payments, allocations, reconciliation, exceptions.
- Employee: onboarding, training timeliness, KPI/activity/points, task completion/verification, exceptions.
- Task: due, overdue, completed, verified, failed, escalated.
- Owner: exceptions, trends, decisions, opportunities, freshness/quality.
- Every analytical result states period, scope and freshness.

## 27. Audit / Historical Truth / Data Governance
- Audit actor, action, entity, timestamp, org/branch, before/after or event details, source/correlation/idempotency IDs where appropriate.
- Financial, sales, inventory, employee-document and authorization history reconstructable.
- Corrections explicit, authorized and traceable.
- External source IDs/traceability retained according to policy.
- Configuration/policy changes versioned when they affect reproducibility.
- Retention/deletion must respect legal/business requirements.

## 28. UX / Operational Efficiency
- Mobile-first practicality for operational work.
- Minimize repeated typing/search.
- Vendor selection loads predefined items automatically.
- Central Contact Directory is one-page searchable.
- Clear pending/overdue/blocked/verification states.
- Employees see relevant own status such as salary hold and pending lifecycle checks; management-only data remains hidden.
- High-priority notifications should be strong within OS constraints.
- Consequential actions require appropriate confirmation/authorization.

## 29. Testing / Quality Gates
- Unit tests for business/domain rules.
- Integration tests for DB/repositories/adapters.
- Playwright E2E for critical workflows.
- Authorization/isolation/security/sensitive-file tests.
- Migration, constraints, transactions, idempotency, concurrency and historical correction tests.
- AI evaluation/regression suite.
- CI: typecheck, tests, build and applicable migration/integrity checks.
- Gate status based on actual execution evidence.

## 30. Stage Plan / Current Position
- Stage 1 Repository Foundation — established.
- Stage 2 Technology Foundation — established.
- Stage 3 Executable Development Environment — last known current gate: Node 24 + PostgreSQL 17; install/lockfile; typecheck; tests; build; DB connection; Drizzle migration; integrity verification.
- Stage 4 Core Foundation.
- Stage 5 Database Execution Gate.
- Stage 6 Authentication/Authorization.
- Stage 7 Employee/People/Documents.
- Stage 8 Work/Situations/Task Engine.
- Stage 9 Purchasing/Inventory.
- Stage 10 Finance.
- Stage 11 Sales/TMBill.
- Stage 12 Customer Intelligence.
- Stage 13 Assets/Maintenance.
- Stage 14 Owner Command Center.
- Stage 15 AI.
- Continuous cross-stage verification.

## 31. Last Known GitHub State
- GitHub user: prabujm-kalki; private repository: kalki; default branch main.
- Canonical engineering branch: foundation.
- Foundation had been reconciled from Stage 1–15 artifacts rather than blindly copying ZIPs.
- Known foundation files included env/config, Next.js app shell, health endpoint, DB boundary/schema placeholder, env validation and architecture/operations/security/stage documentation.
- At last known check foundation was clean and 17 commits ahead of main; no merge.
- Stage 3 was intentionally NOT marked passed because connected environment was Node 22.16.0 instead of required Node 24 and PostgreSQL was unavailable.
- Earlier stage package correction: user_role_assignments.location_id must be non-null when part of composite primary key; Stage 5 corrected this.
- Some earlier package dependency declarations used 'latest'; true reproducibility requires a lockfile from the agreed environment.
- Antigravity must inspect the live repository; this document does not override newer verified repository state.

## 32. Previous Architecture / Build Work to Preserve
- Stage 2–15 technical build packs and the configured pilot pack.
- Pilot execution pack.
- Final architecture audit Steps 339–343 and Steps 344–348.
- 10–20 Minute Workflow Overview.
- Time-Critical Task Engine Architecture Amendment.
- Stage 7 Employee/People/Documents requirements.
- Stage 8 Work/Situations/Task Engine requirements.
- Stage 9 Purchasing/Inventory requirements.
- Stage 10 Finance requirements.
- Stages 11–15 continuous integration requirements.

## 33. Backup / Recovery / Continuity
- Backup and recovery are foundation responsibilities.
- Recovery procedures documented and tested.
- DR/continuity for operationally critical data.
- Transient integration failure handled with retry/idempotency and manual fallback where designed.
- TMBill manual Excel/CSV fallback is mandatory.

## 34. Explicit Non-Decisions / External Gates
- Cloud hosting provider not locked.
- Object storage vendor not locked.
- AI provider/model not locked.
- Email/SMS/WhatsApp/push provider not locked.
- Production data residency/retention configuration not locked.
- Production secret-management provider not locked.
- Exact TMBill endpoints/auth/fields not locked until verified.
- Swiggy/Zomato exact partner operations/commercial prerequisites not assumed.
- Native Kalki POS details not locked.
- Any unverified provider capability is UNKNOWN until documented/verified.

## 35. Key End-to-End Workflows
### 35.1 Vendor quick purchase
Select vendor → all predefined vendor items load → enter today's quantities/rates → unused items excluded → validate → generate bill.
### 35.2 Scheduled vendor purchase
Schedule triggers → responsible person notified → vendor selected → predefined items load → quantities entered → PO → incomplete at deadline → reminder/escalation.
### 35.3 Catering item trigger
Catering order → idli detected → preparation task → assigned employee → evidence → verification if required → escalation on failure.
### 35.4 Employee onboarding
Employee → documents/Aadhaar → branch/role → access provisioning status → training → manager confirmation → activation.
### 35.5 Drainage inspection
Task → reminder → inspection → mandatory photo → completion → independent verification for high/critical → verified or exception/escalation.
### 35.6 Contact lookup
Directory → search → visibility filter → permitted phone → Call.
### 35.7 Customer intelligence
Accepted/reconciled sales → source identity → canonical/review → history → versioned segment → evidence-backed opportunity → review/approval → optional execution.

## 36. Configurability — Cross-Cutting Requirement
- Organization/branch applicability; roles/permissions; delegation/authority.
- Employee lifecycle, onboarding, documents and access checks.
- Salary-hold policies.
- Training deadlines and requirements.
- KPI definitions, activities, weights, points.
- Task templates, mandatory evidence and verification.
- Routine schedules, event/item triggers, reminders/escalation, priority.
- Vendor catalogues, purchase schedules, suggested quantities.
- Inventory negative-stock and adjustment policy.
- Finance approval/tolerance rules.
- Contact visibility.
- Notification channels.
- Customer segment rules.
- AI tool permissions and quotas.

## 37. Consequential Action Policy
- AI/automation/UI cannot bypass business authorization.
- Employee activation, sensitive document access, customer merges, inventory adjustments, PO approvals, payments and other consequential actions require configured authority.
- Independent verification remains distinct from employee completion.
- Required confirmation is recorded.

## 38. Definition of Done — Every Feature
- Correct architectural layer and module boundary.
- Configuration/future extensibility considered.
- Org/branch authorization verified.
- Input validation and safe errors.
- DB migration/constraints verified.
- Idempotency/concurrency verified where applicable.
- Auditability verified.
- Sensitive-data handling verified.
- Appropriate unit/integration/E2E tests.
- Agreed environment typecheck/tests/build pass.
- No secrets/real sensitive data committed.
- Documentation updated.
- Clean working tree; bounded commit.

## 39. Production Readiness
- All required gates passed with evidence.
- Security and authorization review complete.
- Backup/restore tested.
- Critical workflows E2E tested.
- Observability/error handling in place.
- Data migration/reconciliation procedures verified.
- External integrations based on real documented capabilities.
- Operational runbooks available.
- Failure/retry/manual fallback tested.
- AI safety boundaries tested if enabled.
- Pilot acceptance met before production rollout.

## 40. Antigravity Initialization Command
You are taking over Kalki BOS, a long-term production-grade Business Operating System. Read this MASTER HANDOVER fully and inspect the actual GitHub repository before making changes. The repository is the software source of truth. Do not blindly recreate, copy or overwrite previous work.

Preserve the frozen stack: modular monolith; Next.js 16.3.3; React 19.2.7; TypeScript; Node 24 LTS; PostgreSQL 17.11; Drizzle ORM/Kit; Zod; Better Auth plus Kalki authorization; Vitest; Playwright.

Quality/correctness is the absolute priority. For every bounded step: inspect → implement → verify against requirements, architecture, security, authorization, data integrity, idempotency, auditability and maintainability → correct → verify again → commit. Continue automatically through safe deterministic work. Stop only at a genuine blocker, missing access, or a real business/technical decision. Never mark a gate passed without execution evidence. Never downgrade/substitute the stack. Never invent external API capabilities. Never commit secrets or real sensitive/production data.

Start at the earliest unverified stage in the actual repository. Last known position was Stage 3 environment verification: Node 24 + PostgreSQL 17, dependency installation/lockfile, typecheck, tests, build, DB connection, Drizzle migration and integrity verification. Do not jump ahead merely because later requirements are documented.

Treat all requirements in this document as the consolidated baseline: employee lifecycle/Aadhaar, salary holds, training/KPIs/points, unified Work/Situation/Task engine, mandatory evidence and independent verification, vendor predefined-item catalogue and scheduled purchasing, purchasing/inventory/finance/assets, TMBill API plus mandatory manual fallback, Swiggy/Zomato provider-neutral ordering, customer intelligence, Contact Directory, Owner Command Center, AI safety, and all security/data-integrity rules.

When a requirement is ambiguous, do not invent a risky assumption. Use the safest configurable boundary and record the decision; stop only if a real business decision is required. Keep the repository documentation synchronized with significant requirements/architecture changes.

## 41. Final Handover Checklist
- Read the complete document before implementation.
- Inspect live repository/branch/commit state.
- Verify actual Node/PostgreSQL environment.
- Determine actual Stage 3 status.
- Confirm no secrets/sensitive data in repository.
- Confirm architecture/stack matches frozen baseline.
- Confirm org/branch authorization.
- Confirm migrations/tests/build gates are evidence-based.
- Keep requirements and repository documentation synchronized.
- Never sacrifice quality for speed.

END — KALKI BOS MASTER HANDOVER v1.0
