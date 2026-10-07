const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/kalki_db' });
client.connect();
client.query("SELECT * FROM purchase_order_lines WHERE po_id = (SELECT id FROM purchase_orders WHERE po_number = 'Chicken_shop-07_10_2026-03')", (err, res) => {
  if (err) throw err;
  console.log(res.rows);
  client.end();
});
