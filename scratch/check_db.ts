import { db } from "../src/db";
import { purchaseSchedules, taskInstances } from "../src/db/schema";

async function run() {
  const schedules = await db.select().from(purchaseSchedules);
  console.log("=== Schedules ===");
  schedules.forEach(s => {
    console.log(`ID: ${s.id}, Vendor: ${s.vendorId}, Time: ${s.reminderTime}, Freq: ${s.frequencyRule}, Role: ${s.responsibleRoleId}`);
  });

  const tasks = await db.select().from(taskInstances);
  console.log("\n=== Tasks ===");
  tasks.forEach(t => {
    const ctx = t.contextData as any;
    console.log(`Task ID: ${t.id}, ScheduleID: ${ctx?.scheduleId}, Title: ${ctx?.title}, CreatedAt: ${t.createdAt}`);
  });

  process.exit(0);
}

run().catch(console.error);
