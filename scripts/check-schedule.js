require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => {
  return client.query("SELECT * FROM purchase_schedules WHERE id = 'fb0efa8a-677e-4675-9b92-be177202ed23';");
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
}).catch(console.error).finally(() => {
  client.end();
});
