import { db } from "./src/db";
import { taskInstances, taskDefinitions } from "./src/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  const tasks = await db.select({
    id: taskInstances.id,
    title: sql`task_instances.context_data->>'title'`,
    status: taskInstances.status,
    dueAt: taskInstances.dueAt,
    warningSent: sql`task_instances.context_data->>'warningSent'`,
    isWarning: sql`task_instances.context_data->>'isWarning'`,
    escalationLevel: taskInstances.escalationLevel,
    warningThresholdMinsDef: taskDefinitions.warningThresholdMins,
  }).from(taskInstances)
  .leftJoin(taskDefinitions, sql`task_instances.definition_id = task_definitions.id`)
  .where(sql`task_instances.context_data->>'title' LIKE '%22:48%'`);

  console.log(JSON.stringify(tasks, null, 2));
  process.exit(0);
}

run().catch(console.error);
