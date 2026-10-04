import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const po = await db.execute(sql`
      SELECT id, status, po_number
      FROM purchase_orders
      WHERE po_number = 'Chicken_shop-03_10_2026-01'
    `);
    
    if (po.rows.length > 0) {
      console.log("PO:", po.rows[0]);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
