import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking Manager role permissions...");
  
  // Find Manager and ED roles
  const rolesRes = await db.execute(sql`
    SELECT id, code, name FROM roles WHERE code IN ('manager', 'ED', 'MANAGER_0AAF0100');
  `);
  console.log("Roles to update:", rolesRes.rows);

  const targetPerms = ['purchasing.create_po:read', 'purchasing.create_po:create', 'purchasing.create_po:update', 'purchasing.create_po:approve'];

  const permsRes = await db.execute(sql`
    SELECT id, code FROM permissions WHERE code IN ('purchasing.create_po:read', 'purchasing.create_po:create', 'purchasing.create_po:update', 'purchasing.create_po:approve');
  `);
  console.log("Permissions to link:", permsRes.rows);

  for (const role of rolesRes.rows as any[]) {
    for (const perm of permsRes.rows as any[]) {
      await db.execute(sql`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (${role.id}, ${perm.id})
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      `);
      console.log(`Ensured permission ${perm.code} for role ${role.name} (${role.code})`);
    }
  }

  console.log("Role permissions update complete.");
}

main().catch(console.error).finally(() => process.exit(0));
