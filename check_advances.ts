import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';
async function run() {
  const res = await db.execute(sql`SELECT * FROM advance_type_definitions`);
  console.log(res.rows);
  process.exit(0);
}
run();
