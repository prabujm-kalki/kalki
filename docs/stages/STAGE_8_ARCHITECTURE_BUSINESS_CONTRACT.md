# Stage 8 Architecture & Business Contract

This document is the approved Stage 8 contract for the Kalki BOS Work/Situations and Employee responsibility boundaries. It defines the business and architecture requirements for later implementation. It does not enable the Stage 8 system or authorize production workflows.

## Approved Requirements

### Role framework

Every role definition contains:

1. Role purpose
2. Responsibilities
3. Actual work to be performed
4. Authority
5. KPIs
6. Role-level checklist

Role definitions are configurable to some extent at the individual employee/person level while preserving the standard role baseline.

Employee-specific additions extend the standard role baseline. They must not silently replace or destroy the standard role definition.

Hiring and role philosophy prioritizes character, attitude, ownership, and growth mindset. Technical skills are treated as trainable unless a role specifically requires otherwise. This is business context only and must not be encoded into database logic at this stage.

### Work/Situations engine

Work/Situations is the common operational engine for:

- routine work;
- event-based work;
- item/order-triggered work.

Employee responsibilities that become operational work must use this common engine. A separate task or checklist engine must not be created for Employee responsibilities.

### Task state model

Work distinguishes these states:

`SEEN -> ACKNOWLEDGED -> COMPLETED -> VERIFIED`

These states are distinct:

- `SEEN` is not `ACKNOWLEDGED`;
- `ACKNOWLEDGED` is not `COMPLETED`;
- `COMPLETED` is not `VERIFIED`.

For high/critical work, `COMPLETED` and `VERIFIED` remain separate states.

### Evidence

Task templates may configure mandatory evidence.

When evidence is mandatory, a task cannot be validly completed until the required evidence exists.

High/critical work may require a separate verification step after completion.

### Reminder and escalation sequence

The framework supports this sequence:

`Due notification -> reminder -> strong reminder -> final reminder -> escalation -> verification -> exception/escalation`

The sequence is a framework capability. Its exact timing, thresholds, recipients, and severity behavior are not defined by this contract.

## Architectural Principles

### Concept separation

The following concepts remain separate:

- Employee: a person’s employment relationship with an organization and location;
- Role: a reusable definition of expected purpose, responsibilities, work, authority, KPIs, and role-level checklist;
- Role purpose: why the role exists;
- Standard responsibilities: the baseline responsibilities defined by the role;
- Employee-specific responsibility additions: additions for an individual employee/person that extend the role baseline;
- Authority: authority associated with a role or separately governed authorization policy;
- KPIs: role-related measures whose formulas remain deferred;
- Role-level checklist: checklist expectations attached to a role, not a competing task engine;
- Work/Situations: the common operational engine for executable work;
- Evidence/verification: completion evidence and, where required, a distinct verification step;
- Escalation: the governed response sequence for due or exceptional work.

A role baseline must remain available when employee-specific additions are applied. An individual customization must be represented as an extension, not as an implicit replacement.

### Domain ownership

Role purpose, standard responsibilities, employee-specific additions, role-level configuration, and the relationship between an Employee and a Role belong to the Role/People domain.

Routine, event-based, and item/order-triggered execution belongs to Work/Situations. Task state, evidence, verification, reminders, and escalation belong to that common operational engine.

The Role/People domain may define what work is expected. It must not create a second execution engine for that work.

### Existing boundaries

Implementation must preserve the existing Kalki BOS boundaries:

- Person is separate from Employee;
- Employee is separate from User Account;
- Role is separate from Employee;
- authentication and authorization remain separate from business role definitions;
- organization and location scope remains server-side;
- business rules belong in domain/application services rather than UI-only code;
- evidence and verification remain distinct from task completion;
- high/critical work retains separate completion and verification states.

### Configuration and safety

Role and responsibility configuration must preserve the standard baseline and must not silently remove it.

Operational work must pass through normal Work/Situations services and its state, evidence, verification, reminder, and escalation controls.

No role configuration grants authorization by itself. Authority and permissions remain governed by the existing authentication/authorization architecture.

## Explicitly Deferred Decisions

The following are intentionally not defined or implemented by this contract:

- KPI formulas;
- specific KPI calculations;
- specific role names;
- specific checklist items;
- authority-level taxonomy;
- escalation thresholds;
- escalation recipient rules;
- exact reminder timing;
- severity formulas;
- inheritance/removal semantics beyond preserving the role baseline while allowing employee-specific additions;
- UI;
- employee documents and Aadhaar handling;
- full audit implementation;
- lifecycle history;
- unrelated modules.

These decisions require later bounded business and architecture approval before implementation.

## Implementation Boundary

This contract documents the approved Stage 8 direction only. It does not add a Role/Responsibility schema, a Work/Situations engine, task execution, checklist execution, KPI calculation, evidence storage, verification workflow, escalation workflow, UI, or production seed data.
