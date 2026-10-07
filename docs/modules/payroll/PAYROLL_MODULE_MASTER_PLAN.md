# PAYROLL MODULE COMPLETION MASTER PLAN

## 1. Approved Payroll Requirements (10-Year Quality Standard)
The Payroll module acts as the automated bridge between the **People Module** (Employee Master & Salary History) and the **Finance Module** (Double-Entry Ledger). It replaces hardcoded, manual Excel-based payroll with an enterprise-grade, rules-driven engine.

Key requirements include:
- **Configurable Pay Components**: The system must not hardcode "Basic" or "HRA". It must support dynamic `payroll_components` (Earnings and Deductions) to adapt to changing tax laws and business policies over the next decade.
- **Attendance & LOP Integration**: The engine must dynamically read from the attendance/shift data to calculate exact working days and Loss of Pay (LOP) without manual data entry.
- **Automated Ledger Posting**: Upon finalizing a payroll run, the system MUST dispatch double-entry accounting events to the Finance Event Engine (Debit: `SALARY_EXPENSE`, Credit: `SALARY_PAYABLE`, `PF_PAYABLE`, etc.).
- **Immutable Payroll Runs**: Once a payroll month is "Processed" and "Approved," the records are locked forever. Any corrections must be done as arrears in the subsequent month.
- **Payslip Generation**: Generate standard, compliant payslips dynamically from the processed payroll records.

## 2. Core Architecture & Data Model (Required Database Changes)

We need to create the following relational tables to support a dynamic payroll engine:

1. **`payroll_components`** (Master Data)
   - Defines the rules.
   - `id`, `organizationId`, `name` (e.g., "Basic Pay", "PF Deduction"), `type` (`EARNING`, `DEDUCTION`, `STATUTORY`), `calculationType` (`FIXED`, `PERCENTAGE_OF_BASIC`, `ATTENDANCE_BASED`), `defaultPercentage`, `ledgerAccountMapping` (e.g., `SALARY_EXPENSE`, `PF_PAYABLE`).

2. **`employee_salary_structures`** (Bridge to People Module)
   - Maps employees to their specific components and overrides default percentages if necessary. (In a 10-year system, different roles have different structures).

3. **`payroll_runs`** (Transactional)
   - The master record for a month's processing batch.
   - `id`, `organizationId`, `locationId`, `month`, `year`, `status` (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PAID`), `totalGross`, `totalDeductions`, `totalNet`.

4. **`payroll_run_employees`** (Transactional)
   - Individual payslip summary for an employee within a run.
   - `id`, `payrollRunId`, `employeeId`, `daysWorked`, `lopDays`, `grossPay`, `totalDeductions`, `netPay`, `status`.

5. **`payroll_run_lines`** (Transactional)
   - The line-by-line breakdown (Earnings/Deductions) for the exact payslip calculation.
   - `id`, `payrollRunEmployeeId`, `componentId`, `amount`, `type`.

## 3. Implementation Phases in Dependency Order

### Phase 1: Foundation (Schema & Master Data)
- **Goal**: Create the structural tables in `src/db/schema.ts` for components, structures, runs, and lines.
- **Action**: Implement the DDL (drizzle schema) for the tables above. Create a seeder to inject standard components (Basic, HRA, PF, PT, TDS) with proper Ledger Mappings.

### Phase 2: The Payroll Engine Service (Core Logic)
- **Goal**: Build the calculation engine in `src/domains/payroll/service.ts`.
- **Action**: Implement a function `draftPayrollRun(month, year, locationId)`.
  - Step 1: Fetch all active employees from the People module.
  - Step 2: Fetch attendance/LOP data for the given month.
  - Step 3: Fetch the effective salary structure for each employee.
  - Step 4: Calculate pro-rata amounts (Basic * (DaysWorked / TotalDays)).
  - Step 5: Save to `payroll_runs`, `payroll_run_employees`, and `payroll_run_lines` in a `DRAFT` status.

### Phase 3: Finance Integration (The Double-Entry Bridge)
- **Goal**: Automatically update the balance sheet and P&L upon approval.
- **Action**: Implement `approvePayrollRun(runId)`.
  - Step 1: Lock the run status to `APPROVED`.
  - Step 2: Aggregate all line items by their `ledgerAccountMapping`.
  - Step 3: Fire `processAccountingEvent` to the Finance module.
    - Debit: Expense Accounts (e.g., Basic Pay Expense, HRA Expense).
    - Credit: Liability Accounts (e.g., Net Salary Payable, PF Payable).

### Phase 4: The Enterprise UI (Kalki Design System)
- **Goal**: Build the user interface for HR and Finance to process payroll.
- **Action**:
  - Create `/payroll/components`: UI to manage rules.
  - Create `/payroll/run`: The main dashboard to draft, review, and approve monthly payroll.
  - Ensure strict adherence to the `.kalki-*` CSS classes for a premium, 10-year look.

## 4. Verification & Acceptance Criteria
- [ ] No hardcoded formulas; all calculations read from `payroll_components`.
- [ ] Changing a component rule only affects future runs; historical `payroll_run_lines` remain perfectly intact (Immutability rule).
- [ ] Approving a payroll run automatically credits `SALARY_PAYABLE` in the Finance Ledger.
- [ ] Disbursing salaries (Vendor/Employee Payments) debits `SALARY_PAYABLE` and credits `BANK_CASH`, perfectly closing the loop.
