# Work Operations — operational UX slice

This is the internal UX and workflow specification for the first formal Work Operations slice. It is derived from the Stage 8 contract, existing Work/Situations services, and the current authorization and audit boundaries. It does not add business rules.

## Operator

Restaurant staff and managers who already have `employee:read` on a selected organization/location. Create and update permissions remain server-enforced. Audit history remains owner-only.

## Surfaces

1. **Work queue** (`/work`) — the default operational home after sign-in.
2. **Work detail** (`/work/[id]`) — one instance, one location scope.
3. **Audit history** (`/audit`) — owner-only ledger for the same scope.

Scope is chosen in the shell. Changing scope from a detail page returns to the queue. Changing scope on audit stays on audit.

## Queue workflow

1. Select organization/location.
2. Scan **All** or a lifecycle filter: Seen → Acknowledged → Completed → Verified.
3. Each row shows the frozen definition title, lifecycle state, assignee, trigger category, source when present, evidence gate, and verification gate.
4. Reminder/escalation stages may appear only as captured configuration. Due/overdue timing is not computed; it is not defined by the contract.
5. Open a row to act. The queue never transitions work.

## Detail workflow

1. Read snapshot context (title, description, trigger, severity) — historical and frozen.
2. Read source reference and source metadata when the instance has them.
3. Read evidence and verification status. Required evidence must be recorded before Complete is enabled. Required verification must be recorded after Complete and before Verify.
4. Capture evidence as a short operational note (and optional reference) through the existing metadata object boundary. File storage is not part of this slice.
5. Capture verification the same way, only once the instance is Completed.
6. Advance lifecycle with an explicit confirm: Acknowledge, Complete, Verify. The UI never skips states. Disabled actions stay visible enough to explain the gate.
7. Owners may read related append-only audit events for this instance. Staff do not.

## Copy and resistance to accidents

- Domain states stay `SEEN`, `ACKNOWLEDGED`, `COMPLETED`, `VERIFIED`. Labels are human-readable overlays.
- Complete and Verify are distinct even for high/critical work.
- Confirm before every transition.
- Empty, loading, unauthorized, and blocked-gate states use the existing status language.

## Out of this slice

Automatic assignment, TMBill, scheduler, reminder delivery, notifications, dashboards, and other modules.
