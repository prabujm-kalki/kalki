import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';
async function run() {
  try {
    const res = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name='advance_repayment_schedules';`);
    console.log(res);
  } catch(e) {
    console.error('DB ERROR:', e);
  }
  process.exit(0);
}
run();
