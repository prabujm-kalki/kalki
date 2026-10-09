import { db } from '../src/db/index.js';
import { permissions } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';

async function check() {
  const perms = await db.select().from(permissions).where(sql`code LIKE 'sales%'`);
  console.log(perms);
  process.exit(0);
}
check();
