import { db } from './src/db/index.ts';
import { eq, and } from 'drizzle-orm';
import { employeeAdvanceRequests } from './src/db/schema.ts';
async function run() {
  try {
    const res = await db.select().from(employeeAdvanceRequests).where(eq(employeeAdvanceRequests.employeeId, null as any));
    console.log(res);
  } catch (err: any) {
    console.error(err.message);
  }
  process.exit(0);
}
run();
