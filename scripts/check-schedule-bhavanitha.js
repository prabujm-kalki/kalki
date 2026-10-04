require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => {
  return client.query("SELECT id, vendor_id, responsible_role_id, location_id, frequency_rule, reminder_time FROM purchase_schedules WHERE id = '7ad0e851-0b83-4e0a-9eba-0aff9ab5fd31';");
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
}).catch(console.error).finally(() => {
  client.end();
});
