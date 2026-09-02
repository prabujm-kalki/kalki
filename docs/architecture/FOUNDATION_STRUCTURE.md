# Kalki BOS — Final Repository Structure

## Approved V1 shape

Kalki BOS is a modular monolith: one Next.js application boundary, one PostgreSQL system of record, explicit domain/module boundaries, and a controlled Integration Gateway. Future service extraction is allowed only when justified by scale, reliability, security, or operational need.

## Foundation tree

```text
.
├── .github/
│   └── workflows/
├── docs/
│   ├── architecture/
│   ├── operations/
│   ├── requirements/
│   ├── security/
│   └── stages/
├── src/
│   ├── app/                 # Next.js UI/API boundary
│   │   └── api/health/
│   ├── db/                  # PostgreSQL/Drizzle boundary
│   ├── lib/                 # infrastructure helpers and env validation
│   └── domains/              # future controlled business modules
├── database/
│   └── migrations/
├── integrations/            # Integration Gateway adapters/contracts
├── scripts/
├── tests/
├── .env.example
├── .gitignore
├── drizzle.config.ts
├── next-env.d.ts
├── package.json
└── tsconfig.json
```

## Domain boundaries to preserve

1. organization / locations
2. people / employees
3. user accounts
4. roles / permissions / authority
5. configuration
6. audit
7. files / evidence
8. Work / Situations / tasks / notifications
9. Integration Gateway
10. sales / customer intelligence
11. purchasing / inventory
12. finance
13. assets / maintenance
14. Owner Command Center / AI

Business rules must live in application/domain services, not in UI-only code. Cross-module access must pass through controlled application boundaries.

## Reconciliation of Stage 1–15 artifacts

- Stage 1 supplies the repository, architecture, security, migration, and development-process baseline.
- Stage 2 selects the implementation stack: Next.js + React + TypeScript + Node.js + PostgreSQL + Drizzle, with Better Auth as the authentication foundation.
- Stage 3 supplies the executable shell, environment boundary, PostgreSQL connection boundary, health endpoint, and test/build configuration.
- Stages 4–10 are retained as sequential domain gates. Their repeated scaffold files are consolidated into the single foundation tree rather than copied as separate stage packages.
- Stages 11–15 are retained as bounded domain/integration gates. They are not enabled merely by copying their artifacts.

## Deliberate exclusions from this foundation

- No business-domain migration is applied yet.
- No Better Auth schema/session implementation is enabled yet.
- No employee/Aadhaar data is seeded.
- No task, purchasing, inventory, finance, sales, customer, asset, or AI production workflow is enabled yet.
- TMBill remains OFF.
- No production credentials, customer data, employee documents, or API keys are committed.

## Gate rule

The next domain implementation step may proceed only after the Stage 3 environment gate is independently passed: Node 24, dependency installation, PostgreSQL 17 connectivity, local `.env`, typecheck, build, health endpoint, migration connectivity, and synthetic-only pilot data.
