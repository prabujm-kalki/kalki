import 'dotenv/config';
import { db } from './src/db';
import { taskInstances } from './src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    // get all pending tasks and fix their due date if they belong to a definition
    await db.update(taskInstances)
      .set({ status: 'completed', completedAt: new Date() })
      .where(inArray(taskInstances.status, ["pending", "in_progress"]));
      
    console.log("Cleared pending/in_progress tasks for testing");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
