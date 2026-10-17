require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('CONNECTED_TO_PG');

  const sql = fs.readFileSync('drizzle/0056_b2b_sales_invoices_advance_due.sql', 'utf8');
  await client.query(sql);
  console.log('MIGRATION_0056_SUCCESS');

  const resCols = await client.query(`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'b2b_sales_invoices' AND column_name IN ('advance_paid', 'balance_due')
  `);
  console.log('B2B_SALES_INVOICES_COLUMNS:', resCols.rows);

  await client.end();
  console.log('DONE');
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
