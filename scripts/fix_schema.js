const fs = require('fs');

function fixSchema() {
    let content = fs.readFileSync('src/db/schema.ts', 'utf8');

    const target1 = `export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});`;

    const rep1 = `export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  organizationId: uuid("organization_id"),
  locationId: uuid("location_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});`;

    content = content.replace(target1, rep1);
    content = content.replace(target1.replace(/\n/g, '\r\n'), rep1);

    const target2 = `    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [businessRoles.organizationId, businessRoles.id],
      name: "employee_role_assignments_organization_role_fk",
    }),`;

    const rep2 = `    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "employee_role_assignments_role_fk",
    }),`;

    content = content.replace(target2, rep2);
    content = content.replace(target2.replace(/\n/g, '\r\n'), rep2);

    fs.writeFileSync('src/db/schema.ts', content);
    console.log('Schema fixed');
}

fixSchema();
