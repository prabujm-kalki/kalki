import 'dotenv/config';
import { db } from './src/db';
import { purchaseSchedules } from './src/db/schema';
import { sql, eq } from 'drizzle-orm';

async function run() {
  const sched = await db.select().from(purchaseSchedules).where(eq(purchaseSchedules.id, "1a44f158-05c1-4aa6-b059-7b4c5bb28461"));
  console.log(JSON.stringify(sched, null, 2));
  process.exit(0);
}

run();
