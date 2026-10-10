const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Starting retroactive unassigned channel sync...');
  
  // Find organizations that have null channel_id invoices
  const resOrgs = await pool.query(`SELECT DISTINCT organization_id FROM b2b_sales_invoices WHERE channel_id IS NULL`);
  const orgs = resOrgs.rows;
  console.log(`Found ${orgs.length} organizations with unassigned invoices`);

  let updated = 0;
  for (const org of orgs) {
    const orgId = org.organization_id;

    // Find or create 'Unassigned' channel for this org
    const resChan = await pool.query(`SELECT id FROM sales_channels WHERE organization_id = $1 AND name = 'Unassigned'`, [orgId]);
    let unassignedId;
    if (resChan.rows.length > 0) {
      unassignedId = resChan.rows[0].id;
    } else {
      const { randomUUID } = require('crypto');
      unassignedId = randomUUID();
      await pool.query(`
        INSERT INTO sales_channels (id, organization_id, name, type, is_active, created_at, updated_at)
        VALUES ($1, $2, 'Unassigned', 'B2C', true, NOW(), NOW())
      `, [unassignedId, orgId]);
    }

    // Update invoices
    const updateRes = await pool.query(`
      UPDATE b2b_sales_invoices
      SET channel_id = $1
      WHERE organization_id = $2 AND channel_id IS NULL
    `, [unassignedId, orgId]);

    if (updateRes.rowCount > 0) {
      console.log(`Updated ${updateRes.rowCount} unassigned invoices for organization ${orgId}`);
      updated += updateRes.rowCount;
    }
  }

  console.log(`Finished retroactive unassigned sync. Total invoices updated: ${updated}`);
  await pool.end();
}

run().catch(console.error);
