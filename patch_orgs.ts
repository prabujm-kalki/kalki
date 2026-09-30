import { db } from './src/db/index.ts';
import { advanceTypeDefinitions, employees } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
async function run() {
  const emp = await db.select({ orgId: employees.organizationId }).from(employees).limit(1);
  const correctOrg = emp[0].orgId;

  const updated = await db
    .update(advanceTypeDefinitions)
    .set({ organizationId: correctOrg })
    .returning();
    
  console.log("Updated Advance Types to correct org:", updated.length);
  process.exit(0);
}
run();
