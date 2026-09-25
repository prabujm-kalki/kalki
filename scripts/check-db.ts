import { db } from '../src/db';
import { sql } from 'drizzle-orm';
async function run() {
  try {
    await db.execute(sql.raw('ALTER TABLE employees ADD COLUMN IF NOT EXISTS default_shift_id uuid REFERENCES shift_definitions(id);'));
    console.log('Added default_shift_id');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
