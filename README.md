# Kalki BOS

Kalki Business Operating System — long-term internal business operations platform.

## Foundation status

This `foundation` branch is the controlled V1 implementation baseline. The Stage 1–15 artifacts were inspected and reconciled before implementation. Only the verified repository and technology foundation is included here; later domain stages remain gated.

## Architecture

Kalki BOS is a TypeScript-first modular monolith using Next.js + React + TypeScript + Node.js + PostgreSQL + Drizzle, with Better Auth as the authentication foundation and Kalki-specific server-side authorization above it.

Core domains are separated by controlled application boundaries: organization/location, people/employees, accounts/roles/permissions, configuration, audit, evidence/documents, Work/Situations, notifications/escalations, Integration Gateway, sales/customer intelligence, purchasing/inventory, finance, assets/maintenance, and Owner Command Center/AI.

## Non-negotiable controls

- Organization and location scope is enforced server-side.
- Authentication and authorization are separate concerns.
- Employee/person, account, role, and permissions remain separate concepts.
- Historical financial facts are not silently overwritten.
- Inventory changes are event-based and idempotent.
- External integrations converge through the Integration Gateway.
- Task completion evidence is validated before completion; high/critical work separates COMPLETED from VERIFIED.
- Sensitive employee documents require least-privilege access and auditability.
- AI is provider-neutral, authorization-bound, evidence-aware, and cannot directly write to the database or grant itself permissions.

## Pilot safety

- Pilot location: Anakul Palayam.
- Pilot start: 1 September 2026.
- TMBill integration: OFF.
- Sales/finance data: synthetic/manual test data only.
- No real Aadhaar documents or production customer data in the repository.

## Development rule

Implement one bounded step at a time. Verify build/tests/static checks plus security, authorization, data integrity, idempotency, auditability, migration impact, and architecture consistency before the next step.
