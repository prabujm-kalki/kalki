import 'dotenv/config';
import { db } from './src/db';
import { taskInstances } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    console.log("Deleting duplicate pending task...");
    await db.delete(taskInstances).where(eq(taskInstances.id, "e46461d9-a246-48d2-93dc-5633a4dddbb0"));
    console.log("Deleted duplicate task.");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
