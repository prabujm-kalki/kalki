import { db } from "@/db";
import { taskInstances, taskDefinitions, businessRoles, authUsers } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";

async function main() {
  const tasks = await db.select({
    id: taskInstances.id,
    status: taskInstances.status,
    assignedRoleId: taskInstances.assignedRoleId,
    roleName: businessRoles.name,
    assignedUserId: taskInstances.assignedUserId,
    userName: authUsers.name,
    contextData: taskInstances.contextData,
    defTitle: taskDefinitions.title
  }).from(taskInstances)
  .leftJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
  .leftJoin(businessRoles, eq(taskInstances.assignedRoleId, businessRoles.id))
  .leftJoin(authUsers, eq(taskInstances.assignedUserId, authUsers.id));

  console.log(JSON.stringify(tasks.filter(t => 
    t.defTitle?.includes("Kalki") || 
    (t.contextData as any)?.title?.includes("Kalki") || 
    (t.contextData as any)?.title?.includes("Bhavanitha")
  ).slice(0, 10), null, 2));
}
main().catch(console.error).then(() => process.exit(0));
