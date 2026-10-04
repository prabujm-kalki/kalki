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
    console.log(po.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
