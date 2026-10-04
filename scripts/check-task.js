require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => {
  return client.query("SELECT id, status, assigned_user_id, assigned_role_id, context_data FROM task_instances;");
}).then(res => {
  const matches = res.rows.filter(r => JSON.stringify(r).includes('Sakthi'));
  console.log(JSON.stringify(matches, null, 2));
}).catch(console.error).finally(() => {
  client.end();
});
