import { db } from "@/db";
import { taskInstances } from "@/db/schema";
import { gte } from "drizzle-orm";

async function run() {
  const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const tasks = await db.select().from(taskInstances).where(gte(taskInstances.createdAt, startOfToday));
  
  const groups: Record<string, any[]> = {};
  for (const t of tasks) {
    if (t.contextData && (t.contextData as any).scheduleId) {
      const scheduleId = (t.contextData as any).scheduleId;
      if (!groups[scheduleId]) groups[scheduleId] = [];
      groups[scheduleId].push(t);
    }
  }

  for (const scheduleId in groups) {
    const sorted = groups[scheduleId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sorted.length > 1) {
      const toDelete = sorted.slice(1);
      console.log(`Deleting ${toDelete.length} duplicates for schedule ${scheduleId}`);
      for (const d of toDelete) {
        await db.delete(taskInstances).where(gte(taskInstances.id, d.id));
      }
    }
  }
  
  process.exit(0);
}
run();
