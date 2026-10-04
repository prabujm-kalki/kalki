import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("\n=== TODAY'S PURCHASE ORDERS ===");
    const pos = await db.execute(sql`
      SELECT id, po_number, status, created_at, updated_at
      FROM purchase_orders
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(pos.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
