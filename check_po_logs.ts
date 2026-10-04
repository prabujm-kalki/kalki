import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const logs = await db.execute(sql`
      SELECT *
      FROM audit_logs
      WHERE resource_type = 'purchase_order' 
      AND resource_id = 'c707eed6-69ab-42a1-a57c-7047df0c17c2'
      ORDER BY created_at ASC
    `);
    console.log("Audit Logs:", JSON.stringify(logs.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
