# Kalki BOS - Finance / Accounts Module Master Plan
**Document ID:** KALKI-SPEC-ACCOUNTS-001
**Target Architecture:** Next.js, Node.js, PostgreSQL, Drizzle ORM

This document serves as the step-by-step master plan for implementing the Finance module based on the strict Double-Entry, Event-Driven, Immutable Ledger architecture.

## Phase 1: Database Foundation & Core Ledger (The Engine)
*Objective: Build an unbreakable, immutable database schema that enforces double-entry rules.*
- [ ] **Chart of Accounts (CoA):** Scaffold `account_groups`, `account_types`, and `accounts` tables to support hierarchical financial reporting (Assets, Liabilities, Equity, Income, Expenses).
- [ ] **Mapping Tables:** Create `accounting_mappings` to bridge operational IDs (e.g., `itemCategoryId`, `payrollComponentId`) to specific `accountId`s.
- [ ] **The Ledger:** Scaffold `journal_entries` (header) and `journal_line_items` (debits/credits). 
- [ ] **Data Integrity Constraints:** Implement logic (and potentially DB triggers) to guarantee `Total Debit == Total Credit` on insertion, and strictly prevent `UPDATE` or `DELETE` on posted entries (Immutable Ledger).

## Phase 2: The Accounting Event Engine (The Brain)
*Objective: Build the centralized service that listens to the rest of the application.*
- [ ] **Event Interface:** Define a strict TypeScript interface for incoming financial events (`AccountingEventPayload`).
- [ ] **Mapping Resolution:** Build the service that intercepts an event (e.g., `PURCHASE_INVOICE_APPROVED`), queries `accounting_mappings` based on the operational payload, and determines the correct debits and credits.
- [ ] **Ledger Posting Service:** Build the core function that safely wraps the mapping resolution and ledger insertion in a single PostgreSQL transaction.

## Phase 3: Operational Integrations (The Handshakes)
*Objective: Wire existing modules to the new Event Engine to eliminate manual data entry.*
- [ ] **Purchasing Integration:** Hook the PO/Invoice approval workflow to dispatch events that debit `Inventory/COGS` and credit `Vendor Payable`.
- [ ] **Payroll Integration:** Hook the Payroll Lock action to dispatch events that debit `Salary Expense` and credit `Salary Payable`.
- [ ] **Utilities Scaffolding:** Create a lightweight entry module for Overheads (Electricity, Rent) that dispatches events to debit specific expense accounts and credit `Utility Payable`.

## Phase 4: Multi-Tenant & Inter-Branch Clearing (The Scalability)
*Objective: Automate branch-level reporting and inter-branch transfers.*
- [ ] **Branch Tagging:** Ensure every `journal_line_item` mandates a valid `locationId`.
- [ ] **Clearing Engine:** Implement interceptor logic inside the Event Engine. If a transaction spans two different `locationId`s, automatically inject the offsetting `Inter-Branch Receivable` and `Inter-Branch Payable` journal lines.

## Phase 5: Manual Journals & Maker-Checker (The Safety Net)
*Objective: Allow necessary manual adjustments (depreciation, corrections) under strict governance.*
- [ ] **Manual Entry UI:** Build an ultra-dense, premium "Dry Run" interface for drafting manual journal entries.
- [ ] **RBAC & Workflows:** Integrate with the Task Engine to route Draft entries to the Finance Manager for approval before they can be marked as `POSTED`.

## Phase 6: Reporting & The "Single Pane of Glass"
*Objective: Visualize the financial truth.*
- [ ] **Dashboard:** Build the premium Finance Dashboard using the exact high-density visual standards established in Purchasing/Attendance.
- [ ] **Live Reports:** Generate real-time Trial Balance, P&L, and Balance Sheet views based on querying the immutable ledger by `locationId` and date range.
