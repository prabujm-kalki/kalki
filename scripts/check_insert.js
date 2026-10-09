const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function insertCustomer() {
  try {
    const res = await pool.query(`
      INSERT INTO customers (organization_id, name, tax_id, address, email, phone) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, ['b5334ab2-b652-432b-8c16-774c90406261', 'kalki test cus 1', 'sdfsdfsfsf', null, null, null]);
    console.log("Success:", res.rows[0]);
  } catch (err) {
    console.error("Insert Error:", err.message);
  }
  process.exit(0);
}
insertCustomer();
