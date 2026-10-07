# Kalki BOS Accounts Module Architecture (The Accounts Bible)

## Overview
The Accounts module is a centralized, event-driven accounting engine. It is not designed for generic manual data entry. Instead, operational modules (Purchase, Payroll, Utilities, Sales) act as the source of truth, publishing **Accounting Events** that the Accounts engine translates into double-entry journal entries.

## Core Principles
1. **Strict Double-Entry:** The system enforces that Total Debit = Total Credit at the database level. Unbalanced journals cannot be posted.
2. **Traceability:** Every journal entry must carry a reference to its source module and transaction ID to guarantee a complete audit trail.
3. **Transaction Lifecycle:** Posted transactions cannot be deleted. If an error occurs, it must be corrected via a Reversal Journal, ensuring maintainability and audit history.
4. **Manual Journals Restricted:** Manual journals are reserved strictly for accounting adjustments (depreciation, accruals, year-end corrections), not for regular operational expenses.

## Submodule Architecture
The Accounts module consists of a Dashboard + 8 core functional submodules + 1 Settings module.

### Directory & Routing Structure
```text
Accounts
├── 1. Dashboard                   (/accounts)
├── 2. Chart of Accounts (CoA)     (/accounts/chart-of-accounts)
├── 3. Journals & Adjustments      (/accounts/journals)
├── 4. Bank & Cash Operations      (/accounts/banking)
├── 5. Payables & Receivables      (/accounts/ledgers)
├── 6. Inter-Branch Clearing       (/accounts/inter-branch)
├── 7. Fixed Assets & Depreciation (/accounts/assets)
├── 8. Tax & Compliance (GST)      (/accounts/tax)
├── 9. Financial Statements        (/accounts/reports)
└── 10. Settings                   (/accounts/settings)
```

## Detailed Specifications

### 1. Dashboard Command Center (`/accounts`)
*   **Top Bar:** Branch Selector, Period Selector, `+ Quick Action` dropdown (New Journal, Inter-Branch Transfer, Owner Capital).
*   **KPI Cards:** Total Cash/Bank, Receivables (with overdue sub-label), Payables (with due-this-week sub-label), Net Profit/Margin, GST Liability.
*   **Analytics Row:** Cash Flow Trend (Line Chart), Income vs Expense (Bar Chart), Expense Breakdown (Donut Chart), Branch Performance (Horizontal Bar).
*   **Audit Row:** Unposted/Draft Events, Bank Reconciliation Counter, Inter-Branch Imbalance Alert.

### 2. Chart of Accounts (`/accounts/chart-of-accounts`)
*   **UI:** Hierarchical tree table grouped by tab (Assets, Liabilities, Equity, Income, Expenses).
*   **Features:** Locked system accounts (e.g., Accounts Payable) prevent accidental deletion. Kalki BOS auto-generates a standard CoA on organization setup.
*   **Primary Action:** `+ New Account` (Name, Code, Type, Parent, Description).

### 3. Journals & Adjustments (`/accounts/journals`)
*   **UI:** Tabs for All Journals, Manual Adjustments, and Drafts/Approvals.
*   **Validation:** Dynamic multi-row grid with a live balance validator. Submit disabled unless `Total Debit === Total Credit`.
*   **Primary Action:** `+ New Manual Journal`.

### 4. Bank & Cash Operations (`/accounts/banking`)
*   **UI:** Bank account cards showing book vs. cleared balances. Split-screen reconciliation workspace.
*   **Primary Actions:** `+ Add Bank/Cash Account`, `+ Record Transfer (Contra)`, `Import Statement`.

### 5. Payables & Receivables (`/accounts/ledgers`)
*   **UI:** Aggregated vendor/customer ledgers with Ageing Analysis toggle.
*   **Primary Actions:** `+ Record Direct Payment`, `+ Record Customer Receipt`.

### 6. Inter-Branch Clearing (`/accounts/inter-branch`)
*   **UI:** Branch Matrix Table showing live reciprocal balances (Due To / Due From). 
*   **Features:** Automated settlement engine to generate balancing contra entries for branch transfers.
*   **Primary Action:** `+ Initiate Branch Transfer`.

### 7. Fixed Assets & Depreciation (`/accounts/assets`)
*   **UI:** Asset Register Table (Acquisition Cost, Accumulated Depreciation, NBV).
*   **Primary Actions:** `+ Register Asset`, `Run Depreciation Engine`.

### 8. Tax & Compliance (`/accounts/tax`)
*   **UI:** Tax Ledger Summary (Output GST vs ITC). Audit reconciliation for missing GSTINs/RCM.
*   **Primary Actions:** `+ Record Tax Settlement`, `Generate Tax Summary`.

### 9. Financial Statements & Reporting (`/accounts/reports`)
*   **UI:** Report Viewer with Drill-Down capabilities.
*   **Reports:** Trial Balance, General Ledger, P&L, Balance Sheet, Cash Flow, Branch-wise P&L.
*   **Primary Actions:** `Print / PDF`, `Excel / CSV Export`.

### 10. Settings (`/accounts/settings`)
*   **UI:** Configuration panels for the Accounting Engine.
*   **Features:** Account Mapping Engine (mapping operational categories to CoA accounts), Fiscal Year settings, Journal Numbering, Period Locking.

## Action Button Role Matrix
*   **Managing Director / Admin:** `+ New Account`, `Settings`.
*   **Finance Manager:** `+ New Manual Journal`, `Run Depreciation`.
*   **Branch Cashier / Accountant:** `+ Record Transfer`, `+ Initiate Branch Transfer`.
*   **AP/AR Clerk:** `+ Record Payment`, `+ Record Receipt`.
