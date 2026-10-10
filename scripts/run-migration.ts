import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src/db/index';

async function run() {
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log("Migrated successfully");
  } catch (err) {
    console.error("Migration error:", err);
  }
  pool.end();
}
run();
