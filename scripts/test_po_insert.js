const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      insert into "purchase_orders" ("organization_id", "location_id", "vendor_id", "status", "payment_method", "total_amount", "public_token", "cashier_bill_amount", "cashier_payment_method", "cashier_attachments", "calculated_total", "routing_configuration_id") values ($1, $2, $3, $4, default, $5, $6, default, default, default, default, default) returning "id"
    `, [
      '15d2d5c5-e9ba-4996-8c27-73161d633857',
      '7da984b9-fb0a-4cf2-92e5-053268c86255',
      '9453d1a8-6ab1-4440-a673-7c3780fcfb62',
      'DRAFT',
      0,
      'd5fc36d798e6d9bf3c1babc351e1717f'
    ]);
    console.log("Success:", res.rowCount);
  } catch (err) {
    console.error("PG ERROR:", err.message);
  }
  
  await client.end();
}

run();
