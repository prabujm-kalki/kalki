const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function run() {
  await client.connect();
  const q = `
    WITH ranked_locs AS (
      SELECT 
        customer_id, 
        location_id,
        count(*) as inv_count,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY count(*) DESC, max(invoice_date) DESC) as rn
      FROM b2b_sales_invoices
      WHERE customer_id IS NOT NULL AND location_id IS NOT NULL
      GROUP BY customer_id, location_id
    )
    SELECT r.location_id, l.name, count(*) as customer_count
    FROM ranked_locs r
    JOIN locations l ON l.id = r.location_id
    WHERE r.rn = 1
    GROUP BY r.location_id, l.name;
  `;
  const res = await client.query(q);
  console.log('Customer distribution by primary location:');
  console.table(res.rows);
  await client.end();
}

run().catch(console.error);
