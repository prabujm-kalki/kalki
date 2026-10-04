require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(async () => {
  // Fix Bhavanitha task
  await client.query("UPDATE task_instances SET assigned_role_id = 'b3c84b7b-6897-4397-9ae5-01eec375c9e5' WHERE id = 'e24f306f-9064-4998-aa1e-89f3e88e5b0b';");
  // Fix Sakthi Masala task to have Manager as assigned role since it reached max escalation
  await client.query("UPDATE task_instances SET assigned_role_id = '3306feb5-cd06-45d2-b145-faea2fd780af' WHERE id = 'cfdf0a8e-bfb6-4148-8a10-dd3314499594';");
  
  console.log("Fixed broken tasks in DB.");
}).catch(console.error).finally(() => {
  client.end();
});
