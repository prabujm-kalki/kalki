import { db } from './src/db/db';
import { sql } from 'drizzle-orm';
import { rolePermissions } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function test() {
  const perms = await db.execute(sql`SELECT * FROM permissions WHERE code LIKE 'people.%' OR code LIKE 'employee.%'`);
  console.log("PERMISSIONS:", perms);
  
  const rp = await db.select().from(rolePermissions);
  console.log("ROLE PERMS:", rp.filter(r => r.permissionCode.includes('employee.') || r.permissionCode.includes('people.')));
  
  process.exit(0);
}
test();
