import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = `
    ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "attachment_url" text;
  `;
  
  try {
    await pool.query(sql);
    console.log("SQL successfully applied: added attachment_url to payments");
  } catch (err) {
    console.error("Error applying SQL:", err);
  } finally {
    pool.end();
  }
}

run();
