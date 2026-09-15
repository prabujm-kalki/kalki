KALKI POS: PURCHASE & INVENTORY MODULE — COMPREHENSIVE FUNCTIONAL SPECIFICATION
1. Module Overview & Navigation Structure
The Purchase Management module is designed with a multi-role, highly structured architecture accessible through four primary tabs:
Items Tab: Central master catalog for creating, translating, pricing, categorizing, and mapping products to suppliers.
Vendor Tab: Supplier directory for managing vendor profiles and executing bidirectional item-vendor mapping.
Configuration Tab: Central control panel for the Owner to manage role permissions, recurrence schedules, timing windows, escalation durations, surge multipliers, and master units.
User Manual: Built-in guidance and workflow documentation for store staff, managers, and new hires.
2. Role-Based Access Control (RBAC) & Permissions
Owner: Full system privileges (Create, Read, Update, Delete across all configurations, items, vendors, and escalation controls).
Manager: Supervisory privileges to view automated recommendations, review escalated orders, edit quantities, generate/commit Purchase Orders (POs), and manage inventory workflows.
Kitchen In-Charge: Restricted, task-specific operational role. Read-only access for master items and vendors; authorized strictly to view assigned vendor lists and submit on-hand stock data within designated order windows. Cannot create or edit master records.
3. Item Creation, Multilingual Support & Stock Rules
When an item is created or edited, it contains the following data structures and validation rules:
Multilingual Names: Mandatory text input fields for English, Tamil, and Hindi.
Auto-Translate Trigger: Includes a "Translate" button. Entering the item name in any single language and clicking translate instantly auto-populates the remaining two language fields via translation API.
Pricing & Units:
Current Price and Maximum Price (Mandatory numeric inputs).
Unit: Select from standard defaults (Kg, Liter, Gram, Piece, Box, Packet) or create custom units on the fly via an "+ Add New Unit" modal.
Vendor Mapping: Mandatory linkage of at least 1 vendor per item, supporting multi-vendor relationships where one item can be supplied by multiple vendors.
Recurrence & Scheduling: Define ordering frequency upon item creation (Daily, Weekly, Bi-weekly, Monthly, or specific weekday checkboxes like Monday, Tuesday, Wednesday, etc.).
Minimum Stock Baseline: Define the minimum stock level that must be maintained for regular day-to-day operations (e.g., minimum 5 Kg for chicken boneless).
Additional Attributes: Optional product image upload, Minimum Order Quantity (MOQ), tax rate (optional/placeholder for future tax rules), and Active/Inactive status toggle.
4. Vendor Management & Bidirectional Linking
Centralized supplier directory tracking business names, contact persons, phone numbers, emails, addresses, and active statuses.
Bidirectional Association: Allows mapping items directly from the Vendor creation/edit screen in addition to assigning vendors from the Item creation page, ensuring seamless many-to-many relationship management.
5. Configuration Engine: Rules, Timing & Surge Multipliers
A. Flexible Timing & Cutoff Windows
Operational durations are configured in flexible hourly inputs (e.g., 1 hour, 0.5 hours, or longer cycles like 24, 36, or 48 hours).
Kitchen In-Charge Window: Configurable reminder trigger time (e.g., 9:00 AM) and hard cutoff deadline (e.g., 10:30 AM).
Manager Review Duration: Configurable duration (inputted in hours) given to the manager to review and commit orders before escalation.
B. Weekend & Holiday Surge Multipliers & Logic
Rule Configuration: Support for day-of-week surge multipliers (e.g., Friday night / Saturday orders set to +25% to +30%) configured globally, by category, or overridden per item.
Holiday Calendar Integration: An interactive calendar where specific festival dates or public holidays can be marked as high-demand days.
Automation & Calculation Logic:
When an order window opens on a holiday eve or peak weekend day, the system fetches the item's base minimum stock level.
Formula Applied: $\text{Base Minimum Stock} \times (1 + \text{Multiplier \%})$
Smart Rounding: Automatically rounds resulting decimals up to the nearest practical purchasing unit (e.g., whole kilograms or crates) to ensure clean vendor orders without manual math.
6. Automated Workflow, Cutoffs & Escalation Ladder
Stage 1: Kitchen In-Charge Order Window
Daily automated reminders trigger ordering tasks at the configured start time.
The Kitchen In-Charge logs in during their window, selects an assigned vendor, and enters current available stock levels to place the order before the cutoff deadline expires.
Escalation Trigger: If the Kitchen In-Charge misses the cutoff deadline, the task immediately escalates with an alert to the Manager.
Stage 2: Manager Review & Commitment Window
The Manager receives high-priority WhatsApp and in-app notifications containing item summaries and surge calculations.
The Manager reviews recommendations, makes manual adjustments if needed, and triggers actions:
Generate PDF PO: Compiles approved items, quantities, and units into a professional Purchase Order document.
WhatsApp Dispatch: Manually triggers/sends the PDF PO via WhatsApp directly to the vendor's contact number.
Commit PO: Clicks the commit button to log the order, which stops the escalation clock and updates status to Green.
Escalation Trigger: If the Manager's configured duration (e.g., 1 hour) expires without the PO being committed/submitted, a high-priority escalation alert triggers directly to the Owner.
Stage 3: Owner Escalation
The Owner receives an urgent alert indicating that both the Kitchen In-Charge and Manager failed to complete the purchase order.
The Owner can take immediate action directly from their dashboard to generate, review, and dispatch the missed order, preventing critical kitchen stockouts.
System Architecture & Role Permissions
The module operates via four primary tabs: Items, Vendor, Configuration, and User Manual. Access is strictly governed by three distinct user roles.
Role
Access Level & Capabilities
Owner
Full system control. Can create, edit, and delete items, vendors, and configurations. Receives final-tier escalations.
Manager
Supervisory access. Reviews orders, views system recommendations, edits quantities, generates Purchase Order (PO) PDFs, dispatches via WhatsApp, and logs commitments.
Kitchen In-Charge
Read-only access for master data. Can only view items mapped to specific vendors based on daily/weekly schedules. Restricted strictly to entering available stock (not required stock).

Item & Vendor Master Data
The system utilizes bidirectional mapping: items can be assigned to vendors during item creation, and items can be added to vendors from the vendor creation page. A single item can be linked to multiple vendors, but at least one vendor is mandatory.
Component
Configuration & Mandatory Fields
Multilingual Naming
Item names are mandatory in English, Tamil, and Hindi. An Auto-Translate button must automatically populate the remaining two fields when one is entered.
Pricing & Units
Mandatory Current Price and Max Price. Units (Liter, Kg, etc.) require an inline "+ Add New Unit" creation option.
Inventory Rules
Recurrence: Checkboxes for Daily, Weekdays (Mon-Sun), Week 1 to 4, and Monthly. Base Minimum Stock: Configured per item (e.g., minimum 5 Kg boneless chicken).
Optional Fields
Product image, Minimum Order Quantity (MOQ), Tax, and Active/Inactive toggle.

Smart Configuration & Surge Multipliers
The Configuration tab drives the automation engine, allowing precise control over vendor ordering schedules, timing thresholds, and demand spikes.
Configuration Type
Logic & Behavior
Order Windows
Assign specific timing rules per vendor for the Kitchen In-Charge (e.g., 9:00 AM reminder, 10:30 AM hard cutoff/maximum allowed time).
Manager Deadlines
Set manual resolution durations in hours (e.g., 0.5, 1, 24, 36, or 48 hours) for PO processing.
Surge Multipliers
Apply percentage increments (e.g., +20% to +30%) for high-demand periods like Friday and Saturday night orders.
Holiday Calendar
Tag festive dates. The system automatically shifts the surge multiplier to scale the previous evening's order requirements.
Smart Rounding
All system recommendations (Base Stock - Available Stock + Surge) must automatically round off to practical purchasing units.

Workflow & Escalation Ladder
The procurement cycle enforces strict accountability through timed cutoffs.
Kitchen Submission: The Kitchen In-Charge selects a vendor and inputs the currently available stock for scheduled items before the cutoff time.
First Escalation: If the cutoff (e.g., 10:30 AM) is missed, the system immediately alerts the Manager.
Manager Commitment: The system calculates recommendations. The Manager reviews, generates the PO as a PDF, manually sends it to the vendor via WhatsApp, and clicks to "Commit" the order.
Final Escalation: If the Manager fails to commit the PO within their configured hourly duration, a critical alert escalates directly to the Owner.



Kalki BOS: Purchase & Vendor Module Technical Specification (v2.0)
1. Overview & Architectural Alignment
This document serves as the comprehensive engineering specification for the Purchase and Vendor Module within the Kalki BOS platform, perfectly aligned with the Kalki BOS Master Handover architecture (Modular Monolith, Next.js 16.3.3, React 19.2.7, TypeScript, Node 24 LTS, PostgreSQL 17.11, Drizzle ORM, Zod, and Better Auth with Kalki authorization).
This module handles vendor catalogues, pre-defined item loading, scheduled purchasing, purchase orders (PO), goods receipt, discrepancy tracking, three-way matching, and supplier invoice/payable reconciliation.
2. Visual Design System & UI Specifications
Page Background Color: #F8F9FA (Light Gray/Off-White)
Primary Brand Color: #2E7D32 (Forest Green - used for primary CTA buttons and active states)
Secondary Color: #FF8F00 (Warm Amber - used for highlights, badges, and warning states)
Text Primary: #212529 (Dark Charcoal)
Text Muted: #6C757D (Medium Gray)
Border Color: #DEE2E6
Font Family: Arial, sans-serif
Base Line Spacing: 1.25
Container & Layout Alignment
Desktop View (>1024px): Two-column grid layout. Left column (Width: 65%) handles vendor selection, automatic pre-defined item loading, and daily quantity entry; Right column (Width: 35%) handles the Live PO Summary, Total Calculation, and Approval Gateway. Max container width is 1200px, centered with auto margins.
Tablet View (768px - 1024px): Single-column stacked layout. PO Summary moves below the item entry grid. Container padding is set to 24px.
Mobile View (<768px): Single-column full-width layout. Container padding is reduced to 16px to maximize screen real estate. All touch targets are optimized for mobile tapping (minimum height 44px).
3. Component Specifications & UI Mockup Layout
The purchase creation interface is optimized for speed and minimal typing, reflecting operational reality in restaurant and retail environments.
Component / Field
Dimensions / Sizing
Styling & Properties
Behavior & Interaction
 
Vendor Selector Dropdown
Width: 100%, Height: 44px
Border: 1px solid #DEE2E6, Border-Radius: 6px, Background: #FFFFFF
Selecting a vendor triggers immediate automatic loading of all pre-configured vendor items without manual search.
Primary Action Button ("Generate PO / Submit")
Width: 100% (Mobile) / Auto (Min width: 220px on Desktop), Height: 48px
Background: #2E7D32, Text Color: #FFFFFF, Border-Radius: 8px, Font-Weight: Bold
Initiates server-side Zod validation, idempotency check, and database transaction.
Quantity Input (Pre-loaded items)
Width: 120px, Height: 40px
Border: 1px solid #DEE2E6, Border-Radius: 6px, Text-Align: Right
User enters today's required quantity. Unused pre-loaded items remain zero/unselected and are excluded from PO.
Voice Search Bar
Width: 100%, Height: 44px
Background: #FFFFFF, Border: 1px solid #2E7D32, Icon: Microphone
Global voice search integration across the module to filter items or vendor catalogues hands-free.

4. Frontend State Variables & TypeScript Naming Conventions
// TypeScript Interfaces & React State Management
export interface VendorItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  lastRate: number;
  usualQuantity: number;
  isSelected: boolean;
  orderedQuantity: number;
  negotiatedRate: number;
}

export interface PurchaseFormState {
  selectedVendorId: string;
  branchId: string;
  purchaseDate: string;
  items: VendorItem[];
  notes: string;
  isSubmitting: boolean;
  totalEstimatedAmount: number;
}

// React State Hook
const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>({
  selectedVendorId: "",
  branchId: "",
  purchaseDate: new Date().toISOString().split('T')[0],
  items: [],
  notes: "",
  isSubmitting: false,
  totalEstimatedAmount: 0.00
});


5. Database Schema & Table Definitions (PostgreSQL & Drizzle ORM)
Table: vendors
Column Name
Data Type
Constraints
Description
 
vendor_id
UUID
PRIMARY KEY, DEFAULT gen_random_uuid()
Unique identifier for the vendor
organization_id
UUID
NOT NULL, FOREIGN KEY
Tenant isolation scope
vendor_name
VARCHAR(150)
NOT NULL
Commercial name of the supplier
payment_terms
VARCHAR(100)
NOT NULL
Credit days or payment agreement
is_active
BOOLEAN
DEFAULT TRUE
Vendor active status

Table: vendor_items (Predefined Vendor Catalogues)
Column Name
Data Type
Constraints
Description
 
mapping_id
UUID
PRIMARY KEY, DEFAULT gen_random_uuid()
Unique catalog mapping record ID
vendor_id
UUID
NOT NULL, FOREIGN KEY (vendors)
Supplier reference
item_id
UUID
NOT NULL, FOREIGN KEY (items)
Inventory item reference
vendor_item_code
VARCHAR(100)
NULLABLE
Supplier's specific item code/name
usual_quantity
DECIMAL(10,3)
DEFAULT 0.000
Suggested quantity for quick purchasing
last_rate
DECIMAL(10,2)
NOT NULL
Historical actual purchase rate (immutable fact)

Table: purchase_orders
Column Name
Data Type
Constraints
Description
 
po_id
UUID
PRIMARY KEY, DEFAULT gen_random_uuid()
Unique Purchase Order identifier
branch_id
UUID
NOT NULL, FOREIGN KEY
Branch scope (e.g., Avalpoondurai, Anakalpalayam)
vendor_id
UUID
NOT NULL, FOREIGN KEY (vendors)
Selected supplier
po_status
VARCHAR(50)
NOT NULL DEFAULT 'draft'
Status: draft, pending_approval, issued, received, closed
total_amount
DECIMAL(12,2)
NOT NULL
Calculated total payable value
created_at
TIMESTAMP WITH TIME ZONE
DEFAULT CURRENT_TIMESTAMP
Creation timestamp (append-only history)

Table: purchase_order_lines
Column Name
Data Type
Constraints
Description
 
line_id
UUID
PRIMARY KEY, DEFAULT gen_random_uuid()
Unique PO line identifier
po_id
UUID
NOT NULL, FOREIGN KEY (purchase_orders)
Parent purchase order reference
item_id
UUID
NOT NULL, FOREIGN KEY (items)
Inventory item
ordered_quantity
DECIMAL(10,3)
NOT NULL
Quantity ordered
unit_rate
DECIMAL(10,2)
NOT NULL
Agreed purchase rate

6. Business Rules & Automation Flows
Instant Vendor Item Loading: When an operator selects a vendor, the UI instantly fetches and populates all pre-defined catalogue items. Unused items are left blank/zero and excluded from the final payload.
Voice Search Integration: Global voice command support enabled across item selection and catalogue searches.
Historical Price Integrity: Historical purchase rates are immutable facts. System suggestions use historical averages but never overwrite actual recorded invoice rates without explicit authorization.
Idempotency & Transaction Safety: All purchase order submissions require server-side Zod validation, branch authorization, and idempotent transaction handling to prevent duplicate orders.

# KALKI POS: PURCHASE & INVENTORY MODULE — COMPREHENSIVE FUNCTIONAL SPECIFICATION

## 1. Module Overview & Navigation Structure
The Purchase Management module is designed with a multi-role, highly structured architecture accessible through four primary tabs:
* **Items Tab:** Central master catalog for creating, translating, pricing, categorizing, and mapping products to suppliers.
* **Vendor Tab:** Supplier directory for managing vendor profiles and executing bidirectional item-vendor mapping.
* **Configuration Tab:** Central control panel for the Owner to manage role permissions, recurrence schedules, timing windows, escalation durations, surge multipliers, and master units.
* **User Manual:** Built-in guidance and workflow documentation for store staff, managers, and new hires.

## 2. Role-Based Access Control (RBAC) & Permissions
* **Owner:** Full system privileges (Create, Read, Update, Delete across all configurations, items, vendors, and escalation controls).
* **Manager:** Supervisory privileges to view automated recommendations, review escalated orders, edit quantities, generate/commit Purchase Orders (POs), and manage inventory workflows.
* **Kitchen In-Charge:** Restricted, task-specific operational role. **Read-only** access for master items and vendors; authorized strictly to view assigned vendor lists and submit on-hand stock data within designated order windows. 

## 3. Configuration Engine: Rules, Timing & Surge Multipliers
* **Flexible Timing & Cutoff Windows:** Operational durations are configured in flexible hourly inputs (e.g., `1` hour, `0.5` hours, `24` hours).
* **Weekend & Holiday Surge Multipliers:** Apply day-of-week surge multipliers (e.g., Friday/Saturday orders set to +25% to +30%). A Holiday Calendar integration allows marking festival dates to automatically apply surge multipliers to the prior evening's order.
* **Smart Rounding:** Calculations automatically round resulting decimals up to the nearest practical purchasing unit.

## 4. Automated Workflow & Escalation Ladder
1. **Kitchen Submission:** Daily automated reminders trigger ordering tasks. The Kitchen In-Charge selects a vendor and inputs currently available stock before the cutoff deadline.
2. **First Escalation:** If the Kitchen In-Charge misses the cutoff deadline, the task immediately escalates to the Manager.
3. **Manager Commitment:** The Manager reviews recommendations, adjusts if needed, generates a PDF PO, sends it via WhatsApp, and clicks to "Commit" the order.
4. **Final Escalation:** If the Manager's configured duration expires without the PO being committed, a high-priority escalation alert triggers directly to the Owner.

---

# UI WIREFRAMES & DEVELOPER NOTES

## WIREFRAME 1: CREATE NEW ITEM PAGE
```text
+-----------------------------------------------------------------------------------+
| ☰ KALKI POS         [ Items ]   [ Vendors ]   [ Configuration ]   [ User Manual ] |
+-----------------------------------------------------------------------------------+
|  < Back to Items                                      User: Owner | Role: Admin   |
|                                                                                   |
|  ## CREATE NEW ITEM                                                               |
|  Status: [🔘 Active]  [⚪ Inactive]                                               |
| --------------------------------------------------------------------------------- |
|                                                                                   |
|  📌 1. ITEM DETAILS & TRANSLATION                                                 |
|                                                                                   |
|  Item Name (English) *  [                               ]  [ 🌐 Auto-Translate ]  |
|  Item Name (Tamil) *    [                               ]                         |
|  Item Name (Hindi) *    [                               ]                         |
|                                                                                   |
|  💰 2. PRICING & MEASUREMENT                                                      |
|                                                                                   |
|  Current Price *        [ ₹             ]    Max Price *  [ ₹             ]       |
|  Unit of Measure *      [ Select Unit ▼ ]    [ ➕ Add New Unit ]                  |
|                                                                                   |
|  🤝 3. VENDOR MAPPING                                                             |
|                                                                                   |
|  Linked Vendors *       [ 🔍 Search and select vendors...                   ▼ ]   |
|                         [ Kalki Fresh ✕ ] [ Metro Groceries ✕ ]                   |
|                                                                                   |
|  📅 4. INVENTORY RULES & RECURRENCE                                               |
|                                                                                   |
|  Base Min Stock *       [               ] (Required day-to-day minimum)           |
|  Order Frequency *      [✔] Daily     [ ] Mon   [ ] Tue   [ ] Wed   [ ] Thu       |
|                         [ ] Fri       [ ] Sat   [ ] Sun                           |
|                                                                                   |
|  📈 5. DEMAND SURGE MULTIPLIERS (Overrides)                                       |
|                                                                                   |
|  [✔] Friday Night Order Surge:   [ + 25 ] %  (Calculated from Base Min Stock)     |
|  [✔] Saturday Night Order Surge: [ + 30 ] %                                       |
| --------------------------------------------------------------------------------- |
|                           [ ✕ Cancel ]             [ 💾 Save & Create Item ]      |
+-----------------------------------------------------------------------------------+

Key UI/UX Notes for Developer (Items):

Auto-Translate: Typing in the English field and clicking [ 🌐 Auto-Translate ] must call a translation API to instantly fill the Tamil and Hindi fields.

Multi-Select Vendor Box: Must allow tagging multiple vendors to a single item.

+-----------------------------------------------------------------------------------+
| ☰ KALKI POS         [ Items ]   [ Vendors ]   [ Configuration ]   [ User Manual ] |
+-----------------------------------------------------------------------------------+
|  ## SYSTEM CONFIGURATION & AUTOMATION RULES                                       |
| --------------------------------------------------------------------------------- |
|                                                                                   |
|  ⏱️ 1. TIMING & ESCALATION WINDOWS                                                |
|  Kitchen In-Charge Daily Window:  Start: [ 09:00 AM ]   Cutoff: [ 10:30 AM ]      |
|  Manager PO Review Duration:      Time Allowed: [ 1.0 ] Hours                     |
|                                                                                   |
|  🔐 2. ROLE PERMISSIONS MATRIX                                                    |
|  Role               | View Master | Edit Items | Place Orders | Approve POs       |
|  [ Owner ]          |     [✔]     |     [✔]    |      [✔]     |     [✔]           |
|  [ Manager ]        |     [✔]     |     [ ]    |      [✔]     |     [✔]           |
|  [ Kitchen In-Chg ] |     [ ]     |     [ ]    |      [✔]     |     [ ]           |
|                                                                                   |
|  📈 3. SURGE MULTIPLIERS & HOLIDAY CALENDAR                                       |
|  Friday Night Orders:   [ + 25 ] %    Saturday Night Orders: [ + 30 ] %           |
|  High-Demand Holiday Master Calendar:                                             |
|  Select Date: [ 📅 Jan 14, 2026 ▼]    Apply prior evening Surge: [ + 40 ] %       |
| --------------------------------------------------------------------------------- |
|                           [ ✕ Cancel Changes ]       [ 💾 Save Configuration ]    |
+-----------------------------------------------------------------------------------+
Key UI/UX Notes for Developer (Configuration):

Holiday Calendar: Selecting dates directly on this page tells the system to automatically trigger the surge multiplier on the evening prior to the selected date.

Hourly Inputs: The Manager PO Review duration must accept decimal inputs (e.g., 1.0, 0.5, 24).

+-----------------------------------------------------------------------------------+
| ☰ KALKI POS         [ Items ]   [ Vendors ]   [ Configuration ]   [ User Manual ] |
+-----------------------------------------------------------------------------------+
|  ## CREATE / EDIT VENDOR PROFILE                                                  |
| --------------------------------------------------------------------------------- |
|  🏢 1. VENDOR DETAILS & CONTACT                                                   |
|  Vendor Name *          [ Kalki Fresh                   ]                         |
|  WhatsApp Number *      [                               ] 📱 (PO PDFs sent here)  |
|                                                                                   |
|  📦 2. ASSIGN ITEMS (Bidirectional Mapping)                                       |
|  Supplied Items         [ 🔍 Search catalog to assign items to this vendor... ▼ ] |
|                         [ Tomato ✕ ] [ Onion ✕ ] [ Chicken Boneless ✕ ]           |
|                                                                                   |
|  ⏱️ 3. ORDERING RULES & TIMING CONFIGURATION                                      |
|  Requirement Schedule * [✔] Daily     [ ] Mon   [ ] Tue   [ ] Wed   [ ] Thu       |
|  Reminder Time *        [ 09:00 AM 🕒] (Alert sent to Kitchen In-Charge)          |
|  Maximum Allowed Time * [ 10:30 AM 🕒] (Cut-off before Manager Escalation)        |
| --------------------------------------------------------------------------------- |
|                           [ ✕ Cancel ]             [ 💾 Save Vendor Profile ]     |
+-----------------------------------------------------------------------------------+

Key UI/UX Notes for Developer (Vendors):

Bidirectional Item Mapping: Selecting items here must automatically update the respective Item Profiles to include this vendor.

WhatsApp Number: Explicitly required for the PO PDF dispatch workflow.

+-----------------------------------------------------------------------------------+
| ☰ KALKI POS         [ Items ]   [ Vendors ]   [ Configuration ]   [ Orders ]      |
+-----------------------------------------------------------------------------------+
|  ## PURCHASE ORDER REVIEW & DISPATCH                                              |
|  Status: [🟡 PENDING REVIEW]                                                      |
| --------------------------------------------------------------------------------- |
|  🚨 1. ESCALATION & STATUS                                                        |
|  [⚠️ Kitchen In-Charge missed 10:30 AM cutoff. Order auto-generated.]             |
|  ⏳ Time remaining to Commit PO: [ 00:45:12 ] (Escalates to Owner at 0)           |
|                                                                                   |
|  🛒 2. INVENTORY & ORDER QUANTITY REVIEW                                          |
|  Item Name         | In Stock | Min Stock | Surge | Recomm. | Final Order Qty     |
|  ------------------|----------|-----------|-------|---------|-------------------- |
|  Tomato (தக்காளி)  |   5 Kg   |   20 Kg   |  +25% |  20 Kg  | [       20 ] Kg     |
|  Onion (வெங்காயம்)  |   2 Kg   |   25 Kg   |  +25% |  29 Kg  | [       30 ] Kg     |
|                                                                                   |
|  🚀 3. DISPATCH ACTIONS                                                           |
|  Step 1: [ 📄 Generate PDF PO ]                                                   |
|  Step 2: [ 💬 Send via WhatsApp ]                                                 |
|  Step 3: [ ✅ Mark as Committed & Submit ] (Logs PO, moves status to Green)       |
+-----------------------------------------------------------------------------------+
Key UI/UX Notes for Developer (PO Review):

Escalation Timer: Must count down visibly. Reaching zero triggers the Owner alert.

Final Order Qty: Editable text box. The Recomm. calculation is ((Min Stock + Surge) - In Stock), rounded up.

+-----------------------------------------------------------------------------------+
| ☰ KALKI POS                                      User: Kitchen Staff | Role: KIC  |
+-----------------------------------------------------------------------------------+
|  ## DAILY STOCK ENTRY                                                             |
| --------------------------------------------------------------------------------- |
|                                                                                   |
|  Vendor: [ Kalki Fresh ]                 Order Deadline: [ 10:30 AM 🕒]           |
|  Schedule: Daily Fresh                   Time Remaining: [ 01:15:30 ]             |
|                                                                                   |
|  📋 ENTER AVAILABLE STOCK                                                         |
|  (Enter the exact amount currently available in the kitchen)                      |
|                                                                                   |
|  Item Name (Tamil)       | Unit |   Currently In Stock (Available)                |
|  ------------------------|------|-----------------------------------------------  |
|  Tomato (தக்காளி)        |  Kg  |   [       5 ]                                   |
|  Onion (வெங்காயம்)        |  Kg  |   [       2 ]                                   |
|  Chicken Boneless        |  Kg  |   [       0 ]                                   |
|                                                                                   |
| --------------------------------------------------------------------------------- |
|                           [ 💾 Submit Stock to Manager ]                          |
+-----------------------------------------------------------------------------------+

Key UI/UX Notes for Developer (Kitchen In-Charge):

Read-Only Data: The user cannot add new items or see the required math/minimums; they only input what is physically available in the kitchen.

Deadline Lock: If the Time Remaining hits zero, the [ Submit Stock ] button must disable, and the system auto-escalates to the Manager.

