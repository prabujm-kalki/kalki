import { db } from './src/db/index.ts';
import { advanceTypeDefinitions, users } from './src/db/schema.ts';
import { getSessionContext } from './src/domains/session/service.ts';
async function run() {
  const types = await db.select().from(advanceTypeDefinitions);
  console.log("ALL TYPES:", types);

  const allUsers = await db.select().from(users);
  for (const u of allUsers) {
    const ctx = await getSessionContext(u as any);
    console.log("USER:", u.email, "ORG:", ctx.scopes?.[0]?.organizationId);
  }
  process.exit(0);
}
run();
