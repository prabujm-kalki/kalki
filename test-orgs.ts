import { db } from './src/db';
import { organizations } from './src/db/schema';

async function run() {
  const res = await db.select().from(organizations);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
run();
