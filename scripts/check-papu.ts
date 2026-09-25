import { db } from "../src/db/index";
import { authUsers, authAccounts } from "../src/db/schema";
import { ilike, inArray } from "drizzle-orm";

async function run() {
  const users = await db.select().from(authUsers).where(ilike(authUsers.email, '%prabu.jm%'));
  console.log('Users:', users);
  
  if (users.length > 0) {
    const accounts = await db.select().from(authAccounts).where(inArray(authAccounts.userId, users.map(u => u.id)));
    console.log('Accounts:', accounts);
  }
  process.exit(0);
}
run();
