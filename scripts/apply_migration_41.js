const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  
  const sql = fs.readFileSync('drizzle/0041_futuristic_shriek.sql', 'utf8');
  // the SQL file has `--> statement-breakpoint`, which might break the standard query unless we split or just remove them.
  // pg driver can usually handle multiple statements if they are separated by semicolons.
  // let's split by statement-breakpoint and run sequentially to be safe.
  const statements = sql.split('--> statement-breakpoint');
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await client.query(statement);
      } catch (e) {
        console.error('Error executing statement:', e.message);
        // ignore duplicate column errors just in case
      }
    }
  }
  
  await client.end();
  console.log('Done.');
}

run();
