import { pool } from '../src/db/index.js';

async function run() {
  try {
    await pool.query(`
      ALTER TABLE "b2b_sales_invoices" ADD COLUMN IF NOT EXISTS "channel_id" uuid;
    `);
    
    // Check if constraint exists before adding it
    const checkConstraint = await pool.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'b2b_sales_invoices_channel_id_sales_channels_id_fk';
    `);
    
    if (checkConstraint.rowCount === 0) {
      await pool.query(`
        ALTER TABLE "b2b_sales_invoices" ADD CONSTRAINT "b2b_sales_invoices_channel_id_sales_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE no action ON UPDATE no action;
      `);
    }

    console.log("Migration 0046 applied successfully");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    pool.end();
  }
}
run();
