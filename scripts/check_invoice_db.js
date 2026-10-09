const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' }); 
client.connect().then(() => client.query("SELECT * FROM b2b_sales_invoices WHERE invoice_number = 'TM-1g4am99KbDhiwDnENXR08150'")).then(res => { 
  console.log('Invoice ID:', res.rows[0].id); 
  return client.query("SELECT id, item_id, item_description, quantity FROM b2b_sales_invoice_lines WHERE invoice_id = '" + res.rows[0].id + "'"); 
}).then(res => { 
  console.log('Invoice Lines:', res.rows); 
  client.end(); 
}).catch(console.error);
