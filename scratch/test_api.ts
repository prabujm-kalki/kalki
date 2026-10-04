import { db } from "../src/db";
import { taskInstances, taskDefinitions, businessRoles, authUsers } from "../src/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function testEndpoint() {
  const organizationId = "b5334ab2-b652-432b-8c16-774c90406261";
  const locationId = "d7f7131b-58e4-4e28-b83f-95a9b2e111a3";

  const conditions = [
    eq(taskInstances.organizationId, organizationId),
  ];

  const results = await db
    .select({
      instance: taskInstances,
      definition: taskDefinitions,
      userName: authUsers.name,
      roleName: businessRoles.name
    })
    .from(taskInstances)
    .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
    .leftJoin(authUsers, eq(taskInstances.assignedUserId, authUsers.id))
    .leftJoin(businessRoles, eq(taskInstances.assignedRoleId, businessRoles.id))
    .where(and(...conditions))
    .orderBy(desc(taskInstances.createdAt));

  const activeTasks = results
    .map(({ instance, definition, userName, roleName }) => {
      const ctx: any = instance.contextData || {};
      return {
        ...instance,
        locationId: ctx.locationId || null,
        title: ctx.title || definition.title,
        description: ctx.description || definition.description,
        processOwnerName: userName || roleName || "Unassigned",
      };
    })
    .filter(t => !locationId || t.locationId === locationId);

  console.log(`Found ${activeTasks.length} tasks matching locationId ${locationId}`);
  activeTasks.forEach(t => console.log(`ID: ${t.id}, Title: ${t.title}, Status: ${t.status}, Role: ${t.processOwnerName}`));
  process.exit(0);
}

testEndpoint().catch(console.error);
