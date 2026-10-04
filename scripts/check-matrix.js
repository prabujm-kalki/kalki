require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => {
  return client.query("SELECT * FROM task_escalation_matrices WHERE definition_id = 'f9a6853c-55ad-4ecb-9754-a70f62b989a4';");
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
}).catch(console.error).finally(() => {
  client.end();
});
