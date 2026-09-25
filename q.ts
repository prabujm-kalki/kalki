import { db } from './src/db';
import { attendanceSummaries } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function run() {
  const s = await db.select().from(attendanceSummaries).where(sql`attendance_date >= '2026-09-20'`);
  console.log(JSON.stringify(s, null, 2));
  process.exit(0);
}
run();
