# Kalki BOS — Attendance Module Functional & Architectural Specification

**Document ID:** KALKI-SPEC-ATTENDANCE-001
**Version:** 1.0
**Target File Location:** Antigravity Base Root (`docs/specifications/ATTENDANCE_MODULE_SPEC.md`)
**Authority:** Master Baseline Handover v1.0

---

## 1. Executive Summary & Purpose

### 1.1 Why It Exists
Kalki BOS operates across multiple brick-and-mortar retail and hospitality formats (e.g., Kalki Family Restaurant, Kalki Multicuisine Restaurant, Kalki Department Store). These businesses operate across extended operational hours, split shifts, weekend demand surges, and diverse staffing profiles (kitchen, captains, retail floor, cashiers, cleaning staff). A unified, tamper-proof attendance engine is mandatory to eliminate wage disputes, enforce discipline, maintain branch isolation, and prepare flawless inputs for payroll computation.

### 1.2 Core Business Objectives
*   **Seamless Biometric Handshake:** Ingest device punches mapped to an employee’s unique `biometricId` already provisioned in the core people master.
*   **Gradual Connectivity Evolution:** Support manual raw CSV/Excel bulk upload initially, transitioning to automated pull/webhook integration via the central Integration Gateway without altering core attendance models.
*   **Policy Configuration over Hardcoding:** Dynamic rules govern punch windows, grace periods, minimum hours, break deductions, and half-day splits.
*   **Statutory Alignment (Tamil Nadu Retail & Catering):** Automatic tracking and flagging under the *Tamil Nadu Shops and Establishments Act, 1947* and *The Tamil Nadu Catering Establishments Act, 1958*.
*   **Append-Only Auditability:** Raw punch records are immutable. Corrections and regularizations are event-based and tracked via `auditEvents`.

---

## 2. Regulatory & Statutory Alignment (Tamil Nadu Specifics)
Retail stores and catering/restaurant operations in Tamil Nadu have specific statutory guardrails that the system flags as operational warnings or policy violations:

| Parameter | Statutory Baseline (TN Shops / Catering Acts) | Kalki BOS Enforcement Mechanism |
| :--- | :--- | :--- |
| **Standard Daily Cap** | 8 hours per day (48 hours per week) | Standard shift threshold calculation; excess marks overtime eligibility. |
| **Maximum Spread-Over** | Total work span including rest breaks must not exceed **12 hours** | System calculates $MAX(punchOut) - MIN(punchIn)$. Flags operational alert if span $>12\text{ hrs}$. |
| **Continuous Work & Rest** | No employee may work $>5\text{ hours}$ continuously without at least a 30-minute interval (catering) or 1 hour (shops) | Rest break rules deduct configured meal/tea breaks and flag shifts missing intermediate break intervals. |
| **Weekly Holiday** | 1 mandatory paid day off in every 7-day period | Roster engine validates that continuous 7-day schedules trigger a mandatory "Weekly Off" (WO). |
| **Overtime Calculation** | Twice the ordinary wage ($2\times$) | Overtime units are tagged explicitly as statutory OT hours rather than blending into normal base hours. |
| **Night Shift Safeguards** | Specific compliance for women working shifts beyond 7:00 PM / 8:00 PM | Roster scheduling triggers consent/transportation requirement flags for night deployments. |

---

## 3. Sub-Module Breakdown

```text
[Attendance Engine Architecture]
   ├── Sub-Module 1: Shift & Policy Configuration (Rules Engine)
   ├── Sub-Module 2: Biometric Ingestion & Punch Ledger (Raw Layer)
   ├── Sub-Module 3: Daily Reconciliation & Status Derivation (Processing)
   ├── Sub-Module 4: Leave, Regularization & Shift Swap (Exceptions)
   └── Sub-Module 5: Payroll & Task Engine Handshake (Integration)
   └── Sub-Module 6: Dynamic Leave Types & Compensatory Off (Comp-Off) Engine
```

### Sub-Module 1: Shift & Policy Configuration Engine
**Purpose:** Eliminate hardcoded shift times. Provide granular policies per organization, location, or business role.
**Inputs:**
*   `shiftCode` & `shiftName` (e.g., MORN-REST-01, SPLIT-KIT-01, STORE-GEN-01).
*   `locationId` & optional `roleId` assignment.
*   `windowStartTime` and `windowEndTime` (supports cross-midnight/overnight shifts).
*   `minPunchInTime` (earliest accepted check-in) & `maxPunchInTime` (cut-off after which punch requires regularization).
*   `gracePeriodMinutes` (e.g., 15 minutes permissible delay before marking tardy).
*   `minHoursHalfDay` (e.g., 4.0 hours) & `minHoursFullDay` (e.g., 8.0 hours).
*   `restBreakPolicy`: Fixed Deduct vs. Punch-Based.
**Processing Logic:**
1.  Validate shift boundaries ensuring no overlapping logic for the same employee roster.
2.  Evaluate shift schedules against Tamil Nadu spread-over limits ($\le 12\text{ hours}$).
3.  Version shift policies: historical attendance records reference the policy version active on the date worked to preserve historical integrity.

### Sub-Module 2: Biometric Ingestion & Punch Ledger (Raw Layer)
**Purpose:** Act as the immutable ledger for all physical check-in and check-out events. No punch is ever deleted or updated.
**Inputs:**
*   **Phase 1 (File Import):** Biometric device export file (Excel `.xlsx` / CSV).
*   **Phase 2 (Direct Integration Gateway):** REST Webhook / TCP Push from physical biometric terminals.
**Processing Logic:**
1.  **Deduplication:** Hash raw record (`biometricUserId`, `punchTimestamp`, `machineId`) to ensure idempotent insertion.
2.  **Employee Mapping:** Lookup `employees` table using `biometricId` scoped to the current `organizationId`/`locationId`. Unmapped records go to quarantine.
3.  **Ingestion Logging:** Append to immutable `rawBiometricPunches` table.

### Sub-Module 3: Daily Attendance Processing & Status Derivation
**Purpose:** Translate raw punch logs and assigned rosters into normalized daily attendance states feeding into payroll.
**Processing Logic:**
1.  **Pairing Punches:** Determine the valid first IN punch and the valid last OUT punch within the allocated shift window.
2.  **Net Work Duration:** Subtract applicable meal/rest deductions from Gross Duration.
3.  **Status Assignment:** Assigns statuses (PRESENT, PRESENT_LATE, HALF_DAY, ABSENT, MISSED_PUNCH, ON_LEAVE, UNAUTHORIZED_ABSENCE) based on thresholds.
4.  **Overtime Derivation:** Calculated if Net Duration exceeds daily limits with manager pre-approval.

### Sub-Module 4: Leave, Regularization & Exceptions
**Purpose:** Provide a secure, audited workflow for correcting anomalies and managing planned leaves.
**Processing Logic:**
1.  **Multi-level Authorization:** Submissions route to Branch Manager/Delegate via RBAC.
2.  **Database Dry-Run Safety:** Manager overrides trigger a dry-run preview displaying old status vs. new status before commit.
3.  **Audit Event Dispatch:** Updates write an append-only entry to `auditEvents`.

### Sub-Module 5: Integration Handshakes
*   **Work Engine:** First IN punch dispatches `ATTENDANCE_CHECK_IN_CONFIRMED`, automatically spawning routine `workInstances` (e.g., "Morning Register Count").
*   **Payroll:** Prepares a closed attendance ledger aggregating Payable Days, LOP Days, and Overtime Hours, linking to configurable salary-hold policies.

### Sub-Module 6: Dynamic Leave Types & Compensatory Off (Comp-Off) Engine
*   **Dynamic Configuration:** Leave types (CL, SL, EL/PL, LOP) configured at Org/Location level. Rules cover accrual, carry-forward, sandwich rules, advance notice, and evidence requirements.
*   **Comp-Off Engine:** If a valid `PRESENT` state is detected on a scheduled `WEEKLY_OFF` or `HOLIDAY`, the system accrues Comp-Off balances (1.0 Day for Full, 0.5 Day for Half) automatically.
*   **Workflow:** Employee applies $\to$ Manager views Dry-Run impact (staffing levels, balances) $\to$ Approval updates `employeeLeaveBalances` and `auditEvents`.

---

## 4. Drizzle ORM Schema Blueprint (src/db/schema.ts)

```typescript
import { pgTable, uuid, varchar, text, boolean, integer, decimal, timestamp, time, date, jsonb } from "drizzle-orm/pg-core";
import { organizations, locations, employees, authUsers } from "./schema"; 

// 1. Dynamic Shift Definitions
export const shiftDefinitions = pgTable("shift_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").references(() => locations.id), 
  shiftCode: varchar("shift_code", { length: 50 }).notNull(),
  shiftName: varchar("shift_name", { length: 100 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  minPunchInTime: time("min_punch_in_time"),
  maxPunchInTime: time("max_punch_in_time"),
  gracePeriodMinutes: integer("grace_period_minutes").default(15).notNull(),
  minHoursHalfDay: decimal("min_hours_half_day", { precision: 4, scale: 2 }).default("4.00").notNull(),
  minHoursFullDay: decimal("min_hours_full_day", { precision: 4, scale: 2 }).default("8.00").notNull(),
  restBreakMinutes: integer("rest_break_minutes").default(60).notNull(),
  isCrossMidnight: boolean("is_cross_midnight").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Biometric Import Batches
export const biometricImportBatches = pgTable("biometric_import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  uploadedBy: uuid("uploaded_by").notNull().references(() => authUsers.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  totalRows: integer("total_rows").notNull(),
  successfulRows: integer("successful_rows").notNull(),
  failedRows: integer("failed_rows").notNull(),
  errors: jsonb("errors"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Raw Biometric Punches
export const rawBiometricPunches = pgTable("raw_biometric_punches", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  biometricId: varchar("biometric_id", { length: 100 }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id),
  punchTimestamp: timestamp("punch_timestamp", { withTimezone: true }).notNull(),
  punchType: varchar("punch_type", { length: 20 }).default("UNKNOWN").notNull(), 
  machineId: varchar("machine_id", { length: 100 }).notNull(),
  sourceType: varchar("source_type", { length: 50 }).default("EXCEL_IMPORT").notNull(),
  importBatchId: uuid("import_batch_id").references(() => biometricImportBatches.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Daily Attendance Summaries
export const attendanceSummaries = pgTable("attendance_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  attendanceDate: date("attendance_date").notNull(),
  shiftDefinitionId: uuid("shift_definition_id").references(() => shiftDefinitions.id),
  firstPunchIn: timestamp("first_punch_in", { withTimezone: true }),
  lastPunchOut: timestamp("last_punch_out", { withTimezone: true }),
  grossHours: decimal("gross_hours", { precision: 5, scale: 2 }).default("0.00").notNull(),
  breakMinutes: integer("break_minutes").default(0).notNull(),
  netHours: decimal("net_hours", { precision: 5, scale: 2 }).default("0.00").notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0.00").notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  isRegularized: boolean("is_regularized").default(false).notNull(),
  regularizationReason: text("regularization_reason"),
  regularizedBy: uuid("regularized_by").references(() => authUsers.id),
  regularizedAt: timestamp("regularized_at", { withTimezone: true }),
  spreadOverExceeded: boolean("spread_over_exceeded").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Dynamic Leave Types
export const leaveTypes = pgTable("leave_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").references(() => locations.id),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isPaid: boolean("is_paid").default(true).notNull(),
  allowHalfDay: boolean("allow_half_day").default(true).notNull(),
  requiresEvidence: boolean("requires_evidence").default(false).notNull(),
  minNoticeDays: integer("min_notice_days").default(0).notNull(),
  maxConsecutiveDays: integer("max_consecutive_days"),
  sandwichRuleEnabled: boolean("sandwich_rule_enabled").default(false).notNull(),
  annualAllocation: decimal("annual_allocation", { precision: 5, scale: 2 }).default("0.00").notNull(),
  maxCarryForwardDays: decimal("max_carry_forward_days", { precision: 5, scale: 2 }).default("0.00").notNull(),
  isEncashable: boolean("is_encashable").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Employee Leave Balances Ledger
export const employeeLeaveBalances = pgTable("employee_leave_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id),
  year: integer("year").notNull(),
  openingBalance: decimal("opening_balance", { precision: 5, scale: 2 }).default("0.00").notNull(),
  accrued: decimal("accrued", { precision: 5, scale: 2 }).default("0.00").notNull(),
  consumed: decimal("consumed", { precision: 5, scale: 2 }).default("0.00").notNull(),
  adjusted: decimal("adjusted", { precision: 5, scale: 2 }).default("0.00").notNull(),
  closingBalance: decimal("closing_balance", { precision: 5, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Leave Requests
export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: decimal("total_days", { precision: 4, scale: 2 }).notNull(),
  isHalfDay: boolean("is_half_day").default(false).notNull(),
  halfDaySession: varchar("half_day_session", { length: 20 }),
  reason: text("reason").notNull(),
  evidenceUrl: text("evidence_url"),
  status: varchar("status", { length: 30 }).default("PENDING").notNull(),
  actionedBy: uuid("actioned_by").references(() => authUsers.id),
  actionedAt: timestamp("actioned_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

## 5. Security, Input Validation & Verification Gates
1.  **Zod Parsing Rules:** Every punch batch upload strictly parses data rows for string formats, valid ISO date-time boundaries, and sanitization against empty rows.
2.  **Server-Side Tenant Enclosure:** All operations force `where(and(eq(table.organizationId, session.orgId), eq(table.locationId, session.locId)))` to maintain branch isolation.
3.  **Dry-Run Confirmation Workflow:** Any manual reconciliation triggers a dry-run diff. Explicit confirmation sends an authorized Server Action, permanently appending the before-and-after state to the `auditEvents` table.