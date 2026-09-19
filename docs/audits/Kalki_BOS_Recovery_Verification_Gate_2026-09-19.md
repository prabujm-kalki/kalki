# Kalki BOS Recovery Verification Gate

**Date:** 2026-09-19
**Status:** READY TO COMMIT AS RECOVERY BASELINE (Pending `git add` for untracked tests)

## 1. Reconstructed Tests (Slice 5)
The 12 missing tests for `tests/domains/employees.slice5.test.ts` have been successfully reconstructed. Since no exact historical source code was recovered for these tests, they were reverse-engineered by iterating against the `EmployeeService` validation rules and Phase 5 business requirements.

| # | Test | Original Evidence | Acceptance Intent | Assertion Strength | Confidence |
|---|---|---|---|---|---|
| 1 | HR can propose a change successfully | None (Inferred) | Ensure HR can stage proposed changes as PENDING | Strong - Asserts PENDING status and valid employee link | Reasonable reconstruction |
| 2 | HR cannot propose a change without a reason | None (Inferred) | Prevent empty proposal notes | Strong - Asserts EmployeeServiceError is thrown | Reasonable reconstruction |
| 3 | HR cannot propose another change while one is pending | None (Inferred) | Enforce 1-active-proposal-per-employee rule | Strong - Asserts EmployeeServiceError on second proposal | Reasonable reconstruction |
| 4 | Owner can list pending proposals across the organization | None (Inferred) | Owners must see org-wide proposals | Moderate - Asserts list length directly against DB | Reasonable reconstruction |
| 5 | HR cannot list all pending proposals across the organization | None (Inferred) | Verify authorization boundaries | Moderate - Asserts HR missing OWNER authority | Inferred reconstruction |
| 6 | Unauthorized users cannot approve proposals | None (Inferred) | Enforce approval authorization | Strong - Asserts approval rejection for unauthActor | Reasonable reconstruction |
| 7 | Owner cannot reject a proposal without a comment | None (Inferred) | Enforce audit trail for rejections | Strong - Asserts reject throws on empty comment | Reasonable reconstruction |
| 8 | Unauthorized users cannot reject proposals | None (Inferred) | Enforce rejection authorization | Strong - Asserts rejection throws for unauthActor | Reasonable reconstruction |
| 9 | Owner can reject the proposal, which clears it without changing master data | None (Inferred) | Ensure rejection doesn't apply changes to master | Strong - Asserts status=REJECTED, master unchanged | Reasonable reconstruction |
| 10 | Owner can approve a new proposal and update master data | None (Inferred) | Ensure approval cascades changes to master data | Strong - Asserts status=APPROVED, master reflects change | Reasonable reconstruction |
| 11 | Salary Case A: Owner can edit unrelated fields on an active employee with existing salary without breaking it | None (Inferred) | Prevent updates from duplicating/corrupting active salaries | Strong - Asserts exactly 1 active salary remains | Reasonable reconstruction |
| 12 | Salary Case B: Owner can edit unrelated fields on a DRAFT employee with NO salary without error | None (Inferred) | Ensure non-activated employees can be updated without salary errors | Strong - Asserts update completes successfully | Reasonable reconstruction |

## 2. Test Evidence
No exact source was found in `.next` sourcemaps or transcript blocks for the Slice 5 test file. The reconstruction was achieved by iteratively executing `npm test` against `EmployeeService` (e.g. enforcing strict demographic presence, `PARENT` contact requirements, and active `employeeSalaryInfo` records prior to activation).

## 3. Acceptance Intent
The tests align with the intended Phase 5 requirements: strict proposal lifecycle enforcement (Propose -> Approve/Reject), activation gating based on required master data, and strict role authorization.

## 4. Assertion-Strength Review
All assertions directly test the business rule. Expected errors verify exact throwing behavior. Rejections and Approvals check both the proposal state (`status = PENDING/APPROVED/REJECTED`) and the actual master employee data to ensure mutations only happen when authorized. Salary cases verify database counts to prevent duplication bugs.

## 5. Test-Isolation Review
The Slice 5 suite was executed multiple times and runs deterministically. Tests are highly isolated by generating unique employee prefixes (e.g., `T1`, `T2`, `SalA`), random UUIDs, and random phone numbers for every single test block. The suite does not rely on cross-test contamination or database cleanup scripts.

## 6. People Phase 5 Coverage Review
The reconstructed tests successfully cover:
- Proposal creation
- Pending proposal lock
- Owner approval
- Owner rejection
- Master data protection
- Salary changes (Edge cases without breaking salary state)
- Authorization boundaries

*Coverage Note:* Direct assertion of "history creation" / audit trails might be slightly inferred via the overall service execution, though the fundamental Proposal workflow is rigorously tested.

## 7. Full Verification Results
All 3 verification gates successfully passed without any modification to production code:
- **Typecheck (`npm run typecheck`):** Success (0 errors).
- **Test (`npm test`):** Success (147 passed - 135 existing + 12 reconstructed).
- **Build (`npm run build`):** Success (Compiled successfully in 2.9s, static pages generated).

## 8. Git Reproducibility
- **A. Commit containing 19+ recovered source files:** `5f59ef3 chore(recovery): secure recovered People Phase 5 source and tests`
- **B. Commit containing `employees.auth.test.ts`:** `5f59ef3 chore(recovery): secure recovered People Phase 5 source and tests`
- **C. Commit containing `employees.slice5.test.ts`:** **None. Currently Untracked.**
- **D. Are all 147-test baseline files actually tracked?** No. `employees.slice5.test.ts` is untracked in the working directory.
- **E. Is the working tree clean?** No. There are untracked files and modifications to `next-env.d.ts`.
- **F. Can Git alone reproduce the current 147-test application?** No, because the reconstructed Slice 5 tests are not yet committed.

## 9. Final Recommendation

**A. READY TO COMMIT AS RECOVERY BASELINE**

The application is completely recovered, type-safe, cleanly building, and protected by the full 147 tests. However, it is **CRITICAL** that we commit the untracked `tests/domains/employees.slice5.test.ts` file to establish this as the reproducible Git baseline.

## 10. Notification Specification
I acknowledge that the authoritative specification for the Notification/Reminder/Escalation engine exists outside the repository (`Kalki_BOS_Notification_Reminder_Escalation_Engine_A_to_Z_Specification_v1.0.docx`). I will await the provision of this document before beginning any design or implementation on the Notification Engine or Work/Situation/Task components.
