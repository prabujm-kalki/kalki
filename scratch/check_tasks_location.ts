import { db } from "../src/db";
import { taskInstances } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  const tasks = await db.select().from(taskInstances).where(eq(taskInstances.organizationId, orgId));
  
  tasks.forEach(t => {
    const ctx = t.contextData as any;
    console.log(`Task ${t.id} - Status: ${t.status} - LocID: ${ctx?.locationId} - Title: ${ctx?.title}`);
  });
  process.exit(0);
}

run().catch(console.error);
