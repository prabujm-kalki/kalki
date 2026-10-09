import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT 1 as val`);
    console.log("Array?:", Array.isArray(res));
    console.log("res:", res);
    console.log("res.rows:", res?.rows);
  } catch(e) {
    console.log("error:", e);
  }
}
run();
