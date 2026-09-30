import { db } from './src/db/index.ts';
import { advanceTypeDefinitions } from './src/db/schema.ts';
async function run() {
  const res = await db.select().from(advanceTypeDefinitions);
  console.log(res);
  process.exit(0);
}
run();
