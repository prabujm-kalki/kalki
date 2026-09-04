# Kalki BOS — Production Master Roadmap
**Document status:** Controlled planning baseline  
**Purpose:** Single production roadmap governing step-by-step creation of Kalki BOS V1  
**Rule:** No item is considered complete until its Quality Gate is passed.  
**Scope:** Full V1 platform, from current foundation through production readiness.

---

## 1. How this roadmap is controlled

This document is the **HOW** layer of Kalki BOS.

- **Master Blueprint = WHAT must exist**
- **Production Roadmap = HOW and in what dependency order it is created**
- **Execution Checklist = the bounded implementation steps inside each roadmap item**

The roadmap is subordinate to approved architecture, business contracts, security decisions, and the Decision Register. Development must not silently redefine the roadmap.

### Status vocabulary

| Status | Meaning |
|---|---|
| ⚪ Not Designed | Business/technical design not approved |
| 🔵 Planned | Included in roadmap, design work pending |
| 🟣 Architected | Design/contract approved |
| 🟠 Foundation | Shared technical foundation implemented |
| 🟡 In Progress | Implementation underway |
| 🟢 Implemented | Code exists, verification incomplete |
| ✅ Verified | All required gates passed |
| ⭐ Production Ready | Verified and operationally ready |

**Only ✅ Verified counts as complete during development.**

---

# 2. Current-state baseline — 2026-09-03

The `foundation` branch is the controlled V1 implementation baseline. The repository already contains the TypeScript/Next.js/PostgreSQL/Drizzle foundation, Better Auth foundation, organization/location/people/account structures, and the Stage 8 persistence model. fileciteturn26file0L2-L2

The repository's approved structure is a modular monolith with controlled domain boundaries; business rules belong in domain/application services rather than UI-only code. fileciteturn23file0L2-L2

### Current implementation map

| Area | Current state | Roadmap interpretation |
|---|---|---|
| Repository / architecture foundation | 🟠 Foundation implemented | Preserve; do not redesign casually |
| Technology foundation | 🟠 Foundation implemented | Preserve pinned stack |
| Executable environment | 🟡 Gate/verification dependent | Complete environment gate |
| Organization / locations | 🟢 Schema foundation exists | Verify services, authorization and UI |
| People / employees | 🟢 Schema foundation exists | Complete domain behavior |
| Better Auth | 🟢 Foundation exists | Complete executable auth verification |
| Organization membership | 🟢 Implemented foundation | Complete authorization |
| Authorization roles/permissions | 🟢 Schema foundation exists | Build server-side policy engine |
| OWNER authority | 🟢 Data boundary exists | Complete governed authority implementation |
| Business roles | 🟢 Stage 8 persistence exists | Complete role/responsibility services |
| KPIs / checklists | 🟢 Definitions persisted | Defer formulas until explicitly approved |
| Employee-specific additions | 🟢 Persisted | Complete effective-role behavior |
| Work/Situation definitions | 🟢 Persisted | Build execution engine |
| Work instances | 🟢 Persisted | Verify state machine and instance isolation |
| Evidence requirements | 🟢 Definition persistence | Build evidence subsystem |
| Verification | 🔵/🟢 design boundary | Build separately from completion |
| Reminders / escalations | 🟢 configuration persistence | Build scheduler/delivery later |
| Audit | 🔵 Architected | Build cross-domain governance layer |
| Performance | 🔵 Planned | Depends on Work/KPI/Audit |
| Procurement | 🔵 Planned | Depends on products/suppliers/approval |
| Inventory | 🔵 Planned | Depends on products/purchase and event engine |
| Sales / billing | 🔵 Planned | Depends on products/customer/inventory/finance |
| Finance | 🔵 Planned | Depends on transaction sources and accounting rules |
| Customer / CRM | 🔵 Planned | Depends on identity/customer transaction boundaries |
| Assets / maintenance | 🔵 Planned | Depends on organization/inventory/finance/work |
| Quality / compliance | 🔵 Planned | Depends on work/evidence/audit |
| Notifications | 🔵 Planned | Depends on Work/approval/events |
| Approval / authority workflows | 🔵 Planned | Depends on authorization + domain transactions |
| Dashboard / Owner Command Center | 🔵 Planned | Last-mile aggregation layer |
| Reports / analytics | 🔵 Planned | Depends on stable domain facts |
| Integrations / Integration Gateway | 🔵 Planned | External boundaries only after internal contracts |
| AI | 🔵 Planned | Last major layer; authorization/evidence-bound |
| Production readiness | 🔵 Planned | Final system-wide gate |

### Important reconciliation note

The repository's Stage Gate register still describes several later stages as design/code boundaries and says transactional/authorization verification is pending. fileciteturn21file0L2-L2

Therefore the roadmap treats **implementation existence and verification status as separate facts**. The Stage Gate register must be reconciled with the actual implementation before declaring any stage verified.

---

# 3. Non-negotiable system invariants

These rules apply to every roadmap item.

1. Organization scope is enforced server-side.
2. Location scope is enforced server-side where applicable.
3. Authentication is separate from authorization.
4. Person, Employee, User Account, Business Role, Permission and Authorization Role remain separate concepts.
5. Business roles never grant application permissions by themselves.
6. OWNER authority still passes through authorization, domain rules, transaction/approval rules, audit and database safeguards.
7. Historical financial facts are immutable or corrected through controlled accounting mechanisms.
8. Inventory is event-based and idempotent.
9. External integrations pass through the Integration Gateway.
10. Work definitions and work instances are separate.
11. Work state transitions are explicit domain operations.
12. `SEEN → ACKNOWLEDGED → COMPLETED → VERIFIED` remains distinct.
13. Mandatory evidence blocks valid completion.
14. High/critical work keeps COMPLETED and VERIFIED separate.
15. Employee-specific additions extend the role baseline; they do not replace it.
16. Definition changes must not silently rewrite existing instances.
17. Sensitive employee documents require least privilege and auditability.
18. AI cannot directly write to the database or grant itself permissions.
19. No real Aadhaar/customer production data is committed to the repository.
20. TMBill remains OFF until explicitly gated.
21. No invented external endpoints, fields, credentials, provider behavior or business formulas.
22. No stage advances while its quality gate is red.

The Stage 8 technical design explicitly preserves the role baseline, shared Work/Situations engine, distinct task states, evidence gate, organization/location scope, and definition/instance separation. fileciteturn25file0L2-L2

---

# 4. Universal Quality Gate — applies to EVERY roadmap item

Every bounded implementation step must pass:

### QG-01 Requirements
- [ ] Business requirement is explicit
- [ ] User/actor is identified
- [ ] Scope is bounded
- [ ] Acceptance criteria are written
- [ ] Deferred decisions are not invented

### QG-02 Architecture
- [ ] Correct domain owns the behavior
- [ ] Existing boundaries preserved
- [ ] No duplicate engine introduced
- [ ] Dependency direction remains valid
- [ ] No accidental coupling

### QG-03 Data
- [ ] Entity model correct
- [ ] Organization/location scope correct
- [ ] Foreign keys correct
- [ ] Unique constraints correct
- [ ] Check constraints where practical
- [ ] Indexes support real access paths
- [ ] Historical data behavior defined
- [ ] Migration is reversible/safe where applicable

### QG-04 Security
- [ ] Authentication checked
- [ ] Authorization checked server-side
- [ ] Organization isolation tested
- [ ] Location isolation tested
- [ ] Privilege escalation tested
- [ ] Sensitive data access reviewed
- [ ] Secrets excluded

### QG-05 Domain rules
- [ ] Valid transitions enforced
- [ ] Invalid transitions rejected
- [ ] Business invariants tested
- [ ] Approval requirements enforced
- [ ] Evidence/verification rules enforced where applicable

### QG-06 Transaction integrity
- [ ] Multi-write operations use appropriate transaction boundaries
- [ ] Partial failure behavior defined
- [ ] Concurrency behavior reviewed
- [ ] Idempotency reviewed where applicable
- [ ] Duplicate submission behavior tested

### QG-07 Auditability
- [ ] Actor is known
- [ ] Timestamp is retained
- [ ] Material state changes are traceable
- [ ] Sensitive actions are auditable
- [ ] Financial facts have controlled history

### QG-08 Testing
- [ ] Unit tests
- [ ] Domain/service tests
- [ ] Authorization tests
- [ ] Cross-organization negative tests
- [ ] Cross-location negative tests
- [ ] Integration tests
- [ ] Regression tests
- [ ] E2E test where user workflow is affected

### QG-09 Technical verification
- [ ] Typecheck
- [ ] Lint
- [ ] Build
- [ ] Relevant test suite
- [ ] Migration verification
- [ ] Clean-tree review
- [ ] No secrets/generated junk/unrelated changes

### QG-10 Final reconciliation
- [ ] Matches Master Blueprint
- [ ] Matches Decision Register
- [ ] Matches approved architecture
- [ ] Stage gate updated
- [ ] Roadmap status updated
- [ ] Commit maps to roadmap ID
- [ ] No unresolved critical gap

The repository's required development loop already mandates bounded implementation, verification, security/authorization/data-integrity/idempotency/audit/migration review, defect correction, re-verification, and then commit. fileciteturn22file0L2-L2

---

# 5. Dependency / Build Order

## Dependency graph

```text
FOUNDATION
   ↓
DATABASE / ENVIRONMENT
   ↓
ORGANIZATION + LOCATION
   ↓
IDENTITY + ACCOUNTS
   ↓
MEMBERSHIP + AUTHORIZATION
   ↓
PEOPLE + EMPLOYEE
   ↓
BUSINESS ROLES + RESPONSIBILITIES
   ↓
WORK / SITUATIONS
   ↓
EVIDENCE + VERIFICATION
   ↓
NOTIFICATIONS / ESCALATION
   ↓
AUDIT / GOVERNANCE
   ↓
PERFORMANCE
   ↓
PRODUCT / MENU / SERVICE
   ↓
SUPPLIER
   ↓
APPROVAL / PROCUREMENT
   ↓
INVENTORY
   ↓
CUSTOMER / CRM
   ↓
SALES / BILLING
   ↓
FINANCE / ACCOUNTING
   ↓
QUALITY / COMPLIANCE
   ↓
ASSETS / MAINTENANCE
   ↓
REPORTING / ANALYTICS
   ↓
OWNER COMMAND CENTER
   ↓
INTEGRATION GATEWAY
   ↓
AI
   ↓
PRODUCTION READINESS
```

### Parallelization rule

Modules may be developed in parallel **only after their upstream contracts are verified**. Parallel coding must never create competing concepts or duplicate engines.

---

# 6. Production Roadmap — step-by-step creation sequence

## PHASE 0 — Roadmap Governance

### PR-00.1 Master Blueprint reconciliation
- [ ] Confirm all 22 business modules
- [ ] Confirm cross-system foundation
- [ ] Map every known requirement to a module
- [ ] Identify gaps
- [ ] Identify deferred decisions
- [ ] Create Gap Register
- [ ] Create Decision Register

**Gate:** Blueprint complete and frozen for the current increment.

### PR-00.2 Roadmap control
- [ ] Assign roadmap IDs
- [ ] Map each implementation task to one ID
- [ ] Define dependency owners
- [ ] Define stage exit criteria
- [ ] Establish roadmap/status update rule

**Exit:** Roadmap becomes single development control surface.

---

# PHASE 1 — Technical Foundation

## PR-01.1 Repository and application shell
- [ ] Next.js application boundary
- [ ] TypeScript configuration
- [ ] domain/application folder boundaries
- [ ] API boundary
- [ ] error boundary
- [ ] configuration/environment validation
- [ ] health endpoint

## PR-01.2 PostgreSQL / Drizzle
- [ ] DB connection boundary
- [ ] schema ownership
- [ ] migration workflow
- [ ] migration safety checks
- [ ] transaction helper patterns
- [ ] test database strategy

## PR-01.3 Test infrastructure
- [ ] unit tests
- [ ] integration tests
- [ ] E2E framework
- [ ] test fixtures
- [ ] synthetic data only
- [ ] authorization test helpers

## PR-01.4 Environment gate
- [ ] Node version verified
- [ ] PostgreSQL connectivity verified
- [ ] local environment verified
- [ ] typecheck
- [ ] build
- [ ] health endpoint
- [ ] migration connectivity

**PHASE EXIT:** `ENVIRONMENT VERIFIED`

---

# PHASE 2 — Organization & Business Structure

## PR-02.1 Organization
- [ ] organization master
- [ ] organization lifecycle
- [ ] organization configuration
- [ ] organization-scoped identifiers

## PR-02.2 Location
- [ ] locations
- [ ] location lifecycle
- [ ] organization/location integrity
- [ ] location context

## PR-02.3 Organizational operating structure
- [ ] departments
- [ ] operational areas
- [ ] configuration ownership
- [ ] future extensibility

## PR-02.4 Scope service
- [ ] server-side organization context
- [ ] server-side location context
- [ ] cross-org rejection
- [ ] cross-location rejection

**PHASE EXIT:** organization isolation proven by negative tests.

---

# PHASE 3 — Identity, Accounts & Access

## PR-03.1 Authentication
- [ ] Better Auth configuration
- [ ] email/password
- [ ] session lifecycle
- [ ] logout
- [ ] session expiry
- [ ] origin configuration
- [ ] auth error handling

## PR-03.2 Account model
- [ ] user account
- [ ] account lifecycle
- [ ] membership
- [ ] multi-organization login
- [ ] account-to-person separation

## PR-03.3 Authorization engine
- [ ] permissions
- [ ] application roles
- [ ] organization role assignment
- [ ] location role assignment
- [ ] server-side policy evaluation
- [ ] deny-by-default behavior

## PR-03.4 OWNER authority
- [ ] single OWNER authority model
- [ ] no database bypass
- [ ] authorization enforcement
- [ ] approval/transaction controls
- [ ] audit trail
- [ ] negative privilege tests

**PHASE EXIT:** authenticated user can only perform actions authorized in the current organization/location context.

---

# PHASE 4 — People & Employee / HR Foundation

## PR-04.1 Person
- [ ] person master
- [ ] identity fields
- [ ] lifecycle

## PR-04.2 Employee
- [ ] employment relationship
- [ ] employee code
- [ ] organization/location assignment
- [ ] employment lifecycle
- [ ] start/end date rules

## PR-04.3 Employee profile
- [ ] job/position information
- [ ] employment status
- [ ] controlled profile changes

## PR-04.4 Employee documents
- [ ] document metadata
- [ ] restricted access
- [ ] evidence/document boundary
- [ ] auditability
- [ ] retention policy placeholder
- [ ] Aadhaar handling only after explicit approved design

**PHASE EXIT:** person, employee and account remain independent concepts with verified access control.

---

# PHASE 5 — Roles, Responsibilities & Authority

## PR-05.1 Business Role
- [ ] role identifier
- [ ] name
- [ ] purpose
- [ ] actual work expectation
- [ ] authority configuration boundary
- [ ] active lifecycle

## PR-05.2 Standard responsibilities
- [ ] responsibility
- [ ] actual work
- [ ] ordering
- [ ] optional Work/Situation reference
- [ ] organization integrity

## PR-05.3 KPIs
- [ ] KPI definitions
- [ ] descriptions
- [ ] configuration
- [ ] active lifecycle
- [ ] no invented formulas

## PR-05.4 Role checklists
- [ ] checklist definition
- [ ] checklist items
- [ ] ordering
- [ ] configuration
- [ ] no competing task engine

## PR-05.5 Employee role assignment
- [ ] employee-role relationship
- [ ] organization integrity
- [ ] active assignment
- [ ] future cardinality compatibility

## PR-05.6 Employee-specific additions
- [ ] additions
- [ ] ordering
- [ ] effective-role view
- [ ] baseline preservation
- [ ] negative test proving baseline cannot be silently replaced

The Stage 8 business contract explicitly requires role purpose, responsibilities, actual work, authority, KPIs and role-level checklist, while employee additions must extend rather than replace the standard role baseline. fileciteturn24file0L2-L2

**PHASE EXIT:** effective employee responsibility = standard role baseline + explicit employee additions.

---

# PHASE 6 — Work / Situations Operational Engine

## PR-06.1 Work/Situation definitions
- [ ] routine trigger
- [ ] event-based trigger
- [ ] item/order-triggered trigger
- [ ] severity configuration
- [ ] evidence configuration
- [ ] verification configuration
- [ ] active lifecycle

## PR-06.2 Work instances
- [ ] instance creation
- [ ] assignment
- [ ] organization scope
- [ ] location scope
- [ ] source reference
- [ ] definition snapshot/version context
- [ ] instance lifecycle

## PR-06.3 State machine
- [ ] SEEN
- [ ] ACKNOWLEDGED
- [ ] COMPLETED
- [ ] VERIFIED
- [ ] valid transitions
- [ ] invalid transition rejection
- [ ] high/critical verification separation

## PR-06.4 Assignment
- [ ] employee assignment
- [ ] manager assignment where approved
- [ ] reassignment rules
- [ ] authorization checks

## PR-06.5 Completion
- [ ] completion service
- [ ] required evidence gate
- [ ] completion validation
- [ ] duplicate submission protection

## PR-06.6 Rework / exception
- [ ] failed verification path
- [ ] rework
- [ ] exception
- [ ] escalation trigger

The approved state model is exactly `SEEN → ACKNOWLEDGED → COMPLETED → VERIFIED`; state transitions must be explicit domain operations, and required evidence must exist before valid completion. fileciteturn25file0L2-L2

**PHASE EXIT:** first complete operational loop works:
`report/problem → situation → assign work → execute → evidence → verify → resolve → audit`.

---

# PHASE 7 — Evidence, Verification & Notifications

## PR-07.1 Evidence subsystem
- [ ] evidence metadata
- [ ] attachment boundary
- [ ] access policy
- [ ] required-evidence validation
- [ ] sensitive evidence controls

## PR-07.2 Verification
- [ ] verification requirement
- [ ] verifier authorization
- [ ] verification result
- [ ] reject/rework
- [ ] verified state

## PR-07.3 Reminder engine
- [ ] due notification
- [ ] reminder
- [ ] strong reminder
- [ ] final reminder
- [ ] escalation
- [ ] verification
- [ ] exception/escalation

## PR-07.4 Notification delivery
- [ ] in-app notifications
- [ ] recipient resolution
- [ ] delivery status
- [ ] retry/idempotency
- [ ] failure handling

Exact reminder timing, thresholds and recipients remain business decisions until explicitly approved. The Stage 8 design intentionally leaves them configurable/deferred. fileciteturn24file0L2-L2

**PHASE EXIT:** required evidence, verification and escalation behavior are independently testable.

---

# PHASE 8 — Audit & Governance

## PR-08.1 Audit event model
- [ ] actor
- [ ] action
- [ ] entity
- [ ] timestamp
- [ ] organization/location
- [ ] before/after where appropriate
- [ ] correlation/reference

## PR-08.2 Authorization audit
- [ ] denied actions
- [ ] privileged actions
- [ ] OWNER actions
- [ ] approval actions

## PR-08.3 Data governance
- [ ] sensitive data access
- [ ] document access
- [ ] financial changes
- [ ] inventory changes
- [ ] configuration changes

## PR-08.4 History
- [ ] lifecycle history
- [ ] state history
- [ ] controlled corrections
- [ ] retention strategy

**PHASE EXIT:** material business actions are traceable.

---

# PHASE 9 — Performance Management

## PR-09.1 KPI framework
- [ ] KPI assignment
- [ ] target model
- [ ] measurement period
- [ ] actual values
- [ ] source references

## PR-09.2 Employee performance
- [ ] work completion
- [ ] quality
- [ ] timeliness
- [ ] KPI results
- [ ] manager review

## PR-09.3 Improvement
- [ ] improvement plan
- [ ] follow-up work
- [ ] review history

KPI formulas, targets, thresholds and weighting must be explicitly approved before they become executable business rules.

---

# PHASE 10 — Products / Menu / Services

## PR-10.1 Product master
- [ ] product/item
- [ ] category
- [ ] unit
- [ ] variant
- [ ] lifecycle

## PR-10.2 Menu/service configuration
- [ ] menu groups
- [ ] sellable item
- [ ] availability
- [ ] pricing

## PR-10.3 Recipe/formula
- [ ] ingredients
- [ ] quantities
- [ ] yield
- [ ] versioning

## PR-10.4 Costing
- [ ] material cost
- [ ] cost snapshot
- [ ] cost history

**PHASE EXIT:** product definitions are stable enough to drive purchasing, inventory and sales.

---

# PHASE 11 — Suppliers / Vendors

## PR-11.1 Supplier master
- [ ] supplier identity
- [ ] contacts
- [ ] lifecycle
- [ ] compliance metadata

## PR-11.2 Commercial terms
- [ ] payment terms
- [ ] purchase terms
- [ ] item relationships
- [ ] pricing history

## PR-11.3 Supplier performance
- [ ] delivery
- [ ] quality
- [ ] price
- [ ] issue history

---

# PHASE 12 — Approval & Procurement

## PR-12.1 Approval engine
- [ ] approval workflow
- [ ] approval levels
- [ ] authority limits
- [ ] delegation
- [ ] segregation of duties
- [ ] override policy
- [ ] audit

## PR-12.2 Purchase request
- [ ] request
- [ ] justification
- [ ] requested items
- [ ] approval

## PR-12.3 Purchase order
- [ ] PO creation
- [ ] supplier
- [ ] line items
- [ ] price
- [ ] approval
- [ ] confirmation

## PR-12.4 Goods receipt
- [ ] receipt
- [ ] quantity
- [ ] quality/acceptance
- [ ] variance
- [ ] inventory event

## PR-12.5 Invoice/reconciliation
- [ ] supplier invoice
- [ ] three-way matching where approved
- [ ] discrepancy
- [ ] payment request

## PR-12.6 Purchase returns
- [ ] return
- [ ] approval
- [ ] inventory reversal/event
- [ ] supplier reconciliation

**PHASE EXIT:** controlled procurement chain works without bypassing authority.

---

# PHASE 13 — Inventory / Stock

## PR-13.1 Inventory master
- [ ] stock item
- [ ] stock location
- [ ] units
- [ ] reorder configuration

## PR-13.2 Inventory event engine
- [ ] opening stock
- [ ] receipt
- [ ] issue
- [ ] transfer
- [ ] adjustment
- [ ] wastage
- [ ] expiry
- [ ] count
- [ ] reconciliation

## PR-13.3 Idempotency
- [ ] event identity
- [ ] duplicate event rejection
- [ ] retry safety
- [ ] concurrent operation review

## PR-13.4 Valuation
- [ ] approved valuation method
- [ ] historical snapshots
- [ ] cost linkage
- [ ] accounting interface

## PR-13.5 Stock controls
- [ ] low stock
- [ ] reorder
- [ ] variance
- [ ] approval
- [ ] audit

**PHASE EXIT:** every stock movement is traceable as an event and safely replay/retry aware.

---

# PHASE 14 — Customer / CRM

## PR-14.1 Customer master
- [ ] customer identity
- [ ] contact data
- [ ] duplicate handling
- [ ] lifecycle

## PR-14.2 Customer history
- [ ] orders
- [ ] visits/interactions
- [ ] feedback
- [ ] complaints

## PR-14.3 Preferences / loyalty
- [ ] preferences
- [ ] loyalty model
- [ ] segmentation
- [ ] consent/privacy rules

## PR-14.4 Customer intelligence
- [ ] purchase patterns
- [ ] frequency
- [ ] value
- [ ] retention indicators

---

# PHASE 15 — Sales / Billing

## PR-15.1 Sales
- [ ] order
- [ ] order lines
- [ ] channel
- [ ] status
- [ ] cancellation/return rules

## PR-15.2 Pricing
- [ ] price lists
- [ ] discounts
- [ ] approval limits
- [ ] taxes

## PR-15.3 Billing
- [ ] invoice
- [ ] payment
- [ ] refund
- [ ] settlement

## PR-15.4 Reconciliation
- [ ] daily sales reconciliation
- [ ] payment reconciliation
- [ ] discrepancy handling
- [ ] audit

## PR-15.5 TMBill boundary
- [ ] Integration Gateway contract
- [ ] provider documentation verification
- [ ] mapping
- [ ] failure handling
- [ ] idempotency
- [ ] controlled activation

**TMBill remains OFF until its own integration gate passes.**

---

# PHASE 16 — Finance / Accounting

## PR-16.1 Accounting foundation
- [ ] chart of accounts
- [ ] account hierarchy
- [ ] accounting periods

## PR-16.2 Ledger
- [ ] journal
- [ ] journal lines
- [ ] debit/credit rules
- [ ] posting

## PR-16.3 Cash / bank
- [ ] cash
- [ ] bank
- [ ] transfers
- [ ] reconciliation

## PR-16.4 Receivables / payables
- [ ] customer receivables
- [ ] supplier payables
- [ ] settlement
- [ ] ageing

## PR-16.5 Transaction integration
- [ ] purchase accounting
- [ ] inventory accounting
- [ ] sales accounting
- [ ] payment accounting
- [ ] tax

## PR-16.6 Financial controls
- [ ] period close
- [ ] controlled corrections
- [ ] immutable historical facts
- [ ] approval
- [ ] audit

## PR-16.7 Statements
- [ ] P&L
- [ ] balance sheet
- [ ] cash flow
- [ ] management reporting

**PHASE EXIT:** source transactions reconcile to accounting facts.

---

# PHASE 17 — Assets / Maintenance

## PR-17.1 Asset master
- [ ] asset
- [ ] category
- [ ] location
- [ ] ownership
- [ ] lifecycle

## PR-17.2 Preventive maintenance
- [ ] schedule
- [ ] due work
- [ ] reminders
- [ ] evidence
- [ ] verification

## PR-17.3 Breakdown / repair
- [ ] breakdown report
- [ ] situation
- [ ] work
- [ ] spare parts
- [ ] repair cost
- [ ] verification

## PR-17.4 Service history
- [ ] vendor
- [ ] service
- [ ] cost
- [ ] documents
- [ ] history

---

# PHASE 18 — Quality & Compliance

## PR-18.1 SOP / standards
- [ ] SOP definition
- [ ] version
- [ ] applicability
- [ ] acknowledgement

## PR-18.2 Inspection
- [ ] inspection definition
- [ ] checklist
- [ ] evidence
- [ ] verification

## PR-18.3 Nonconformance
- [ ] incident
- [ ] classification
- [ ] corrective action
- [ ] preventive action

## PR-18.4 Compliance
- [ ] requirement
- [ ] owner
- [ ] evidence
- [ ] expiry/renewal
- [ ] escalation

---

# PHASE 19 — Dashboard / Owner Command Center

## PR-19.1 Operational health
- [ ] open work
- [ ] overdue work
- [ ] situations
- [ ] critical exceptions

## PR-19.2 Business health
- [ ] sales
- [ ] margin
- [ ] cash
- [ ] purchases
- [ ] inventory

## PR-19.3 People
- [ ] employee activity
- [ ] performance
- [ ] attendance/HR indicators where implemented

## PR-19.4 Customer
- [ ] customer trends
- [ ] complaints
- [ ] retention
- [ ] loyalty

## PR-19.5 Exceptions
- [ ] approval bottlenecks
- [ ] stock variance
- [ ] finance variance
- [ ] quality issues
- [ ] maintenance issues

## PR-19.6 Evidence freshness
- [ ] metric source
- [ ] last updated time
- [ ] data completeness
- [ ] permission filtering

**Rule:** Dashboard is a consumer of verified domain facts, not an independent source of truth.

---

# PHASE 20 — Reports, Analytics & Search

## PR-20.1 Operational reports
- [ ] Work
- [ ] Situations
- [ ] employee
- [ ] quality
- [ ] maintenance

## PR-20.2 Commercial reports
- [ ] sales
- [ ] customer
- [ ] supplier
- [ ] purchase

## PR-20.3 Inventory reports
- [ ] stock
- [ ] movement
- [ ] wastage
- [ ] variance
- [ ] valuation

## PR-20.4 Finance reports
- [ ] ledger
- [ ] P&L
- [ ] balance sheet
- [ ] cash flow
- [ ] receivable/payable

## PR-20.5 Analytics
- [ ] trends
- [ ] comparisons
- [ ] drill-down
- [ ] export
- [ ] role-based access

---

# PHASE 21 — Integration Gateway

## PR-21.1 Gateway contract
- [ ] adapter interface
- [ ] authentication boundary
- [ ] request/response normalization
- [ ] idempotency
- [ ] retries
- [ ] failure handling
- [ ] observability

## PR-21.2 Provider adapters
- [ ] TMBill
- [ ] payment systems
- [ ] other approved external systems

## PR-21.3 Provider verification
- [ ] authoritative documentation
- [ ] endpoint verification
- [ ] field mapping
- [ ] rate limits
- [ ] webhook/event verification
- [ ] sandbox tests

No provider behavior is invented.

---

# PHASE 22 — AI / Owner Intelligence

## PR-22.1 AI boundary
- [ ] provider-neutral interface
- [ ] model configuration
- [ ] prompt/context boundary
- [ ] logging policy

## PR-22.2 Authorization
- [ ] AI inherits user permissions
- [ ] organization scope
- [ ] location scope
- [ ] sensitive data filtering

## PR-22.3 Evidence-aware answers
- [ ] source references
- [ ] freshness
- [ ] uncertainty
- [ ] missing-data indication

## PR-22.4 Decision support
- [ ] summaries
- [ ] anomaly detection
- [ ] recommendations
- [ ] scenario analysis

## PR-22.5 Action safety
- [ ] no direct DB writes
- [ ] no self-granted permissions
- [ ] normal approval path
- [ ] normal Work/Situation creation path
- [ ] human acceptance for consequential actions

**PHASE EXIT:** AI is a controlled decision-support layer, never a privileged bypass.

---

# 7. Complete Module Map + Submodule Completion Checklist

This is the master coverage index. Every box must eventually map to a roadmap item.

| # | Module | Required submodules |
|---|---|---|
| 01 | Organization & Business Structure | Organization, lifecycle, locations, departments, operational areas, configuration, scope |
| 02 | Identity, Accounts & Access | Auth, sessions, accounts, memberships, security, roles, permissions, policies, OWNER |
| 03 | People / Employee / HR | Person, employee, employment, profile, position, documents, lifecycle, attendance, leave, shifts, training |
| 04 | Roles & Responsibilities | Role, purpose, responsibilities, actual work, authority boundary, KPI definitions, checklists, employee additions |
| 05 | Work Management | Definitions, triggers, assignment, instances, states, evidence, completion, verification, rework, escalation |
| 06 | Situation / Problem Management | Report, classification, severity, assignment, work generation, resolution, verification, closure, history |
| 07 | Performance | KPI definitions, targets, actuals, employee performance, quality, timeliness, reviews, improvement |
| 08 | Customer / CRM | Customer, contacts, history, visits, orders, preferences, feedback, complaints, loyalty, segmentation |
| 09 | Sales / Billing | Sales, orders, invoices, payments, discounts, taxes, refunds, cancellation, returns, reconciliation |
| 10 | Products / Menu / Services | Master, category, variants, units, price, recipe/formula, costing, availability, lifecycle |
| 11 | Suppliers | Master, contacts, terms, products, pricing, performance, compliance, history |
| 12 | Purchase / Procurement | Request, approval, PO, confirmation, receipt, invoice, return, payment request, reconciliation |
| 13 | Inventory | Items, locations, opening, receipts, issues, transfers, adjustments, wastage, expiry, counts, reconciliation, reorder, valuation |
| 14 | Accounts & Finance | COA, ledger, cash, bank, receivable, payable, income, expense, journal, payments, tax, periods, reconciliation, statements |
| 15 | Assets & Maintenance | Assets, equipment, location, ownership, schedules, preventive, breakdown, repair, service, spares, cost, lifecycle |
| 16 | Quality & Compliance | SOP, standards, inspections, checklists, incidents, nonconformance, CAPA, compliance, verification, renewal |
| 17 | Documents & Evidence | Documents, attachments, evidence, requirements, employee docs, purchase docs, financial docs, work docs, access, retention, audit |
| 18 | Notifications / Escalations | Notifications, reminders, due dates, escalations, manager alerts, critical alerts, approval alerts, compliance alerts |
| 19 | Approval & Authority | Workflows, matrix, limits, delegation, multi-level, SoD, overrides, OWNER, audit |
| 20 | Audit & Governance | Events, actor, timestamp, before/after, authorization, approvals, financial history, security, reporting |
| 21 | Dashboard / Owner Command Center | Business health, sales, finance, cash, purchase, inventory, people, work, situations, KPI, quality, customers, suppliers, maintenance, alerts |
| 22 | Reports / Analytics / Integrations / AI | Reports, analytics, exports, search, Integration Gateway, TMBill, payments, external systems, AI assistant, recommendations |

---

# 8. Cross-System Foundation Checklist

These are not optional modules; they are platform capabilities.

- [ ] Domain/application/service boundary
- [ ] Database repository pattern
- [ ] Transaction helper
- [ ] Validation
- [ ] Error model
- [ ] API contract conventions
- [ ] Authorization policy engine
- [ ] Organization scope helper
- [ ] Location scope helper
- [ ] Audit event helper
- [ ] Evidence access helper
- [ ] Notification/event mechanism
- [ ] Idempotency mechanism
- [ ] Concurrency strategy
- [ ] File/document storage boundary
- [ ] Search strategy
- [ ] Reporting/query boundary
- [ ] Configuration service
- [ ] Integration Gateway
- [ ] Observability/logging
- [ ] Security controls
- [ ] Test fixtures
- [ ] synthetic data generators
- [ ] migration discipline
- [ ] backup/recovery strategy
- [ ] production deployment strategy

---

# 9. Definition of Done for a roadmap item

A roadmap item cannot be marked ✅ Verified unless:

```text
Requirement
   ↓
Domain model
   ↓
Database
   ↓
Authorization
   ↓
Business rules
   ↓
Application/service
   ↓
API/UI
   ↓
Tests
   ↓
Migration
   ↓
Audit
   ↓
Security review
   ↓
Regression
   ↓
Roadmap reconciliation
   ↓
Commit
```

If any material layer is missing, the item remains 🟡/🟢 rather than ✅.

---

# 10. Commit / Branch Control

Every implementation batch should use a roadmap ID.

Example:

- `KAL-05.2-RESP-001`
- `KAL-06.3-WORK-004`
- `KAL-12.3-PO-002`

Commit format:

`KAL-XX.X: short verified change`

Before commit:

- [ ] only intended files changed
- [ ] no secret files
- [ ] no real production data
- [ ] no unrelated refactor
- [ ] tests pass
- [ ] typecheck passes
- [ ] build passes where applicable
- [ ] migration reviewed
- [ ] security reviewed
- [ ] roadmap updated

The repository development workflow explicitly prohibits committing passwords, OTPs, API tokens, private keys, production credentials, real Aadhaar data, or unapproved real customer data. fileciteturn22file0L2-L2

---

# 11. Stage Gate Model

| Gate | Required result |
|---|---|
| G0 Blueprint | Scope and dependencies frozen |
| G1 Foundation | Application/DB/test foundation verified |
| G2 Identity | Auth + account lifecycle verified |
| G3 Authorization | Server-side authorization and isolation verified |
| G4 People | Person/employee boundary verified |
| G5 Role | Role baseline/additions verified |
| G6 Work | State engine and assignment verified |
| G7 Evidence | Evidence + verification verified |
| G8 Governance | Audit and privileged actions verified |
| G9 Performance | KPI/performance chain verified |
| G10 Procurement | Purchase approval/receipt chain verified |
| G11 Inventory | Event/idempotency/reconciliation verified |
| G12 CRM | Customer lifecycle verified |
| G13 Sales | Sales/billing/reconciliation verified |
| G14 Finance | Accounting/reconciliation verified |
| G15 Quality/Assets | Operational compliance and maintenance verified |
| G16 Management | Reports/dashboard verified |
| G17 Integration | External gateway/provider verification passed |
| G18 AI | AI safety/authorization/evidence gate passed |
| G19 Production | Full production readiness passed |

---

# 12. Critical End-to-End Acceptance Loops

The roadmap is not complete merely because modules individually work.

## Loop A — Employee responsibility
`Role → Responsibility → Employee assignment → Effective responsibility → Work definition → Work instance → Completion → Verification → Audit`

## Loop B — Problem resolution
`Problem report → Situation → Classification → Assignment → Work → Evidence → Verification → Resolution → Audit`

## Loop C — Procurement
`Need → Purchase request → Approval → PO → Supplier → Goods receipt → Inventory event → Invoice → Reconciliation → Finance`

## Loop D — Sales
`Customer → Order → Product → Pricing → Billing → Payment → Inventory event → Finance → Customer history`

## Loop E — Maintenance
`Asset → Preventive/breakdown trigger → Situation → Work → Spare part → Cost → Verification → Asset history`

## Loop F — Management
`Domain facts → KPI/report → Exception → Owner dashboard → Decision → Approved action → Work → Verification → Audit`

## Loop G — AI
`Authorized user → permitted data → evidence-aware analysis → recommendation → human/authorized decision → normal business workflow → audit`

Each loop receives an end-to-end gate before production readiness.

---

# 13. Gap Register — mandatory categories

Whenever something new is discovered, it goes here before implementation.

| Gap type | Examples |
|---|---|
| Business gap | Missing business rule |
| Architecture gap | Missing boundary/service |
| Data gap | Missing entity/constraint/history |
| Security gap | Missing authorization/isolation |
| Workflow gap | Missing state/approval path |
| Integration gap | Provider contract unknown |
| Reporting gap | Required management metric absent |
| Operational gap | Monitoring/backup/recovery absent |
| UX gap | Required user workflow absent |
| Compliance gap | Required evidence/retention absent |

### Discovery rule

`Discovery → Gap Register → Impact Analysis → Blueprint Update → Dependency Recalculation → Roadmap Update → Implementation`

Never:

`Discovery → immediate coding`

---

# 14. Decision Register — mandatory examples

Decisions requiring explicit approval include:

- Employee-to-Role cardinality
- authority taxonomy
- KPI formulas
- KPI targets/weights
- reminder timing
- escalation thresholds
- escalation recipients
- severity taxonomy
- evidence types/storage/validation
- approval limits
- financial accounting policies
- inventory valuation method
- customer privacy/retention rules
- TMBill activation
- AI action permissions

The Stage 8 contract explicitly identifies KPI formulas, authority taxonomy, escalation timing/recipients, evidence types/storage, severity formulas and several lifecycle behaviors as deferred rather than safe to invent. fileciteturn24file0L2-L2

---

# 15. What must NOT happen

- Do not create a second checklist/task engine.
- Do not let business roles grant permissions.
- Do not use UI-selected organization/location as authorization.
- Do not let OWNER bypass authorization.
- Do not copy role definitions into employees as uncontrolled duplicates.
- Do not overwrite historical financial facts.
- Do not mutate inventory as an unexplained balance-only update.
- Do not allow duplicate integration events to double-post.
- Do not mark required-evidence work complete without evidence.
- Do not collapse COMPLETED and VERIFIED for high/critical work.
- Do not build dashboard calculations as independent truth.
- Do not let AI bypass normal authorization or approval.
- Do not invent external provider APIs.
- Do not add real customer/Aadhaar production data to development.
- Do not skip a gate because implementation “looks complete.”
- Do not optimize for speed at the expense of the architecture.

---

# 16. Immediate execution order from the current checkpoint

The next work should follow this exact order:

### NOW
1. **Reconcile the Stage Gate register with actual repository implementation.**
2. **Complete and independently verify the environment/database gate.**
3. **Verify Stage 8.1 persistence against its approved business and technical contracts.**
4. **Complete the Role/People application services.**
5. **Complete authorization enforcement around those services.**
6. **Implement effective-role baseline + employee additions.**
7. **Implement Work/Situation instance creation and assignment.**
8. **Implement the four-state transition engine.**
9. **Implement evidence gating.**
10. **Implement verification.**
11. **Implement reminder/escalation framework.**
12. **Implement audit/governance.**
13. **Run the first complete operational loop end-to-end.**
14. **Only then proceed into Performance → Product → Supplier → Procurement → Inventory → CRM → Sales → Finance.**

### Immediate priority principle

The target is **not “finish code quickly.”**

The target is:

> **Build a durable, secure, auditable operating system in dependency order, with every step verified before the next step.**

---

# 17. Final Production Readiness Gate

Kalki BOS becomes ⭐ Production Ready only when all of the following are true:

- [ ] All required modules are ✅ Verified
- [ ] All critical end-to-end loops pass
- [ ] Organization isolation passes
- [ ] Location isolation passes
- [ ] Authorization negative tests pass
- [ ] OWNER controls pass
- [ ] Database migrations pass on clean database
- [ ] Backup/restore tested
- [ ] Transaction integrity tested
- [ ] Inventory idempotency tested
- [ ] Financial reconciliation tested
- [ ] Audit coverage reviewed
- [ ] Sensitive document access reviewed
- [ ] Notification failure/retry tested
- [ ] Integration Gateway tested
- [ ] TMBill activation explicitly approved if used
- [ ] AI safety gate passed
- [ ] No secrets/real sensitive data in repository
- [ ] Observability/alerting ready
- [ ] Performance baseline established
- [ ] Security review completed
- [ ] Disaster/recovery plan tested
- [ ] Pilot acceptance completed
- [ ] Roadmap and Stage Gate registers reconciled
- [ ] Main branch releasable
- [ ] Production deployment procedure verified

---

## Final control statement

**This roadmap is the production creation sequence for Kalki BOS.**

The Master Blueprint defines the system that must exist.  
This roadmap defines the order in which it is built.  
The Quality Gate defines what “done” means.  
The Gap Register controls new discoveries.  
The Decision Register controls unresolved business/architecture choices.  
The Stage Gate controls advancement.

**No implementation step may silently bypass these controls.**
