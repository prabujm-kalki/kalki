import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
  time,
  decimal,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("organizations_code_unique").on(table.code),
    index("organizations_active_idx").on(table.isActive),
  ],
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("locations_organization_code_unique").on(
      table.organizationId,
      table.code,
    ),
    unique("locations_organization_id_unique").on(
      table.organizationId,
      table.id,
    ),
    index("locations_organization_idx").on(table.organizationId),
    index("locations_active_idx").on(table.isActive),
  ],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("departments_organization_code_unique").on(
      table.organizationId,
      table.code,
    ),
    index("departments_organization_idx").on(table.organizationId),
    index("departments_active_idx").on(table.isActive),
  ],
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    displayName: text("display_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    dateOfBirth: date("date_of_birth"),
    isActive: boolean("is_active").notNull().default(true),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("people_phone_idx").on(table.phone),
    index("people_email_idx").on(table.email),
    index("people_active_idx").on(table.isActive),
  ],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "set null" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    departmentId: uuid("department_id")
      .references(() => departments.id),
    employeeCode: text("employee_code").notNull(),
    jobTitle: text("job_title"),
    employmentStartDate: date("employment_start_date").notNull(),
    employmentEndDate: date("employment_end_date"),
    status: text("status", { enum: ["DRAFT", "ACTIVE", "INACTIVE", "EXITED"] }).notNull().default("DRAFT"),
    category: text("category", { enum: ["Permanent", "Temporary", "Part-time"] }),
    reportingEmployeeId: uuid("reporting_employee_id"),
    secondaryMobile: text("secondary_mobile"),
    gender: text("gender", { enum: ["Male", "Female", "Other"] }),
    residentialAddress: text("residential_address"),
    bloodGroup: text("blood_group", { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }),
    maritalStatus: text("marital_status", { enum: ["Single", "Married", "Divorced", "Widowed"] }),
    aadhaarDocumentUrl: text("aadhaar_document_url"),
    photoUrl: text("photo_url"),
    otherDocument1Url: text("other_document_1_url"),
    otherDocument2Url: text("other_document_2_url"),
    otherDocument3Url: text("other_document_3_url"),
    biometricId: text("biometric_id"),
    posId: text("pos_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("employees_organization_code_unique").on(
      table.organizationId,
      table.employeeCode,
    ),
    unique("employees_organization_id_unique").on(
      table.organizationId,
      table.id,
    ),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
      name: "employees_organization_location_fk",
    }),
    foreignKey({
      columns: [table.organizationId, table.reportingEmployeeId],
      foreignColumns: [table.organizationId, table.id],
      name: "employees_organization_reporting_employee_fk",
    }),
    check(
      "employees_employment_dates_check",
      sql`employment_end_date IS NULL OR employment_end_date >= employment_start_date`,
    ),
    check(
      "employees_no_self_reporting_check",
      sql`id != reporting_employee_id`,
    ),
    index("employees_person_idx").on(table.personId),
    index("employees_organization_idx").on(table.organizationId),
    index("employees_location_idx").on(table.locationId),
    index("employees_active_idx").on(table.isActive),
  ],
);

export const employeeFamilyContacts = pgTable("employee_family_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  category: text("category", { enum: ["SPOUSE", "CHILD", "PARENT", "EMERGENCY_CONTACT"] }).notNull(),
  name: text("name"),
  mobile: text("mobile"),
  relationship: text("relationship"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("contact_spouse_check", sql`${table.category} != 'SPOUSE' OR (${table.name} IS NOT NULL AND ${table.mobile} IS NOT NULL)`),
  check("contact_child_check", sql`${table.category} != 'CHILD' OR (${table.name} IS NOT NULL)`),
  check("contact_parent_check", sql`${table.category} != 'PARENT' OR (${table.fatherName} IS NOT NULL AND ${table.motherName} IS NOT NULL)`),
  check("contact_emergency_check", sql`${table.category} != 'EMERGENCY_CONTACT' OR (${table.name} IS NOT NULL AND ${table.relationship} IS NOT NULL AND ${table.mobile} IS NOT NULL)`),
  index("employee_family_contacts_employee_idx").on(table.employeeId),
]);

export const employeeSalaryInfo = pgTable("employee_salary_info", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  salaryType: text("salary_type", { enum: ["Daily", "Weekly", "Monthly"] }).notNull(),
  amount: numeric("amount").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  paymentMethod: text("payment_method", { enum: ["BANK_TRANSFER", "GPAY", "CASH"] }).notNull(),
  accountHolderName: text("account_holder_name"),
  accountNumber: text("account_number"),
  bankName: text("bank_name"),
  ifscCode: text("ifsc_code"),
  gpayNumber: text("gpay_number"),
  bankingName: text("banking_name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("salary_payment_bank_check", sql`${table.paymentMethod} != 'BANK_TRANSFER' OR (${table.accountHolderName} IS NOT NULL AND ${table.accountNumber} IS NOT NULL AND ${table.bankName} IS NOT NULL AND ${table.ifscCode} IS NOT NULL)`),
  check("salary_payment_gpay_check", sql`${table.paymentMethod} != 'GPAY' OR (${table.gpayNumber} IS NOT NULL AND ${table.bankingName} IS NOT NULL)`),
  index("employee_salary_info_employee_idx").on(table.employeeId),
]);

export const employeeChangeRequests = pgTable("employee_change_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  proposerUserId: text("proposer_user_id").notNull().references(() => authUsers.id),
  reviewerUserId: text("reviewer_user_id").references(() => authUsers.id),
  status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).notNull().default("PENDING"),
  proposedPayload: jsonb("proposed_payload").notNull(),
  reason: text("reason"),
  reviewComment: text("review_comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("employee_change_requests_employee_idx").on(table.employeeId),
  index("employee_change_requests_status_idx").on(table.status),
]);

export const employeeHistoryRole = pgTable("employee_history_role", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => businessRoles.id),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  recordedBy: uuid("recorded_by").references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeHistoryBranch = pgTable("employee_history_branch", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  recordedBy: uuid("recorded_by").references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeHistorySalary = pgTable("employee_history_salary", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  salaryType: text("salary_type", { enum: ["Daily", "Weekly", "Monthly"] }).notNull(),
  amount: numeric("amount").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  recordedBy: uuid("recorded_by").references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeHistoryReporting = pgTable("employee_history_reporting", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  reportingEmployeeId: uuid("reporting_employee_id").references(() => employees.id),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  recordedBy: uuid("recorded_by").references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeHistoryCategory = pgTable("employee_history_category", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  category: text("category", { enum: ["Permanent", "Temporary", "Part-time"] }).notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  recordedBy: uuid("recorded_by").references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeHistoryStatus = pgTable("employee_history_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["DRAFT", "ACTIVE", "INACTIVE", "EXITED"] }).notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  recordedBy: uuid("recorded_by").references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authUsers = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const authSessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
});

export const authAccounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  issuer: text("issuer"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const authVerifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("organization_memberships_user_org_unique").on(
      table.userId,
      table.organizationId,
    ),
    index("organization_memberships_org_idx").on(table.organizationId),
  ],
);

export const locationMemberships = pgTable(
  "location_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    locationId: uuid("location_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("location_memberships_user_location_unique").on(
      table.userId,
      table.locationId,
    ),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
      name: "location_memberships_organization_location_fk",
    }),
    index("location_memberships_org_idx").on(table.organizationId),
    index("location_memberships_location_idx").on(table.locationId),
  ],
);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemModules = [
  "inventory",
  "purchase",
  "sales",
  "finance",
  "hr",
  "settings",
  "system",
] as const;

export const systemActions = [
  "read",
  "create",
  "update",
  "delete",
  "approve",
] as const;

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const organizationRoleAssignments = pgTable(
  "organization_role_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("organization_role_assignments_unique").on(
      table.userId,
      table.organizationId,
      table.roleId,
    ),
  ],
);

export const locationRoleAssignments = pgTable(
  "location_role_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    locationId: uuid("location_id").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("location_role_assignments_unique").on(
      table.userId,
      table.locationId,
      table.roleId,
    ),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
      name: "location_role_assignments_organization_location_fk",
    }),
  ],
);

export const systemAuthorities = pgTable("system_authorities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  authority: text("authority").notNull().default("OWNER").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check(
    "system_authorities_owner_only_check",
    sql`${table.authority} = 'OWNER'`,
  ),
]);

// Business roles describe expected work and remain separate from authorization
// roles, which grant application permissions.
export const businessRoles = pgTable(
  "business_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    departmentId: uuid("department_id").references(() => departments.id),
    // Self-referential reporting line
    // Use string type in drizzle if self-reference causes typescript issues, but any type works here for now.
    reportsToRoleId: uuid("reports_to_role_id"),
    identifier: text("identifier").notNull(),
    name: text("name").notNull(),
    purpose: text("purpose").notNull(),
    authorityConfig: jsonb("authority_config").notNull().default({}),
    baselineConfig: jsonb("baseline_config").notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("business_roles_organization_identifier_unique").on(table.organizationId, table.identifier),
    unique("business_roles_organization_name_unique").on(table.organizationId, table.name),
    unique("business_roles_organization_id_unique").on(table.organizationId, table.id),
    index("business_roles_organization_active_idx").on(table.organizationId, table.isActive),
  ],
);

export const roleKpiDefinitions = pgTable("role_kpi_definitions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), roleId: uuid("role_id").notNull(), name: text("name").notNull(), description: text("description").notNull(), configuration: jsonb("configuration").notNull().default({}), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.roleId], foreignColumns: [businessRoles.organizationId, businessRoles.id], name: "role_kpi_definitions_organization_role_fk" }),
  unique("role_kpi_definitions_role_name_unique").on(table.roleId, table.name), index("role_kpi_definitions_organization_role_idx").on(table.organizationId, table.roleId),
]);

export const roleChecklists = pgTable("role_checklists", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), roleId: uuid("role_id").notNull(), name: text("name").notNull(), description: text("description"), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.roleId], foreignColumns: [businessRoles.organizationId, businessRoles.id], name: "role_checklists_organization_role_fk" }),
  unique("role_checklists_role_name_unique").on(table.roleId, table.name), unique("role_checklists_organization_id_unique").on(table.organizationId, table.id), index("role_checklists_organization_role_idx").on(table.organizationId, table.roleId),
]);

export const roleChecklistItems = pgTable("role_checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), checklistId: uuid("checklist_id").notNull(), definition: text("definition").notNull(), position: integer("position").notNull(), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.checklistId], foreignColumns: [roleChecklists.organizationId, roleChecklists.id], name: "role_checklist_items_organization_checklist_fk" }),
  unique("role_checklist_items_checklist_position_unique").on(table.checklistId, table.position), index("role_checklist_items_organization_checklist_idx").on(table.organizationId, table.checklistId),
]);

export const employeeRoleAssignments = pgTable("employee_role_assignments", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), employeeId: uuid("employee_id").notNull(), roleId: uuid("role_id").notNull(), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.employeeId], foreignColumns: [employees.organizationId, employees.id], name: "employee_role_assignments_organization_employee_fk" }), foreignKey({ columns: [table.organizationId, table.roleId], foreignColumns: [businessRoles.organizationId, businessRoles.id], name: "employee_role_assignments_organization_role_fk" }), unique("employee_role_assignments_employee_role_unique").on(table.employeeId, table.roleId), index("employee_role_assignments_organization_employee_active_idx").on(table.organizationId, table.employeeId, table.isActive),
]);

export const employeeResponsibilityAdditions = pgTable("employee_responsibility_additions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), employeeId: uuid("employee_id").notNull(), responsibility: text("responsibility").notNull(), actualWork: text("actual_work").notNull(), position: integer("position").notNull(), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.employeeId], foreignColumns: [employees.organizationId, employees.id], name: "employee_responsibility_additions_organization_employee_fk" }), unique("employee_responsibility_additions_employee_position_unique").on(table.employeeId, table.position), index("employee_responsibility_additions_organization_employee_idx").on(table.organizationId, table.employeeId),
]);

export const workSituationTriggerCategories = [
  "routine",
  "event-based",
  "item/order-triggered",
] as const;

export const workSituationReminderEscalationStageIdentifiers = [
  "due_notification",
  "reminder",
  "strong_reminder",
  "final_reminder",
  "escalation",
  "verification",
  "exception_escalation",
] as const;

export const workSituationDefinitions = pgTable("work_situation_definitions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id), triggerCategory: text("trigger_category").notNull(), title: text("title").notNull(), description: text("description").notNull(), severity: text("severity"), verificationConfig: jsonb("verification_config").notNull().default({}), evidenceConfig: jsonb("evidence_config").notNull().default({}), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("work_situation_definitions_organization_id_unique").on(table.organizationId, table.id),
  index("work_situation_definitions_organization_active_idx").on(table.organizationId, table.isActive),
  index("work_situation_definitions_organization_trigger_idx").on(table.organizationId, table.triggerCategory),
  check(
    "work_situation_definitions_trigger_category_check",
    sql`${table.triggerCategory} IN ('routine', 'event-based', 'item/order-triggered')`,
  ),
]);

export const roleResponsibilities = pgTable("role_responsibilities", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), roleId: uuid("role_id").notNull(), responsibility: text("responsibility").notNull(), actualWork: text("actual_work").notNull(), position: integer("position").notNull(), workSituationDefinitionId: uuid("work_situation_definition_id"), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.roleId], foreignColumns: [businessRoles.organizationId, businessRoles.id], name: "role_responsibilities_organization_role_fk" }),
  foreignKey({ columns: [table.organizationId, table.workSituationDefinitionId], foreignColumns: [workSituationDefinitions.organizationId, workSituationDefinitions.id], name: "role_responsibilities_organization_work_definition_fk" }),
  unique("role_responsibilities_role_position_unique").on(table.roleId, table.position),
  index("role_responsibilities_organization_role_idx").on(table.organizationId, table.roleId),
  index("role_responsibilities_organization_work_definition_idx").on(table.organizationId, table.workSituationDefinitionId),
]);

export const workSituationEvidenceRequirements = pgTable("work_situation_evidence_requirements", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), workSituationDefinitionId: uuid("work_situation_definition_id").notNull(), isRequired: boolean("is_required").notNull().default(false), metadata: jsonb("metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [ foreignKey({ columns: [table.organizationId, table.workSituationDefinitionId], foreignColumns: [workSituationDefinitions.organizationId, workSituationDefinitions.id], name: "work_situation_evidence_requirements_organization_definition_fk" }), unique("work_situation_evidence_requirements_definition_unique").on(table.workSituationDefinitionId) ]);

export const workSituationReminderEscalationStages = pgTable("work_situation_reminder_escalation_stages", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), workSituationDefinitionId: uuid("work_situation_definition_id").notNull(), stage: text("stage").notNull(), position: integer("position").notNull(), configuration: jsonb("configuration").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.workSituationDefinitionId], foreignColumns: [workSituationDefinitions.organizationId, workSituationDefinitions.id], name: "work_situation_reminder_escalation_stages_organization_definition_fk" }),
  unique("work_situation_reminder_escalation_stages_definition_position_unique").on(table.workSituationDefinitionId, table.position),
  unique("work_situation_reminder_escalation_stages_definition_stage_unique").on(table.workSituationDefinitionId, table.stage),
  index("work_situation_reminder_escalation_stages_organization_definition_idx").on(table.organizationId, table.workSituationDefinitionId),
  check(
    "work_situation_reminder_escalation_stages_stage_check",
    sql`${table.stage} IN ('due_notification', 'reminder', 'strong_reminder', 'final_reminder', 'escalation', 'verification', 'exception_escalation')`,
  ),
]);

export const workInstances = pgTable("work_instances", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), workSituationDefinitionId: uuid("work_situation_definition_id").notNull(), locationId: uuid("location_id"), assignedEmployeeId: uuid("assigned_employee_id"), sourceReference: text("source_reference"), sourceMetadata: jsonb("source_metadata").notNull().default({}), definitionSnapshot: jsonb("definition_snapshot").notNull().default({}), state: text("state").notNull().default("SEEN"), verificationConfig: jsonb("verification_config").notNull().default({}), metadata: jsonb("metadata").notNull().default({}), dueAt: timestamp("due_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("work_instances_organization_id_unique").on(table.organizationId, table.id),
  unique("work_instances_organization_definition_source_unique").on(table.organizationId, table.workSituationDefinitionId, table.sourceReference),
  foreignKey({ columns: [table.organizationId, table.workSituationDefinitionId], foreignColumns: [workSituationDefinitions.organizationId, workSituationDefinitions.id], name: "work_instances_organization_definition_fk" }), foreignKey({ columns: [table.organizationId, table.locationId], foreignColumns: [locations.organizationId, locations.id], name: "work_instances_organization_location_fk" }), foreignKey({ columns: [table.organizationId, table.assignedEmployeeId], foreignColumns: [employees.organizationId, employees.id], name: "work_instances_organization_assigned_employee_fk" }), check("work_instances_state_check", sql`${table.state} IN ('SEEN', 'ACKNOWLEDGED', 'COMPLETED', 'VERIFIED')`), index("work_instances_organization_state_idx").on(table.organizationId, table.state), index("work_instances_assigned_employee_state_idx").on(table.assignedEmployeeId, table.state), index("work_instances_definition_idx").on(table.workSituationDefinitionId), index("work_instances_organization_due_idx").on(table.organizationId, table.dueAt),
]);

export const workInstanceEvidencePresences = pgTable("work_instance_evidence_presences", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  workInstanceId: uuid("work_instance_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.workInstanceId],
    foreignColumns: [workInstances.organizationId, workInstances.id],
    name: "work_instance_evidence_presences_organization_instance_fk",
  }),
  unique("work_instance_evidence_presences_instance_unique").on(table.workInstanceId),
  unique("work_instance_evidence_presences_organization_id_unique").on(table.organizationId, table.id),
  index("work_instance_evidence_presences_organization_instance_idx").on(table.organizationId, table.workInstanceId),
]);

export const workInstanceVerificationPresences = pgTable("work_instance_verification_presences", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  workInstanceId: uuid("work_instance_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.workInstanceId],
    foreignColumns: [workInstances.organizationId, workInstances.id],
    name: "work_instance_verification_presences_organization_instance_fk",
  }),
  unique("work_instance_verification_presences_instance_unique").on(table.workInstanceId),
  unique("work_instance_verification_presences_organization_id_unique").on(table.organizationId, table.id),
  index("work_instance_verification_presences_organization_instance_idx").on(table.organizationId, table.workInstanceId),
]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id"),
  actorUserId: text("actor_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "audit_events_organization_location_fk",
  }),
  index("audit_events_organization_created_idx").on(table.organizationId, table.createdAt),
  index("audit_events_organization_entity_idx").on(table.organizationId, table.entityType, table.entityId),
  index("audit_events_organization_actor_idx").on(table.organizationId, table.actorUserId),
  index("audit_events_organization_event_type_idx").on(table.organizationId, table.eventType),
]);

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  nameEn: text("name_en").notNull(),
  nameTa: text("name_ta").notNull(),
  nameHi: text("name_hi").notNull(),
  currentPrice: numeric("current_price").notNull(),
  maxPrice: numeric("max_price").notNull(),
  unit: text("unit").notNull(),
  baseMinStock: numeric("base_min_stock").notNull(),
  orderFrequency: jsonb("order_frequency").notNull().default({}),
  fridaySurge: numeric("friday_surge").default('0'),
  saturdaySurge: numeric("saturday_surge").default('0'),
  moq: numeric("moq"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "items_organization_location_fk",
  }),
  index("items_organization_location_idx").on(table.organizationId, table.locationId),
]);

export const vendors = pgTable("vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  name: text("name").notNull(),
  contactDetails: jsonb("contact_details").notNull().default({}),
  paymentTerms: text("payment_terms"),
  creditDays: integer("credit_days"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "vendors_organization_location_fk",
  }),
  index("vendors_organization_location_idx").on(table.organizationId, table.locationId),
]);

export const vendorItems = pgTable("vendor_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  itemId: uuid("item_id").references(() => items.id),
  itemName: text("item_name").notNull(),
  itemCode: text("item_code"),
  unitOfMeasure: text("unit_of_measure").notNull(),
  normalQuantity: numeric("normal_quantity"),
  minimumStock: numeric("minimum_stock"),
  lastRate: numeric("last_rate"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "vendor_items_organization_location_fk",
  }),
  index("vendor_items_organization_location_idx").on(table.organizationId, table.locationId),
  index("vendor_items_vendor_idx").on(table.vendorId),
  index("vendor_items_item_idx").on(table.itemId),
]);

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  status: text("status").notNull().default('draft'),
  totalAmount: numeric("total_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "purchase_orders_organization_location_fk",
  }),
  index("purchase_orders_organization_location_idx").on(table.organizationId, table.locationId),
]);

export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  poId: uuid("po_id").notNull().references(() => purchaseOrders.id),
  itemId: uuid("item_id").notNull().references(() => items.id),
  orderedQuantity: numeric("ordered_quantity").notNull(),
  unitRate: numeric("unit_rate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseSchedules = pgTable("purchase_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  responsibleRoleId: uuid("responsible_role_id").notNull().references(() => businessRoles.id),
  frequencyRule: text("frequency_rule").notNull(),
  reminderTime: text("reminder_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "purchase_schedules_organization_location_fk",
  }),
  index("purchase_schedules_organization_location_idx").on(table.organizationId, table.locationId),
]);

export const inventoryEventTypes = ["OPENING", "RECEIPT", "CONSUMPTION", "WASTE", "TRANSFER_OUT", "TRANSFER_IN", "ADJUSTMENT"] as const;

export const inventoryLedger = pgTable("inventory_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  vendorItemId: uuid("vendor_item_id").notNull().references(() => vendorItems.id),
  eventType: text("event_type", { enum: inventoryEventTypes }).notNull(),
  quantityChange: numeric("quantity_change").notNull(),
  balanceAfter: numeric("balance_after").notNull(),
  referenceId: uuid("reference_id"),
  notes: text("notes"),
  recordedBy: uuid("recorded_by").notNull().references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "inventory_ledger_organization_location_fk",
  }),
  index("inventory_ledger_organization_location_idx").on(table.organizationId, table.locationId),
  index("inventory_ledger_item_idx").on(table.vendorItemId),
]);

export const supplierInvoices = pgTable("supplier_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status", { enum: ["DRAFT", "APPROVED", "PARTIAL", "PAID"] }).notNull().default("DRAFT"),
  recordedBy: uuid("recorded_by").notNull().references(() => employees.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "supplier_invoices_organization_location_fk",
  }),
  unique("supplier_invoices_vendor_invoice_unique").on(table.vendorId, table.invoiceNumber),
  index("supplier_invoices_vendor_idx").on(table.vendorId),
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  amount: numeric("amount").notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMode: text("payment_mode", { enum: ["CASH", "BANK_TRANSFER", "CHEQUE", "UPI"] }).notNull(),
  referenceDetails: text("reference_details"),
  recordedBy: uuid("recorded_by").notNull().references(() => employees.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "payments_organization_location_fk",
  }),
  index("payments_vendor_idx").on(table.vendorId),
]);

export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  invoiceId: uuid("invoice_id").notNull().references(() => supplierInvoices.id),
  amountAllocated: numeric("amount_allocated").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("payment_allocations_payment_invoice_unique").on(table.paymentId, table.invoiceId),
  index("payment_allocations_invoice_idx").on(table.invoiceId),
]);

export const vendorLedgerEventTypes = ["INVOICE", "PAYMENT", "REVERSAL", "ADJUSTMENT"] as const;

export const vendorLedger = pgTable("vendor_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  eventType: text("event_type", { enum: vendorLedgerEventTypes }).notNull(),
  amountChange: numeric("amount_change").notNull(),
  balanceAfter: numeric("balance_after").notNull(),
  referenceId: uuid("reference_id"),
  notes: text("notes"),
  recordedBy: uuid("recorded_by").notNull().references(() => employees.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "vendor_ledger_organization_location_fk",
  }),
  index("vendor_ledger_vendor_idx").on(table.vendorId),
]);

export const salesImportBatches = pgTable("sales_import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  sourceSystem: text("source_system").notNull(),
  importTimestamp: timestamp("import_timestamp", { withTimezone: true }).notNull().defaultNow(),
  operatingDate: date("operating_date"),
  status: text("status", { enum: ["PENDING", "VALIDATED", "RECONCILED", "FAILED"] }).notNull().default("PENDING"),
  recordedBy: uuid("recorded_by").notNull().references(() => employees.id),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "sales_import_batches_organization_location_fk",
  }),
  index("sales_import_batches_location_idx").on(table.locationId),
]);

export const salesTransactions = pgTable("sales_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  batchId: uuid("batch_id").notNull().references(() => salesImportBatches.id),
  sourceSystem: text("source_system").notNull(),
  sourceBillId: text("source_bill_id").notNull(),
  billTimestamp: timestamp("bill_timestamp", { withTimezone: true }),
  customerName: text("customer_name"),
  customerContact: text("customer_contact"),
  captainName: text("captain_name"),
  orderType: text("order_type"),
  grossAmount: numeric("gross_amount").notNull().default("0"),
  discountAmount: numeric("discount_amount").notNull().default("0"),
  taxAmount: numeric("tax_amount").notNull().default("0"),
  otherCharges: numeric("other_charges").notNull().default("0"),
  netAmount: numeric("net_amount").notNull().default("0"),
  paymentMethod: text("payment_method"),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "sales_transactions_organization_location_fk",
  }),
  unique("sales_transactions_source_bill_unique").on(table.locationId, table.sourceSystem, table.sourceBillId),
  index("sales_transactions_batch_idx").on(table.batchId),
  index("sales_transactions_location_idx").on(table.locationId),
]);

export const salesTransactionLines = pgTable("sales_transaction_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull(),
  transactionId: uuid("transaction_id").notNull().references(() => salesTransactions.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  category: text("category"),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  lineTotal: numeric("line_total").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.locationId],
    foreignColumns: [locations.organizationId, locations.id],
    name: "sales_transaction_lines_organization_location_fk",
  }),
  index("sales_transaction_lines_transaction_idx").on(table.transactionId),
]);

export const importFieldDefinitions = pgTable("import_field_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  importType: text("import_type").notNull(),
  internalKey: text("internal_key").notNull(),
  displayName: text("display_name").notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  aliases: jsonb("aliases").notNull().default([]).$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("import_field_definitions_org_type_key_unique").on(table.organizationId, table.importType, table.internalKey),
  index("import_field_definitions_org_type_idx").on(table.organizationId, table.importType),
]);

export const taskTriggerTypes = ["time", "event"] as const;
export const taskActionTypes = ["reminder", "task"] as const;
export const taskStatuses = ["pending", "in_progress", "completed", "skipped", "overdue", "cancelled"] as const;

export const taskDefinitions = pgTable("task_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  module: text("module", { enum: systemModules }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  triggerType: text("trigger_type", { enum: taskTriggerTypes }).notNull(),
  triggerConfig: jsonb("trigger_config").notNull().default({}),
  targetDepartmentId: uuid("target_department_id").references(() => departments.id),
  targetRoleId: uuid("target_role_id").references(() => businessRoles.id),
  targetUserId: text("target_user_id").references(() => authUsers.id),
  escalationRoleId: uuid("escalation_role_id").references(() => businessRoles.id),
  actionType: text("action_type", { enum: taskActionTypes }).notNull().default("task"),
  contextTemplate: jsonb("context_template").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("task_definitions_org_module_idx").on(table.organizationId, table.module),
]);

export const taskInstances = pgTable("task_instances", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  definitionId: uuid("definition_id").notNull().references(() => taskDefinitions.id),
  status: text("status", { enum: taskStatuses }).notNull().default("pending"),
  contextData: jsonb("context_data").notNull().default({}),
  assignedRoleId: uuid("assigned_role_id").references(() => businessRoles.id),
  assignedUserId: text("assigned_user_id").references(() => authUsers.id),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("task_instances_org_status_idx").on(table.organizationId, table.status),
  index("task_instances_assigned_user_idx").on(table.assignedUserId),
  index("task_instances_assigned_role_idx").on(table.assignedRoleId),
]);

export const taskAuditLogs = pgTable("task_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  taskInstanceId: uuid("task_instance_id").notNull().references(() => taskInstances.id, { onDelete: "cascade" }),
  actorUserId: text("actor_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("task_audit_logs_task_instance_idx").on(table.taskInstanceId),
]);

export const workEscalationHistory = pgTable("work_escalation_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  workInstanceId: uuid("work_instance_id").notNull(),
  stagePosition: integer("stage_position").notNull(),
  occurrenceIndex: integer("occurrence_index").notNull().default(0),
  triggerCondition: text("trigger_condition").notNull(),
  notificationEventId: uuid("notification_event_id"),
  recipientInfo: jsonb("recipient_info").notNull().default({}),
  status: text("status").notNull().default("EXECUTED"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.organizationId, table.workInstanceId],
    foreignColumns: [workInstances.organizationId, workInstances.id],
    name: "work_escalation_history_org_instance_fk"
  }),
  unique("work_escalation_history_instance_stage_occurrence_unique").on(table.workInstanceId, table.stagePosition, table.occurrenceIndex),
  index("work_escalation_history_org_instance_idx").on(table.organizationId, table.workInstanceId),
]);

export const notificationEvents = pgTable("notification_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  workInstanceId: uuid("work_instance_id"),
  sourceEvent: text("source_event").notNull(),
  notificationType: text("notification_type").notNull(),
  criticality: text("criticality").notNull().default("NORMAL"),
  recipientUserId: text("recipient_user_id").notNull().references(() => authUsers.id),
  payloadReference: jsonb("payload_reference").notNull().default({}),
  processingState: text("processing_state").notNull().default("PENDING"),
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("notification_events_idempotency_unique").on(table.idempotencyKey),
  index("notification_events_org_state_idx").on(table.organizationId, table.processingState),
  foreignKey({
    columns: [table.organizationId, table.workInstanceId],
    foreignColumns: [workInstances.organizationId, workInstances.id],
    name: "notification_events_org_instance_fk"
  }),
]);

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  notificationEventId: uuid("notification_event_id").notNull().references(() => notificationEvents.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  recipientUserId: text("recipient_user_id").notNull().references(() => authUsers.id),
  status: text("status").notNull().default("PENDING"),
  attemptCount: integer("attempt_count").notNull().default(0),
  providerReference: text("provider_reference"),
  failureInformation: jsonb("failure_information"),
  retryAt: timestamp("retry_at", { withTimezone: true }),
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("notification_deliveries_idempotency_unique").on(table.idempotencyKey),
  index("notification_deliveries_event_channel_idx").on(table.notificationEventId, table.channel),
  index("notification_deliveries_status_retry_idx").on(table.status, table.retryAt),
  check("notification_deliveries_attempt_count_check", sql`${table.attemptCount} >= 0`),
]);

export const schedulerRuns = pgTable("scheduler_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerIdentity: text("worker_identity").notNull(),
  status: text("status").notNull().default("RUNNING"),
  itemsScanned: integer("items_scanned").notNull().default(0),
  itemsProcessed: integer("items_processed").notNull().default(0),
  failureInformation: jsonb("failure_information"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationProviderEvents = pgTable("notification_provider_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  notificationDeliveryId: uuid("notification_delivery_id").references(() => notificationDeliveries.id),
  eventType: text("event_type").notNull(),
  rawData: jsonb("raw_data").notNull().default({}),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("notification_provider_events_unique").on(table.provider, table.providerEventId),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("notification_preferences_user_channel_unique").on(table.userId, table.channel),
]);

export const biometricImportBatches = pgTable("biometric_import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  uploadedBy: text("uploaded_by").notNull().references(() => authUsers.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  totalRows: integer("total_rows").notNull(),
  successfulRows: integer("successful_rows").notNull(),
  failedRows: integer("failed_rows").notNull(),
  errors: jsonb("errors"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  regularizedBy: text("regularized_by").references(() => authUsers.id),
  regularizedAt: timestamp("regularized_at", { withTimezone: true }),
  spreadOverExceeded: boolean("spread_over_exceeded").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  accrualFrequency: varchar("accrual_frequency", { length: 20 }).default("YEARLY"),
  accrualRate: decimal("accrual_rate", { precision: 5, scale: 2 }),
  maxCarryForwardDays: decimal("max_carry_forward_days", { precision: 5, scale: 2 }).default("0.00").notNull(),
  carryForwardExpiryMonths: integer("carry_forward_expiry_months"),
  isEncashable: boolean("is_encashable").default(false).notNull(),
  encashmentMinTenureDays: integer("encashment_min_tenure_days").default(365).notNull(),
  encashmentMinBalanceRetained: decimal("encashment_min_balance_retained", { precision: 5, scale: 2 }).default("3.00").notNull(),
  encashmentOnlyAtYearEnd: boolean("encashment_only_at_year_end").default(true).notNull(),
  minTenureDays: integer("min_tenure_days").default(0).notNull(),
  restrictedUsageDays: jsonb("restricted_usage_days").default([]).notNull(),
  allowedApplicationWindow: jsonb("allowed_application_window").default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leaveEncashmentRequests = pgTable("leave_encashment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id),
  encashmentDays: decimal("encashment_days", { precision: 4, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).default("PENDING").notNull(),
  payrollProcessed: boolean("payroll_processed").default(false).notNull(),
  reason: text("reason").notNull(),
  approverId: uuid("approver_id").references(() => employees.id),
  actionedBy: text("actioned_by").references(() => authUsers.id),
  actionedAt: timestamp("actioned_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leaveRolePolicies = pgTable("leave_role_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: "cascade" }),
  businessRoleId: uuid("business_role_id").notNull().references(() => businessRoles.id, { onDelete: "cascade" }),
  customAccrualRate: decimal("custom_accrual_rate", { precision: 5, scale: 2 }),
  maxConcurrentLeaves: integer("max_concurrent_leaves"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leaveDepartmentPolicies = pgTable("leave_department_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  maxConcurrentLeaves: integer("max_concurrent_leaves"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  approverId: uuid("approver_id").references(() => employees.id),
  actionedBy: text("actioned_by").references(() => authUsers.id),
  actionedAt: timestamp("actioned_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const employeeLeaveBalances = pgTable("employee_leave_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: "cascade" }),
  accrued: decimal("accrued", { precision: 5, scale: 2 }).default("0.00").notNull(),
  taken: decimal("taken", { precision: 5, scale: 2 }).default("0.00").notNull(),
  carriedForward: decimal("carried_forward", { precision: 5, scale: 2 }).default("0.00").notNull(),
  closingBalance: decimal("closing_balance", { precision: 5, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("employee_leave_balances_unique").on(table.employeeId, table.leaveTypeId),
  index("employee_leave_balances_emp_idx").on(table.employeeId),
]);

export const leaveAccrualExecutionLogs = pgTable("leave_accrual_execution_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  executionDate: date("execution_date").notNull(),
  frequencyType: varchar("frequency_type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("leave_accrual_execution_logs_date_freq_unique").on(table.executionDate, table.frequencyType),
]);

export const shiftDefinitions = pgTable("shift_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isFlexible: boolean("is_flexible").default(false).notNull(),
  minHoursHalfDay: decimal("min_hours_half_day", { precision: 4, scale: 2 }).default("4.00").notNull(),
  minHoursFullDay: decimal("min_hours_full_day", { precision: 4, scale: 2 }).default("8.00").notNull(),
  restBreakMinutes: integer("rest_break_minutes").default(60).notNull(),
  isCrossMidnight: boolean("is_cross_midnight").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
