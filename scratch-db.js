const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL=(.+)/);
if (dbUrlMatch) {
  const dbUrl = dbUrlMatch[1].trim();
  const { Client } = require('pg');
  const client = new Client({ connectionString: dbUrl });
  client.connect().then(() => {
    client.query("SELECT * FROM employees e JOIN people p ON e.person_id = p.id WHERE e.id = 'f86ccfc3-c548-47ce-88e6-b352b0b2e9e3'").then(res => {
      console.log('Employee:', res.rows[0]);
      client.query("SELECT * FROM employee_family_contacts WHERE employee_id = 'f86ccfc3-c548-47ce-88e6-b352b0b2e9e3'").then(res2 => {
        console.log('Contacts:', res2.rows);
        client.end();
      });
    });
  });
}
