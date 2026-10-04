import 'dotenv/config';
import { db } from './src/db';
import { taskInstances } from './src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function run() {
  try {
    console.log("Setting dueAt to past for testing escalation...");
    const pastTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    const tasks = await db.select().from(taskInstances).where(eq(taskInstances.status, "pending"));
    const ids = tasks.map(t => t.id);
    
    if (ids.length > 0) {
      await db.update(taskInstances)
        .set({ dueAt: pastTime })
        .where(inArray(taskInstances.id, ids));
      console.log(`Updated ${ids.length} pending tasks to be overdue.`);
    } else {
      console.log("No pending tasks found.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
