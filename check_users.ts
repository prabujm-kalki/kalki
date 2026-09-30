import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { getSessionContext } from './src/domains/session/service.ts';
async function run() {
  const allUsers = await db.select().from(users);
  for (const u of allUsers) {
    const ctx = await getSessionContext(u as any);
    console.log("User:", u.email, "OrgId:", ctx.scopes?.[0]?.organizationId);
  }
  process.exit(0);
}
run();
