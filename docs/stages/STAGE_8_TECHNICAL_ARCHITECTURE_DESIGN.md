# Stage 8 Technical Architecture Design

This document translates the approved Stage 8 business contract into a minimum durable technical model. It is a design boundary for later implementation; it does not implement schema, services, APIs, UI, or production workflows.

The design uses the existing Kalki BOS modular-monolith boundaries. Role/People owns role definitions and employee-specific additions. Work/Situations owns operational definitions and instances, state transitions, evidence gates, reminders, verification, and escalation. Authorization remains in the Stage 6 authorization layer.

## Design Goals

- Preserve Person, Employee, User Account, Role, Permission, and Authorization as separate concepts.
- Keep organization and location scope explicit and server-enforced.
- Preserve a shared role baseline when employee-specific additions exist.
- Use one Work/Situations operational engine for routine, event-based, and item/order-triggered work.
- Keep work definitions separate from actual work instances.
- Preserve the four approved task states and the distinction between completion and verification.
- Represent mandatory evidence without inventing evidence types or storage details.
- Represent the approved reminder/escalation sequence without freezing timing, thresholds, recipients, or formulas.
- Avoid full audit/history implementation while leaving stable references for later audit and history work.

## Domain Ownership

### Role/People domain

The Role/People domain owns:

- Role definitions;
- role purpose and baseline configuration;
- standard responsibilities and their actual work descriptions;
- role KPI definitions as configurable definitions without formulas;
- role-level checklist definitions as configurable definitions without prescribed items;
- the Employee-to-Role relationship;
- employee-specific responsibility/work additions.

The domain exposes the effective role view as the standard role baseline combined with employee-specific additions. Additions are not replacement records and must not mutate shared role records.

### Work/Situations domain

The Work/Situations domain owns:

- Work/Situation definitions;
- trigger categories;
- work instances;
- task state transitions;
- evidence requirements and completion gates;
- completion and verification separation;
- reminder and escalation sequence configuration.

A role responsibility may reference or generate a Work/Situation definition, but it does not create a second task or checklist engine. Role-level checklist definitions remain role configuration; executable work uses Work/Situations.

### Authorization boundary

Roles in this design describe business responsibility and configuration. They do not grant application permissions.

All reads and writes pass through the existing Stage 6 authentication and authorization services. Organization and location scope is checked server-side. Session or UI selection is context only and never substitutes for authorization.

## Technical Model

The following are conceptual entities and durable relationships. Names are design identifiers, not a final schema naming mandate.

### Role

A Role is an organization-owned reusable definition.

Core attributes:

- `organization_id`: required owner scope;
- `identifier`: organization-scoped stable identifier;
- `name`: configurable display name;
- `purpose`: role purpose text;
- authority definition/configuration: extensible data with no authority taxonomy;
- baseline definition/configuration: the shared standard role definition;
- `is_active`: configuration status;
- configuration metadata: extensible data for future approved configuration.

A Role is not a User Account, Employee, Permission, or authorization grant. A Role must not be globally shared across organizations unless an explicit future shared-definition model is approved.

The organization scope is part of the identity and all role child records inherit that scope through foreign-key or service-level integrity controls.

### Role responsibility

A Role Responsibility belongs to one Role and represents part of the standard role baseline.

Core attributes:

- `role_id`;
- responsibility description;
- actual work description;
- `position` or ordering value;
- configurable metadata.

Responsibilities are baseline records. Updating or adding an employee-specific addition does not update, delete, reorder, or replace these records.

### Role KPI definition

A Role KPI Definition belongs to one Role.

Core attributes:

- `role_id`;
- KPI name;
- KPI description;
- configurable definition/metadata;
- active/configuration status where needed.

No formula, calculation expression, target, threshold, weighting, or specific KPI calculation is defined here. The metadata structure must allow later approved configuration without requiring a different conceptual model.

### Role checklist definition

A Role Checklist Definition belongs to one Role and represents role-level checklist configuration.

Core attributes:

- `role_id`;
- checklist item definition text;
- `position` or ordering value;
- configurable metadata;
- active/configuration status where needed.

This is not an executable task engine. No specific checklist item, completion rule, evidence type, or timing is defined by this design.

### Employee role relationship

An Employee is associated with a Role through an explicit Role/People relationship.

The relationship must:

- reference an existing Employee and organization-owned Role;
- preserve the organization boundary between Employee and Role;
- remain separate from the Employee's User Account and permissions;
- provide the baseline used when calculating the Employee's effective responsibilities;
- avoid copying or mutating the shared Role child records merely to show an employee view.

Whether an Employee may have one current Role or multiple concurrent Role relationships is not fixed by this design. The association must be extensible enough for that later approved decision.

### Employee-specific responsibility/work addition

An Employee Responsibility Addition belongs to an Employee and explicitly represents an addition to that Employee's standard role baseline.

Core attributes:

- `employee_id`;
- responsibility description;
- actual work description;
- ordering or presentation position where useful;
- configurable metadata;
- active/configuration status where needed.

The effective Employee responsibility set is conceptually:

`standard Role baseline + Employee-specific additions`

The addition has no operation that replaces, deletes, or mutates the Role baseline. Removal or inheritance semantics beyond preserving the baseline are deferred. An addition may later reference a Work/Situation definition, but that reference must not turn the addition into a competing task engine.

### Work/Situation definition

A Work/Situation Definition is an organization-owned reusable operational definition.

Core attributes:

- `organization_id`: required owner scope;
- title;
- description;
- trigger category, supporting exactly:
  - routine;
  - event-based;
  - item/order-triggered;
- optional configurable severity value;
- optional verification configuration;
- optional evidence configuration;
- configurable metadata;
- active/configuration status.

Severity is represented as configurable data rather than a frozen taxonomy or formula. The design must support high/critical work needing separate completion and verification without defining thresholds or severity calculations.

A Work/Situation Definition is never implicitly available to another organization. Location applicability, if needed, must be represented by an explicit scoped relationship or service rule in a later implementation; no cross-organization applicability is assumed.

### Work instance

A Work Instance is an actual occurrence assigned or generated from a Work/Situation Definition.

Core attributes:

- `work_situation_definition_id`;
- `organization_id`;
- location context where the work is location-scoped;
- relevant Employee assignment where applicable;
- source reference/trigger metadata for routine, event, or item/order generation;
- source definition version/reference and the definition values needed to preserve what was assigned;
- current task state;
- optional verification configuration/result state;
- configurable instance metadata.

Definition and instance are separate records. Later edits to a definition must not silently rewrite an existing instance. The source reference/version or immutable assignment snapshot preserves the definition context used for that instance without implementing full audit/history in this stage.

Work instances are organization/location scoped and must be read or mutated only through Work/Situations services after Stage 6 authorization.

### Task state

The Work Instance state is one of exactly:

`SEEN -> ACKNOWLEDGED -> COMPLETED -> VERIFIED`

The model must preserve all four states as distinct values. A state transition is an explicit domain operation, not an arbitrary writable status field.

The minimum transition contract is:

- `SEEN` may advance to `ACKNOWLEDGED`;
- `ACKNOWLEDGED` may advance to `COMPLETED`;
- `COMPLETED` may advance to `VERIFIED`;
- skipping states, reversing states, or treating one state as another is invalid unless a later approved contract changes this model.

For high/critical work, `COMPLETED` and `VERIFIED` remain separate even when verification is required. No severity thresholds or transition timing are defined here.

### Evidence requirement

An Evidence Requirement belongs to a Work/Situation Definition or its task configuration and represents whether evidence is required for valid completion.

Core attributes:

- owning Work/Situation definition or task configuration reference;
- `is_required`;
- configurable metadata reserved for future evidence policy.

No evidence type, file format, storage provider, document class, or evidence table is defined here. The Work/Situations completion service must be able to determine whether required evidence exists before allowing valid transition to `COMPLETED`. Evidence storage and detailed evidence validation remain future design work.

### Reminder and escalation configuration

A Reminder/Escalation Configuration belongs to a Work/Situation Definition or its operational configuration.

It represents an ordered sequence of framework stages:

1. due notification;
2. reminder;
3. strong reminder;
4. final reminder;
5. escalation;
6. verification;
7. exception/escalation.

Core technical shape:

- owning Work/Situation definition/configuration reference;
- ordered stage identifier;
- configurable metadata for the stage;
- active/configuration status.

The model deliberately does not define timing, thresholds, recipients, severity formulas, or escalation policies. Those values remain configurable/deferred and must be supplied by later approved business decisions.

## Integrity and Scope Rules

- Every Role and Work/Situation Definition has an explicit organization owner.
- Role child records cannot be attached to a Role from another organization.
- Employee-specific additions can only reference their Employee and cannot target or mutate another organization's Role baseline.
- An Employee-to-Role relationship must enforce organization consistency.
- Work Instances preserve their organization scope and location context; definitions cannot be silently reassigned across organizations.
- Location-scoped reads and writes require the existing Stage 6 server-side location authorization.
- Role configuration never grants permissions.
- State transitions are validated by Work/Situations domain services and protected by persistence constraints where practical.
- Mandatory evidence is checked before valid completion.
- `COMPLETED` and `VERIFIED` are never collapsed into one value.
- Definition changes do not silently rewrite existing instances.
- Full audit/history, lifecycle history, and evidence storage are not introduced by this design.

## Deferred Technical and Business Decisions

The following remain deliberately open and must not be invented during implementation:

- specific role names;
- specific responsibility or actual-work content;
- KPI formulas, calculations, targets, thresholds, or weighting;
- specific checklist items or checklist completion content;
- authority-level taxonomy;
- exact Employee-to-Role cardinality and reassignment semantics;
- inheritance/removal behavior beyond preserving the standard role baseline and allowing additions;
- specific evidence types, storage, formats, and validation rules;
- severity taxonomy and formulas;
- reminder timing;
- escalation thresholds;
- escalation recipients;
- escalation severity formulas;
- full audit implementation;
- lifecycle history;
- UI;
- employee documents and Aadhaar handling;
- unrelated modules.

## Implementation Boundary

This document defines the minimum technical architecture for later Stage 8 implementation. It does not implement:

- database tables or migrations;
- Role/People services or APIs;
- a Work/Situations task engine;
- a second checklist engine;
- task execution or state mutation;
- evidence storage;
- KPI calculation;
- audit/history;
- escalation delivery;
- UI;
- production seed data.
