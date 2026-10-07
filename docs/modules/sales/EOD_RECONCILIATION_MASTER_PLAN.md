# END-OF-DAY (EOD) RECONCILIATION MASTER PLAN

## 1. Approved Requirements (10-Year Quality Standard)
The EOD Reconciliation engine replaces loose, unverified daily sales importing with a strict, bank-level "Day Close" protocol at the branch level. This ensures total financial control, zero cash leakage, and unified daily reporting.

Key requirements:
- **Blind Cash Declaration**: Cashiers must declare physical cash via a denomination breakdown (e.g., 5 x â‚¹500) *before* the system reveals the expected cash from POS sales.
- **Automated Variance Accounting**: The system compares System Cash vs Physical Declared Cash. Any variance (shortage or overage) is immediately posted to the Finance double-entry ledger (`CASH_SHORTAGE_EXPENSE` or `CASH_OVERAGE_REVENUE`).
- **Aggregator Reconciliation**: Non-cash payments (Swiggy, Zomato, UPI, Cards) are consolidated into their respective receivables accounts.
- **Immutable Day Close**: Once a location is "Closed" for the day, no further back-dated POS invoices can be imported for that date. The Day Close snapshot becomes the absolute truth.
- **Daily Flash Report**: A unified dashboard showing Revenue, COGS, Gross Margin, and Cash Variance per location for the day.

## 2. Core Architecture & Data Model

We need to create the following relational tables to support strict EOD controls:

1. **`day_close_records`** (Transactional - Master)
   - `id`, `organizationId`, `locationId`, `date` (The business date being closed), `status` (`DRAFT`, `CLOSED`), `closedByUserId`, `closedAt`.

2. **`day_close_cash_denominations`** (Transactional - Child)
   - `id`, `dayCloseId`, `denomination` (e.g., 500, 200, 100), `count`, `totalAmount`.

3. **`day_close_financial_summaries`** (Transactional - Immutable Snapshot)
   - Stores the exact snapshot of expectations vs reality to prevent historical tampering if an invoice is forcefully inserted later.
   - `id`, `dayCloseId`, `paymentMethod` (CASH, SWIGGY, ZOMATO, CARD), `systemExpectedAmount`, `actualDeclaredAmount`, `varianceAmount`.

## 3. Implementation Phases in Dependency Order

### Phase 1: Foundation (Schema)
- **Goal**: Create the structural tables in `src/db/schema.ts` for `dayCloseRecords`, `dayCloseCashDenominations`, and `dayCloseFinancialSummaries`.

### Phase 2: The EOD Engine Service (Core Logic)
- **Goal**: Build the reconciliation engine in `src/domains/sales/eod-service.ts`.
- **Action**: Implement `closeDay(locationId, date, denominationBreakdown)`.
  - Step 1: Calculate System Expected Cash by summing all POS sales for that date where payment method = CASH.
  - Step 2: Calculate Physical Cash from the denomination breakdown.
  - Step 3: Compute Variance = Physical Cash - System Expected Cash.
  - Step 4: Lock the Day (Create `dayCloseRecords`).
  - Step 5: Fire `processAccountingEvent` to the Finance module.
    - If Variance < 0 (Shortage): Debit `CASH_SHORTAGE_EXPENSE`, Credit `BANK_CASH`.
    - If Variance > 0 (Overage): Debit `BANK_CASH`, Credit `CASH_OVERAGE_REVENUE`.

### Phase 3: The Enterprise UI (Kalki Design System)
- **Goal**: Build the user interface for the Branch Manager to perform Day Close.
- **Action**:
  - Create `/sales/day-close`: A beautiful UI forcing the cashier to input denominations and then revealing the variance upon submission.

## 4. Verification & Acceptance Criteria
- [ ] Cashiers cannot see the "System Expected Cash" until they have submitted their physical count.
- [ ] Variances automatically trigger double-entry accounting journals perfectly mapped to the P&L.
- [ ] Attempting to close a day that is already closed returns a strict validation error.
