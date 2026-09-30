const fs = require('fs');
const content = `

// ==========================================
// ADVANCES MODULE (Phase 1)
// ==========================================

export const advanceTypeDefinitions = pgTable("advance_type_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").references(() => locations.id),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  calculationBasis: varchar("calculation_basis", { length: 50 }),
  maxCapPercentage: integer("max_cap_percentage"),
  maxCountMonthly: integer("max_count_monthly"),
  maxCountWeekly: integer("max_count_weekly"),
  minTenureDays: integer("min_tenure_days"),
  minNoticeDays: integer("min_notice_days"),
  minCycleDaysWorked: integer("min_cycle_days_worked"),
  holdbackDays: integer("holdback_days"),
  maxRepaymentMonths: integer("max_repayment_months"),
  allowedPaymentModes: varchar("allowed_payment_modes", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeAdvanceRequests = pgTable("employee_advance_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  advanceTypeId: uuid("advance_type_id").notNull().references(() => advanceTypeDefinitions.id),
  requestedAmount: numeric("requested_amount").notNull(),
  approvedAmount: numeric("approved_amount"),
  repaymentMonths: integer("repayment_months"),
  paymentMode: varchar("payment_mode", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),
  repaidAmount: numeric("repaid_amount").default("0"),
  remainingBalance: numeric("remaining_balance").default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const advanceRepaymentSchedules = pgTable("advance_repayment_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => employeeAdvanceRequests.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  expectedDeductionMonth: varchar("expected_deduction_month", { length: 20 }),
  expectedDeductionYear: integer("expected_deduction_year"),
  installmentAmount: numeric("installment_amount").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
`;
fs.appendFileSync('src/db/schema.ts', content);
