import { db } from "@/db";
import { taskInstances } from "@/db/schema";
import { gte } from "drizzle-orm";

async function run() {
  const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const tasks = await db.select().from(taskInstances).where(gte(taskInstances.createdAt, startOfToday));
  
  const purchaseTasks = tasks.filter((t: any) => t.contextData && (t.contextData as any).scheduleId);
  console.log(JSON.stringify(purchaseTasks, null, 2));
  process.exit(0);
}
run();
