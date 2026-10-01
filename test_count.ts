import { db } from './src/db/index.ts';
import { employees, people, authUsers, authAccounts } from './src/db/schema.ts';

async function run() {
  const users = await db.select().from(authUsers);
  console.log('Users:', users);
  
  const accounts = await db.select().from(authAccounts);
  console.log('Accounts:', accounts);
  process.exit(0);
}
run();
