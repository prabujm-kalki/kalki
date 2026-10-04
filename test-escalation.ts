import { config } from "dotenv";
config();
import { db } from "@/db";
import { organizations, taskDefinitions, taskInstances, taskEscalationMatrices, taskAuditLogs } from "@/db/schema";
import { runEscalationSweeper } from "@/domains/tasks/sweeper";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();

async function main() {
  console.log("Setting up test data...");
  const orgId = uuidv4();
  const defId = uuidv4();

  // 1. Create Organization
  await db.insert(organizations).values({
    id: orgId,
    name: "Test Org Escalation",
    code: "TEST-ESC-" + Date.now()
  });

  // 2. Create Task Definition
  await db.insert(taskDefinitions).values({
    id: defId,
    organizationId: orgId,
    module: "settings",
    title: "Test Task Def",
    triggerType: "ad_hoc",
    actionType: "task",
    priority: "medium",
    isActive: true
  });

  const now = new Date();
  const past = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const oldAudit = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago

  const case1Id = uuidv4();
  const case2Id = uuidv4();
  const case3Id = uuidv4();

  // Test Case 1: Assignee Deadline Breach (No matrix, handled by route.ts but wait, if sweeper runs first, sweeper sets it to audit_pending if no matrix!)
  await db.insert(taskInstances).values({
    id: case1Id,
    organizationId: orgId,
    definitionId: defId,
    status: "pending",
    priority: "medium",
    dueAt: past,
    contextData: { testCase: 1 }
  });

  // Test Case 2: Auditor Grace Period Breach
  await db.insert(taskInstances).values({
    id: case2Id,
    organizationId: orgId,
    definitionId: defId,
    status: "audit_pending",
    priority: "medium",
    dueAt: past,
    updatedAt: oldAudit,
    contextData: { testCase: 2, auditLevel: 1 }
  });

  // Test Case 3: Escalation Matrix Timeout (Has Matrix)
  await db.insert(taskInstances).values({
    id: case3Id,
    organizationId: orgId,
    definitionId: defId,
    status: "pending",
    priority: "medium",
    dueAt: past,
    escalationLevel: 0,
    contextData: { testCase: 3 }
  });

  await db.insert(taskEscalationMatrices).values({
    definitionId: defId,
    level: 1,
    timeoutMinutes: 60
  });

  console.log("Test data created. Case1:", case1Id, "Case2:", case2Id, "Case3:", case3Id);

  // Run Sweeper
  console.log("Running sweeper.ts...");
  const sweeperResult = await runEscalationSweeper();
  console.log("Sweeper result:", sweeperResult);

  // Run Route logic (simulate GET request)
  console.log("Running route.ts logic...");
  const { GET } = await import("./src/app/api/cron/tasks-escalation/route");
  const req = new Request("http://localhost/api/cron/tasks-escalation");
  const res = await GET(req);
  const json = await res.json();
  console.log("Route result:", json);

  // Verify results
  const tasks = await db.select().from(taskInstances).where(inArray(taskInstances.id, [case1Id, case2Id, case3Id]));
  
  for (const t of tasks) {
    console.log(`Task ${t.id} - Status: ${t.status}, EscalationLevel: ${t.escalationLevel}, Context:`, t.contextData);
  }

  const audits = await db.select().from(taskAuditLogs).where(inArray(taskAuditLogs.taskInstanceId, [case1Id, case2Id, case3Id]));
  console.log("Audit Logs:", audits);

}

main().catch(console.error).finally(() => process.exit(0));
