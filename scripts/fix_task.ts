import { db } from "@/db";
import { taskInstances, purchaseSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const taskId = "11d2336e-41e7-4912-a910-69cc84d4fb27"; // Kalki Fresh_Daily_04:34
  
  // Fetch the schedule ID from the task context
  const [task] = await db.select().from(taskInstances).where(eq(taskInstances.id, taskId));
  const scheduleId = (task.contextData as any).scheduleId;
  
  // Fetch original role
  const [sched] = await db.select().from(purchaseSchedules).where(eq(purchaseSchedules.id, scheduleId));
  
  // Update task to original role
  if (sched && sched.responsibleRoleId) {
    await db.update(taskInstances)
      .set({ assignedRoleId: sched.responsibleRoleId })
      .where(eq(taskInstances.id, taskId));
    console.log("Task reverted to original role ID:", sched.responsibleRoleId);
  } else {
    console.log("Could not find original role ID for schedule:", scheduleId);
  }
}

main().catch(console.error).then(() => process.exit(0));
