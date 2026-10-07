# Finance Module Architecture Mapping

This document details exactly how the previous standalone modules have been preserved, relocated, and logically "clubbed" into the new 7-pillar ERP architecture for Kalki BOS. 

**No functionality was deleted or removed.** The underlying code, components, and database logic for all previous functions remain fully intact. They have simply been re-routed to sit inside their proper architectural homes.

---

## 1. Dashboard
- **Status:** Unchanged.
- **New Location:** `/finance`
- **Mapping:** The main MD/Owner financial cockpit remains the default landing page.

## 2. Sales & Receivables
- **New Location:** `/finance/sales-receivables`
- **Clubbed Functions:**
  - **Invoices (Customer):** Moved here. It represents the receivables side of sales.
  - **Cashier (Reconciliation View):** The actual POS operational data entry remains in the Sales module. However, the accounting and receipts reconciliation view of Cashier shifts here (as Customer Receipts).

## 3. Purchases & Payables
- **New Location:** `/finance/purchases-payables`
- **Clubbed Functions:**
  - **Invoices (Supplier Bills):** The accounts payable side of supplier invoices is now processed here.
  - **Payments:** The previous standalone "Payments" module (used for vendor payments) is now strictly housed here as the engine for clearing Supplier Bills.

## 4. Banking & Cash
- **Status:** Unchanged, but consolidated.
- **New Location:** `/finance/banking`
- **Clubbed Functions:** 
  - **Bank & Cash:** Continues to handle bank accounts, cash accounts, and bank feeds/reconciliation.

## 5. Accounting
- **New Location:** `/finance/accounting`
- **Clubbed Functions:** This is the new "Core Accounting Engine" that groups the heaviest accounting tasks that were previously scattered across the top bar.
  - **Manual Journals:** Moved to `Accounting` → `Journal Entries`.
  - **Sub-Ledgers:** Moved to `Accounting` → `General Ledger` (providing the core accounting view of all sub-ledger transactions).
  - **Inter-Branch (Intra-Branch):** Moved to `Accounting` → `Inter-Branch`.
  - **Fixed Assets:** Moved to `Accounting` → `Fixed Assets`. 
  - **Chart of Accounts:** Moved to `Accounting` → `Chart of Accounts`.

## 6. Reports
- **New Location:** `/finance/reports`
- **Clubbed Functions:**
  - **Financial Statements:** The previous standalone "Financial Statements" module is now the primary section inside the Reports pillar.
  - **Tax & Compliance (Reporting):** The reporting side of the previous "Tax & Compliance" module (e.g., GST Summary, Input/Output Tax) is clubbed under `Reports` → `Tax`.

## 7. Settings
- **New Location:** `/finance/settings`
- **Clubbed Functions:**
  - **Settings:** General configuration, numbering, financial years.
  - **Tax & Compliance (Config):** The configuration side of Tax (tax rates, rules) is clubbed here.

---

### Why do they appear "missing" in the UI?
Currently, the top-level navigation bar correctly shows the 7 main tabs. However, when you click on **Accounting**, for example, you do not immediately see the buttons for *Fixed Assets*, *Manual Journals*, or *Inter-Branch* because we have not yet built the **Secondary Sub-Navigation UI** for these new parent pages. 

The code for Fixed Assets (`AssetsClient`), Journals (`JournalsClient`), etc., is 100% safe and intact in the codebase. Once we implement the sub-navigation sidebars/tabs within each of the 7 pillars, all of these functions will be visually accessible again.
