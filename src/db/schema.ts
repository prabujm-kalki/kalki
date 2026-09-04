import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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
    uniqueIndex("organizations_code_unique").on(table.code),
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
    uniqueIndex("locations_organization_code_unique").on(
      table.organizationId,
      table.code,
    ),
    uniqueIndex("locations_organization_id_unique").on(
      table.organizationId,
      table.id,
    ),
    index("locations_organization_idx").on(table.organizationId),
    index("locations_active_idx").on(table.isActive),
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
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    employeeCode: text("employee_code").notNull(),
    jobTitle: text("job_title"),
    employmentStartDate: date("employment_start_date").notNull(),
    employmentEndDate: date("employment_end_date"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("employees_organization_code_unique").on(
      table.organizationId,
      table.employeeCode,
    ),
    uniqueIndex("employees_organization_id_unique").on(
      table.organizationId,
      table.id,
    ),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
      name: "employees_organization_location_fk",
    }),
    check(
      "employees_employment_dates_check",
      sql`employment_end_date IS NULL OR employment_end_date >= employment_start_date`,
    ),
    index("employees_person_idx").on(table.personId),
    index("employees_organization_idx").on(table.organizationId),
    index("employees_location_idx").on(table.locationId),
    index("employees_active_idx").on(table.isActive),
  ],
);

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
    uniqueIndex("organization_memberships_user_org_unique").on(
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
    uniqueIndex("location_memberships_user_location_unique").on(
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
    uniqueIndex("organization_role_assignments_unique").on(
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
    uniqueIndex("location_role_assignments_unique").on(
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
    uniqueIndex("business_roles_organization_identifier_unique").on(table.organizationId, table.identifier),
    uniqueIndex("business_roles_organization_name_unique").on(table.organizationId, table.name),
    uniqueIndex("business_roles_organization_id_unique").on(table.organizationId, table.id),
    index("business_roles_organization_active_idx").on(table.organizationId, table.isActive),
  ],
);

export const roleKpiDefinitions = pgTable("role_kpi_definitions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), roleId: uuid("role_id").notNull(), name: text("name").notNull(), description: text("description").notNull(), configuration: jsonb("configuration").notNull().default({}), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.roleId], foreignColumns: [businessRoles.organizationId, businessRoles.id], name: "role_kpi_definitions_organization_role_fk" }),
  uniqueIndex("role_kpi_definitions_role_name_unique").on(table.roleId, table.name), index("role_kpi_definitions_organization_role_idx").on(table.organizationId, table.roleId),
]);

export const roleChecklists = pgTable("role_checklists", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), roleId: uuid("role_id").notNull(), name: text("name").notNull(), description: text("description"), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.roleId], foreignColumns: [businessRoles.organizationId, businessRoles.id], name: "role_checklists_organization_role_fk" }),
  uniqueIndex("role_checklists_role_name_unique").on(table.roleId, table.name), uniqueIndex("role_checklists_organization_id_unique").on(table.organizationId, table.id), index("role_checklists_organization_role_idx").on(table.organizationId, table.roleId),
]);

export const roleChecklistItems = pgTable("role_checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), checklistId: uuid("checklist_id").notNull(), definition: text("definition").notNull(), position: integer("position").notNull(), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.checklistId], foreignColumns: [roleChecklists.organizationId, roleChecklists.id], name: "role_checklist_items_organization_checklist_fk" }),
  uniqueIndex("role_checklist_items_checklist_position_unique").on(table.checklistId, table.position), index("role_checklist_items_organization_checklist_idx").on(table.organizationId, table.checklistId),
]);

export const employeeRoleAssignments = pgTable("employee_role_assignments", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), employeeId: uuid("employee_id").notNull(), roleId: uuid("role_id").notNull(), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.employeeId], foreignColumns: [employees.organizationId, employees.id], name: "employee_role_assignments_organization_employee_fk" }), foreignKey({ columns: [table.organizationId, table.roleId], foreignColumns: [businessRoles.organizationId, businessRoles.id], name: "employee_role_assignments_organization_role_fk" }), uniqueIndex("employee_role_assignments_employee_role_unique").on(table.employeeId, table.roleId), index("employee_role_assignments_organization_employee_active_idx").on(table.organizationId, table.employeeId, table.isActive),
]);

export const employeeResponsibilityAdditions = pgTable("employee_responsibility_additions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), employeeId: uuid("employee_id").notNull(), responsibility: text("responsibility").notNull(), actualWork: text("actual_work").notNull(), position: integer("position").notNull(), metadata: jsonb("metadata").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.employeeId], foreignColumns: [employees.organizationId, employees.id], name: "employee_responsibility_additions_organization_employee_fk" }), uniqueIndex("employee_responsibility_additions_employee_position_unique").on(table.employeeId, table.position), index("employee_responsibility_additions_organization_employee_idx").on(table.organizationId, table.employeeId),
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
  uniqueIndex("work_situation_definitions_organization_id_unique").on(table.organizationId, table.id),
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
  uniqueIndex("role_responsibilities_role_position_unique").on(table.roleId, table.position),
  index("role_responsibilities_organization_role_idx").on(table.organizationId, table.roleId),
  index("role_responsibilities_organization_work_definition_idx").on(table.organizationId, table.workSituationDefinitionId),
]);

export const workSituationEvidenceRequirements = pgTable("work_situation_evidence_requirements", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), workSituationDefinitionId: uuid("work_situation_definition_id").notNull(), isRequired: boolean("is_required").notNull().default(false), metadata: jsonb("metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [ foreignKey({ columns: [table.organizationId, table.workSituationDefinitionId], foreignColumns: [workSituationDefinitions.organizationId, workSituationDefinitions.id], name: "work_situation_evidence_requirements_organization_definition_fk" }), uniqueIndex("work_situation_evidence_requirements_definition_unique").on(table.workSituationDefinitionId) ]);

export const workSituationReminderEscalationStages = pgTable("work_situation_reminder_escalation_stages", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), workSituationDefinitionId: uuid("work_situation_definition_id").notNull(), stage: text("stage").notNull(), position: integer("position").notNull(), configuration: jsonb("configuration").notNull().default({}), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.organizationId, table.workSituationDefinitionId], foreignColumns: [workSituationDefinitions.organizationId, workSituationDefinitions.id], name: "work_situation_reminder_escalation_stages_organization_definition_fk" }),
  uniqueIndex("work_situation_reminder_escalation_stages_definition_position_unique").on(table.workSituationDefinitionId, table.position),
  uniqueIndex("work_situation_reminder_escalation_stages_definition_stage_unique").on(table.workSituationDefinitionId, table.stage),
  index("work_situation_reminder_escalation_stages_organization_definition_idx").on(table.organizationId, table.workSituationDefinitionId),
  check(
    "work_situation_reminder_escalation_stages_stage_check",
    sql`${table.stage} IN ('due_notification', 'reminder', 'strong_reminder', 'final_reminder', 'escalation', 'verification', 'exception_escalation')`,
  ),
]);

export const workInstances = pgTable("work_instances", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull(), workSituationDefinitionId: uuid("work_situation_definition_id").notNull(), locationId: uuid("location_id"), assignedEmployeeId: uuid("assigned_employee_id"), sourceReference: text("source_reference"), sourceMetadata: jsonb("source_metadata").notNull().default({}), definitionSnapshot: jsonb("definition_snapshot").notNull().default({}), state: text("state").notNull().default("SEEN"), verificationConfig: jsonb("verification_config").notNull().default({}), metadata: jsonb("metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("work_instances_organization_id_unique").on(table.organizationId, table.id),
  uniqueIndex("work_instances_organization_definition_source_unique").on(table.organizationId, table.workSituationDefinitionId, table.sourceReference),
  foreignKey({ columns: [table.organizationId, table.workSituationDefinitionId], foreignColumns: [workSituationDefinitions.organizationId, workSituationDefinitions.id], name: "work_instances_organization_definition_fk" }), foreignKey({ columns: [table.organizationId, table.locationId], foreignColumns: [locations.organizationId, locations.id], name: "work_instances_organization_location_fk" }), foreignKey({ columns: [table.organizationId, table.assignedEmployeeId], foreignColumns: [employees.organizationId, employees.id], name: "work_instances_organization_assigned_employee_fk" }), check("work_instances_state_check", sql`${table.state} IN ('SEEN', 'ACKNOWLEDGED', 'COMPLETED', 'VERIFIED')`), index("work_instances_organization_state_idx").on(table.organizationId, table.state), index("work_instances_assigned_employee_state_idx").on(table.assignedEmployeeId, table.state), index("work_instances_definition_idx").on(table.workSituationDefinitionId),
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
  uniqueIndex("work_instance_evidence_presences_instance_unique").on(table.workInstanceId),
  uniqueIndex("work_instance_evidence_presences_organization_id_unique").on(table.organizationId, table.id),
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
  uniqueIndex("work_instance_verification_presences_instance_unique").on(table.workInstanceId),
  uniqueIndex("work_instance_verification_presences_organization_id_unique").on(table.organizationId, table.id),
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
