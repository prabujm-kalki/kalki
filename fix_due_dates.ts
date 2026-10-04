import 'dotenv/config';
import { db } from './src/db';
import { taskInstances, taskDefinitions } from './src/db/schema';
import { eq, inArray, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    // get all pending tasks and fix their due date if they belong to a definition
    const pendingTasks = await db.select().from(taskInstances).where(eq(taskInstances.status, "pending"));
    for (const t of pendingTasks) {
      if (t.definitionId) {
        const [def] = await db.select().from(taskDefinitions).where(eq(taskDefinitions.id, t.definitionId));
        if (def && def.completionTimeMins) {
           const dueAt = new Date(t.createdAt.getTime() + def.completionTimeMins * 60 * 1000);
           await db.update(taskInstances).set({ dueAt }).where(eq(taskInstances.id, t.id));
        }
      }
    }
    console.log("Updated due dates for pending tasks");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
