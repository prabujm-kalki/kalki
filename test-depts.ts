import { db } from './src/db';
import { departments, organizations } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const res = await db.select({
    orgName: organizations.name,
    deptName: departments.name,
    orgId: departments.organizationId
  })
  .from(departments)
  .leftJoin(organizations, eq(departments.organizationId, organizations.id));
  
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
run();
