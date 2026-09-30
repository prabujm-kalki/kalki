import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';
async function run() {
  const res = await db.execute(sql`SELECT code FROM permissions WHERE code LIKE 'employee.%' OR code LIKE 'payroll.%'`);
  console.log(res.rows.map(r => r.code));
  process.exit(0);
}
run();
