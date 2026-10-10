const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function seed() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261'; // From URL in screenshot
  const channels = [
    { name: 'Dine-In', type: 'RETAIL' },
    { name: 'Takeaway', type: 'RETAIL' },
    { name: 'Delivery', type: 'RETAIL' },
    { name: 'B2B Catering', type: 'B2B' },
    { name: 'Hall Booking', type: 'B2B' }
  ];

  for (const c of channels) {
    await pool.query(
      `INSERT INTO sales_channels (organization_id, name, type, is_active) 
       VALUES ($1, $2, $3, true) 
       ON CONFLICT DO NOTHING`,
      [orgId, c.name, c.type]
    );
  }
  
  console.log('Seeded sales channels!');
  pool.end();
}
seed();
