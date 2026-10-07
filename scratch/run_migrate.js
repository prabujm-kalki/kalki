const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function runMigrate() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations complete!');
  process.exit(0);
}
runMigrate();
