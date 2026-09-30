require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS po_delivery_method text NOT NULL DEFAULT 'WHATSAPP'`);
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS po_whatsapp_preference text NOT NULL DEFAULT 'TEXT_AND_PDF_LINK'`);
    await pool.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS public_token text`);
    console.log("DB columns added");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
