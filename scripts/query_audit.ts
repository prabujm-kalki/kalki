import { db } from "@/db";
import { taskInstances, taskDefinitions, taskAuditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const taskId = "11d2336e-41e7-4912-a910-69cc84d4fb27"; // Kalki Fresh_Daily_04:34
  const task = await db.select().from(taskInstances).where(eq(taskInstances.id, taskId)).limit(1);
  const def = await db.select().from(taskDefinitions).where(eq(taskDefinitions.id, task[0].definitionId)).limit(1);
  const logs = await db.select().from(taskAuditLogs).where(eq(taskAuditLogs.taskInstanceId, taskId));
  
  console.log("Task:", task);
  console.log("Def:", def);
  console.log("Logs:", logs);
}
main().catch(console.error).then(() => process.exit(0));
