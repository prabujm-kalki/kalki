const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function fixCustomers() {
  try {
    await pool.query('ALTER TABLE customers RENAME COLUMN billing_address TO address;');
    console.log('Renamed billing_address to address');
  } catch (e) {
    console.log(e.message);
  }
  
  try {
    await pool.query('ALTER TABLE customers ADD COLUMN tax_id text;');
    console.log('Added tax_id column');
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
}
fixCustomers();
