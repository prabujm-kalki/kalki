import { db } from "./src/db";
import { taskAuditLogs } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const logs = await db.select().from(taskAuditLogs).where(eq(taskAuditLogs.taskInstanceId, '227bf2cc-1937-4f28-9282-9f5b483ae898'));
  console.log(JSON.stringify(logs, null, 2));
  process.exit(0);
}
run().catch(console.error);
