require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => {
  return client.query("SELECT id, status, assigned_role_id, assigned_user_id, context_data FROM task_instances WHERE context_data->>'title' LIKE '%Bhavanitha Broilers_Daily_02:23%';");
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
}).catch(console.error).finally(() => {
  client.end();
});
