const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('--- PEOPLE ---');
  const people = await pool.query("SELECT id, email, phone FROM person WHERE phone = '7358632597'");
  console.log(people.rows);
  
  if (people.rows.length > 0) {
    const personEmail = people.rows[0].email || `${people.rows[0].phone}@kalki.internal`;
    console.log(`\nExpected Auth Email: ${personEmail}`);
    
    console.log('\n--- AUTH_USERS ---');
    const authUsers = await pool.query("SELECT id, email FROM \"user\" WHERE email = $1", [personEmail]);
    console.log(authUsers.rows);
    
    if (authUsers.rows.length > 0) {
      console.log('\n--- AUTH_ACCOUNTS ---');
      const accounts = await pool.query("SELECT id, account_id, provider_id, user_id FROM account WHERE user_id = $1", [authUsers.rows[0].id]);
      console.log(accounts.rows);
    }
  }
  
  process.exit(0);
}
run();
