import fs from 'fs';
import { Client } from 'pg';

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const sql = fs.readFileSync('drizzle/0028_wealthy_ben_parker.sql', 'utf-8');
    await c.query(sql);
    console.log("Migration 0028 applied!");
  } catch (e: any) {
    console.log("Error applying 0028:", e.message);
  } finally {
    await c.end();
  }
}
main();
