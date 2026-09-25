const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'src/db/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf8');

const newTables = `

// ============================================================================
// PAYROLL RUNS & PAYSLIPS
// ============================================================================

export const salaryAdvances = pgTable("salary_advances", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  amount: numeric("amount").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),
  dateGiven: timestamp("date_given", { withTimezone: true }),
  repaymentMethod: varchar("repayment_method", { length: 50 }).default("DEDUCT_FROM_PAYROLL"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollRuns = pgTable("payroll_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  runDate: timestamp("run_date", { withTimezone: true }).notNull().defaultNow(),
  status: varchar("status", { length: 50 }).notNull().default("DRAFT"),
  totalGrossAmount: numeric("total_gross_amount").notNull().default('0'),
  totalDeductions: numeric("total_deductions").notNull().default('0'),
  totalNetAmount: numeric("total_net_amount").notNull().default('0'),
  processedByUserId: uuid("processed_by_user_id").notNull().references(() => authUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payslips = pgTable("payslips", {
  id: uuid("id").defaultRandom().primaryKey(),
  payrollRunId: uuid("payroll_run_id").notNull().references(() => payrollRuns.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  totalPresentDays: numeric("total_present_days").notNull().default('0'),
  totalAbsentDays: numeric("total_absent_days").notNull().default('0'),
  grossAmount: numeric("gross_amount").notNull().default('0'),
  deductionsAmount: numeric("deductions_amount").notNull().default('0'),
  netAmount: numeric("net_amount").notNull().default('0'),
  status: varchar("status", { length: 50 }).notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salaryAdvanceRepayments = pgTable("salary_advance_repayments", {
  id: uuid("id").defaultRandom().primaryKey(),
  advanceId: uuid("advance_id").notNull().references(() => salaryAdvances.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  payslipId: uuid("payslip_id").references(() => payslips.id),
  repaymentDate: timestamp("repayment_date", { withTimezone: true }).notNull().defaultNow(),
  method: varchar("method", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payslipComponents = pgTable("payslip_components", {
  id: uuid("id").defaultRandom().primaryKey(),
  payslipId: uuid("payslip_id").notNull().references(() => payslips.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").references(() => salaryComponents.id),
  componentName: varchar("component_name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // EARNING, DEDUCTION
  amount: numeric("amount").notNull(),
});

`;

content += newTables;

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Appended payroll tables to schema.ts');
