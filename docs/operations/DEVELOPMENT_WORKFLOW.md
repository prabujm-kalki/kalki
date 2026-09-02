# Development Workflow

## Required verification loop

1. Select one bounded implementation step.
2. Check requirements, architecture dependencies, and prior decisions.
3. Implement only that step.
4. Run relevant tests/build/static checks available in the connected environment.
5. Review security, authorization, data integrity, idempotency, auditability, and migration impact.
6. Compare the result against the frozen architecture and stage gate.
7. Correct defects.
8. Re-run verification.
9. Commit with a clear message.

## Never commit

- passwords, OTPs, API tokens, private keys, or production credentials
- real Aadhaar documents or numbers
- real customer data unless an approved production policy explicitly permits it

## Branch policy

Keep `main` releasable. Use feature/foundation branches for controlled increments and pull requests when collaborative development begins.
