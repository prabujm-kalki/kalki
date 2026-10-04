import { db } from "./src/db";
import { taskAuditLogs } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const logs = await db.select().from(taskAuditLogs).where(eq(taskAuditLogs.taskInstanceId, '2623b535-1d75-4ada-a81c-005de548bd5f'));
  console.log(JSON.stringify(logs, null, 2));
  process.exit(0);
}
run().catch(console.error);
