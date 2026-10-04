require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => {
  return client.query("SELECT * FROM task_instances WHERE id = 'e24f306f-9064-4998-aa1e-89f3e88e5b0b';");
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
}).catch(console.error).finally(() => {
  client.end();
});
