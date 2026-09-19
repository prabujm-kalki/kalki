# Slice 5 Test Recovery Plan

| Original Test | Evidence Found | Exact Recovery Possible | Reconstruction Needed | Acceptance Intent |
|---|---|---|---|---|
| HR can propose a change successfully | Inferred from sequence | No | Yes | Verify HR can successfully submit a valid change proposal. |
| HR cannot propose a change without a reason | `scratch_slice5_logs.txt` (line 112) | No | Yes | Ensure proposal API/service rejects empty reasons. |
| HR cannot propose another change while one is pending | `scratch_slice5_logs.txt` (line 113) | No | Yes | Concurrency lock: one pending proposal per employee. |
| Owner can list pending proposals across the organization | `scratch_slice5_logs.txt` (line 114) | No | Yes | Owner role has org-wide visibility of proposals. |
| HR cannot list all pending proposals across the organization | `scratch_slice5_logs.txt` (line 115) | No | Yes | HR role is restricted to their location/scope. |
| Unauthorized users cannot approve proposals | `scratch_slice5_logs.txt` (line 116) | No | Yes | Approval requires Owner or equivalent authority. |
| Owner cannot reject a proposal without a comment | `scratch_slice5_logs.txt` (line 117) | No | Yes | Rejection mandates an explanation comment. |
| Unauthorized users cannot reject proposals | `scratch_slice5_logs.txt` (line 118) | No | Yes | Rejection requires Owner or equivalent authority. |
| Owner can reject the proposal, which clears it without changing master data | `scratch_slice5_logs.txt` (line 119) | No | Yes | Rejecting a proposal updates status to REJECTED, master data untouched. |
| Owner can approve a new proposal and update master data | `scratch_slice5_logs.txt` (line 120) | No | Yes | Approval updates employee master data and logs history. |
| Salary Case A: Owner can edit unrelated fields on an active employee with existing salary without breaking it | `scratch_slice5_logs.txt` (line 121) | No | Yes | Updating an employee doesn't corrupt existing salary records. |
| Salary Case B: Owner can edit unrelated fields on a DRAFT employee with NO salary without error | `scratch_slice5_logs.txt` (line 122) | No | Yes | Updating an employee without salary doesn't crash the salary engine. |
