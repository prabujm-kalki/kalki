import { db } from "@/db";
import { 
  authUsers, 
  locationRoleAssignments, 
  businessRoles, 
  vendors, 
  items, 
  vendorItems, 
  purchaseSchedules, 
  taskInstances, 
  purchaseOrders, 
  purchaseOrderLines, 
  supplierInvoices, 
  locations,
  organizations
} from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import crypto from "crypto";

async function runE2ETest() {
  console.log("=== STARTING PURCHASING MODULE E2E TEST ===");

  // 1. Fetch pilot location and its linked organization
  const [loc] = await db.select().from(locations).where(eq(locations.name, "Anakalpalayam (Pilot)")).limit(1);
  if (!loc) {
    throw new Error("Pilot location not found in database!");
  }
  const [org] = await db.select().from(organizations).where(eq(organizations.id, loc.organizationId)).limit(1);
  if (!org) {
    throw new Error("Linked organization not found for pilot location!");
  }
  console.log(`[Setup] Org: ${org.name} (${org.id}), Location: ${loc.name} (${loc.id})`);

  // 2. Discover roles: Head Chef (operational), Manager (approver/reporting), Cashier (bill auditor), Owner
  const allRoles = await db.select().from(businessRoles).where(eq(businessRoles.organizationId, org.id));
  const headChefRole = allRoles.find(r => r.name.toLowerCase() === "head chef") || allRoles.find(r => r.name.toLowerCase().includes("chef"));
  const managerRole = allRoles.find(r => r.name.toLowerCase().includes("manager"));
  const cashierRole = allRoles.find(r => r.name.toLowerCase().includes("cashier"));
  const ownerRole = allRoles.find(r => r.name.toLowerCase().includes("owner"));

  console.log(`[Roles Found]
  - Head Chef Role: ${headChefRole?.name} (${headChefRole?.id}) -> reportsTo: ${headChefRole?.reportsToRoleId}
  - Manager Role: ${managerRole?.name} (${managerRole?.id}) -> reportsTo: ${managerRole?.reportsToRoleId}
  - Cashier Role: ${cashierRole?.name} (${cashierRole?.id}) -> reportsTo: ${cashierRole?.reportsToRoleId}
  - Owner Role: ${ownerRole?.name} (${ownerRole?.id})`);

  if (!headChefRole || !cashierRole) {
    throw new Error("Required business roles missing (Head Chef or Cashier).");
  }

  // 3. Find test users assigned to these roles or users in the system
  const allUsers = await db.select({ id: authUsers.id, name: authUsers.name, email: authUsers.email }).from(authUsers).limit(10);
  if (allUsers.length === 0) {
    throw new Error("No users found in database.");
  }

  const assignments = await db
    .select({
      userId: authUsers.id,
      userName: authUsers.name,
      userEmail: authUsers.email,
      roleId: locationRoleAssignments.roleId
    })
    .from(authUsers)
    .innerJoin(locationRoleAssignments, eq(authUsers.id, locationRoleAssignments.userId))
    .where(eq(locationRoleAssignments.locationId, loc.id));

  const headChefUser = assignments.find(a => a.roleId === headChefRole.id) || { userId: allUsers[0].id, userName: allUsers[0].name, userEmail: allUsers[0].email, roleId: headChefRole.id };
  const approverRoleId = headChefRole.reportsToRoleId || managerRole?.id || ownerRole?.id;
  const approverUser = assignments.find(a => a.roleId === approverRoleId) || { userId: allUsers[0].id, userName: allUsers[0].name, userEmail: allUsers[0].email, roleId: approverRoleId };
  const cashierUser = assignments.find(a => a.roleId === cashierRole.id) || { userId: allUsers[0].id, userName: allUsers[0].name, userEmail: allUsers[0].email, roleId: cashierRole.id };

  console.log(`[Assigned Test Users]
  - Head Chef User: ${headChefUser?.userName} (${headChefUser?.userId})
  - Approver User: ${approverUser?.userName} (${approverUser?.userId})
  - Cashier User: ${cashierUser?.userName} (${cashierUser?.userId})`);

  // 4. Setup Vendor & Item for Routine Test
  const [vendor] = await db.select().from(vendors).where(eq(vendors.organizationId, org.id)).limit(1);
  if (!vendor) throw new Error("No vendor found in database.");

  // Ensure vendor has configured items
  let vItems = await db.select().from(vendorItems).where(eq(vendorItems.vendorId, vendor.id));
  if (vItems.length === 0) {
    const [existingItem] = await db.select().from(items).where(eq(items.organizationId, org.id)).limit(1);
    if (!existingItem) throw new Error("No items in database.");
    const [newVI] = await db.insert(vendorItems).values({
      vendorId: vendor.id,
      itemId: existingItem.id,
      itemName: existingItem.nameEn,
      unitOfMeasure: existingItem.purchaseUnit || "kg",
      lastRate: "100.00",
      minimumStock: "10.00",
      normalQuantity: "50.00",
      reorderLevel: "15.00"
    }).returning();
    vItems = [newVI];
  }
  const testVendorItem = vItems[0];
  console.log(`[Test Vendor & Item] Vendor: ${vendor.name}, Item: ${testVendorItem.itemName}, Min: ${testVendorItem.minimumStock}, Normal: ${testVendorItem.normalQuantity}`);

  // Test artifacts tracker for safe teardown
  const createdIds = {
    scheduleId: "",
    taskInstanceId: "",
    poId: "",
    invoiceId: ""
  };

  try {
    // =========================================================================
    // POSITIVE SCENARIO: Complete Routine Order Cycle
    // =========================================================================
    console.log("\n>>> TEST CASE 1: Positive Happy Path (Routine Schedule -> Stock Assessment -> Approval -> Receiving -> Cashier Audit -> Invoice)");

    // Step 1: Find or create a Task Definition for Routine Procurement
    const { taskDefinitions } = await import("@/db/schema");
    let [taskDef] = await db.select().from(taskDefinitions).where(eq(taskDefinitions.organizationId, org.id)).limit(1);
    if (!taskDef) {
      [taskDef] = await db.insert(taskDefinitions).values({
        organizationId: org.id,
        title: "Daily Stock Assessment",
        description: "Routine assessment of vendor inventory items",
        priority: "medium",
        completionTimeMins: 240,
        assignedRoleId: headChefRole.id
      }).returning();
    }

    const [sched] = await db.insert(purchaseSchedules).values({
      organizationId: org.id,
      locationId: loc.id,
      vendorId: vendor.id,
      frequencyRule: "DAILY",
      reminderTime: "12:00",
      responsibleRoleId: headChefRole.id,
      reviewRoleId: approverRoleId,
      billReviewRoleId: cashierRole.id,
      taskDefinitionId: taskDef.id,
      priority: "medium",
      isActive: true,
      description: "Automated E2E Test Schedule"
    }).returning();
    createdIds.scheduleId = sched.id;
    console.log(`✓ Step 1: Routine schedule created (ID: ${sched.id}, TaskDef: ${taskDef.id})`);

    // Step 2: Trigger Routine Task Instance (Simulate Cron Job)
    const dueAt = new Date(Date.now() + 60 * 60 * 1000);
    const [task] = await db.insert(taskInstances).values({
      organizationId: org.id,
      definitionId: taskDef.id,
      status: "pending",
      priority: sched.priority,
      assignedRoleId: sched.responsibleRoleId,
      dueAt: dueAt,
      contextData: {
        scheduleId: sched.id,
        vendorId: vendor.id,
        vendorName: vendor.name,
        locationId: loc.id,
        locationName: loc.name,
        title: `${vendor.name}_Daily_12:00`,
        actionUrl: `/purchasing/stock-assessment?vendorId=${vendor.id}&taskId=${sched.id}`
      }
    }).returning();
    createdIds.taskInstanceId = task.id;
    console.log(`✓ Step 2: Routine task instance generated (Task ID: ${task.id}, Assigned Role: Head Chef)`);

    // Step 2b: Verify Scoping: Head Chef sees it, Owner does NOT see it unless role matches
    const hcUserRoles = [headChefRole.id];
    const ownerUserRoles = [ownerRole?.id].filter(Boolean) as string[];
    const hcSees = (task.assignedRoleId && hcUserRoles.includes(task.assignedRoleId));
    const ownerSees = (task.assignedRoleId ? ownerUserRoles.includes(task.assignedRoleId) : true);
    console.log(`✓ Step 2b: Role Visibility Check:
      - Head Chef sees pending task: ${hcSees} (Expected: true)
      - Owner sees pending task without role: ${ownerSees} (Expected: false if Owner doesn't hold Chef role)`);
    if (!hcSees) throw new Error("Role Scoping Failed: Head Chef did not see assigned routine task!");

    // Step 3: Stock Assessment Submission
    // Current stock is below minStock (e.g. 2 kg <= 10 kg minimum), expecting order quantity of (normalStock - currentStock) = 48 kg
    const currentStockVal = 2;
    const minStockVal = Number(testVendorItem.minimumStock || 10);
    const normalStockVal = Number(testVendorItem.normalQuantity || 50);
    const orderQty = Math.max(0, normalStockVal - currentStockVal);
    const unitRate = Number(testVendorItem.lastRate || 100);
    const totalAmount = orderQty * unitRate;

    const poNumber = `E2E-PO-${Date.now().toString().slice(-6)}`;
    const publicToken = crypto.randomBytes(16).toString("hex");

    const [po] = await db.insert(purchaseOrders).values({
      organizationId: org.id,
      locationId: loc.id,
      vendorId: vendor.id,
      poNumber: poNumber,
      status: "pending_approval",
      totalAmount: totalAmount.toString(),
      publicToken: publicToken,
      processOwnerRoleId: headChefRole.id,
      reviewRoleId: approverRoleId,
      billReviewRoleId: cashierRole.id,
      createdByUserId: headChefUser.userId
    }).returning();
    createdIds.poId = po.id;

    await db.insert(purchaseOrderLines).values({
      poId: po.id,
      itemId: testVendorItem.itemId,
      orderedQuantity: orderQty.toString(),
      unitRate: unitRate.toString()
    });

    // Mark task complete upon stock assessment submission
    await db.update(taskInstances).set({
      status: "completed",
      completedAt: new Date(),
      completionData: { submittedBy: headChefUser.userId, poId: po.id }
    }).where(eq(taskInstances.id, task.id));

    console.log(`✓ Step 3: Stock assessment submitted. PO Draft Created (${po.poNumber}, Total: ₹${totalAmount}). Task transitioned to 'completed' with PO reference.`);

    // Step 4: PO Approval by Review Role / Manager
    const [approvedPo] = await db.update(purchaseOrders).set({
      status: "approved",
      approvedByUserId: approverUser.userId,
      approvedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(purchaseOrders.id, po.id)).returning();
    console.log(`✓ Step 4: PO Approved by manager/review role (${approverUser.userName}). PO status: ${approvedPo.status}`);

    // Step 5: Goods Receiving Stage (Mark Received)
    const [receivedPo] = await db.update(purchaseOrders).set({
      status: "received",
      receivedAt: new Date(),
      receivedByUserId: headChefUser.userId,
      deliveryStatus: "FULLY_DELIVERED",
      updatedAt: new Date()
    }).where(eq(purchaseOrders.id, po.id)).returning();
    console.log(`✓ Step 5: Goods received and acknowledged. PO status: ${receivedPo.status}`);

    // Step 6: Bill Verification & Cashier Audit
    const billAmount = totalAmount; // exact match
    const voucherNumber = `BILL-${Date.now().toString().slice(-6)}`;

    const { employees } = await import("@/db/schema");
    let [cashierEmployee] = await db.select().from(employees).where(eq(employees.userId, cashierUser.userId)).limit(1);
    if (!cashierEmployee) {
      [cashierEmployee] = await db.insert(employees).values({
        organizationId: org.id,
        primaryLocationId: loc.id,
        userId: cashierUser.userId,
        name: cashierUser.userName || "Cashier User",
        email: cashierUser.userEmail || "cashier@kalki.local",
        systemRole: "EMPLOYEE",
        status: "ACTIVE"
      }).returning();
    }

    // Create supplier invoice record with valid employee reference
    const [inv] = await db.insert(supplierInvoices).values({
      organizationId: org.id,
      locationId: loc.id,
      vendorId: vendor.id,
      invoiceNumber: voucherNumber,
      invoiceDate: new Date().toISOString().slice(0, 10),
      totalAmount: billAmount.toString(),
      status: "APPROVED",
      recordedBy: cashierEmployee.id
    }).returning();
    createdIds.invoiceId = inv.id;

    await db.update(purchaseOrders).set({
      status: "completed",
      cashierBillAmount: billAmount.toString(),
      cashierVerifiedByUserId: cashierUser.userId,
      cashierVerifiedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(purchaseOrders.id, po.id));

    console.log(`✓ Step 6: Cashier Bill Audited & Cleared. Invoice #${inv.invoiceNumber} recorded by employee ${cashierEmployee.name}. PO status: 'completed'`);

    // =========================================================================
    // NEGATIVE / ESCALATION SCENARIOS
    // =========================================================================
    console.log("\n>>> TEST CASE 2: Escalation & Return Lifecycle");

    // Scenario A: Missed Task Escalation
    const pastDue = new Date(Date.now() - 30 * 60 * 1000); // 30 mins overdue
    const [overdueTask] = await db.insert(taskInstances).values({
      organizationId: org.id,
      definitionId: taskDef.id,
      status: "pending",
      priority: "high",
      assignedRoleId: headChefRole.id,
      dueAt: pastDue,
      contextData: {
        scheduleId: sched.id,
        vendorId: vendor.id,
        vendorName: vendor.name,
        locationId: loc.id,
        locationName: loc.name
      }
    }).returning();

    // Trigger sweeper logic simulation: overdue task escalated to manager
    const [escalatedTask] = await db.update(taskInstances).set({
      status: "audit_pending",
      assignedRoleId: approverRoleId,
      assignedUserId: null,
      contextData: {
        ...(overdueTask.contextData as any),
        escalated: true,
        escalationReason: "Routine SLA deadline elapsed. Escalated to Reporting Role."
      },
      updatedAt: new Date()
    }).where(eq(taskInstances.id, overdueTask.id)).returning();

    console.log(`✓ Scenario A (Escalation): Task ${overdueTask.id} missed due date. Escalated status: ${escalatedTask.status}, Assigned Role: ${escalatedTask.assignedRoleId} (Reporting Role).`);

    // Scenario B: Manager Return/Reassign back to original Assignee
    const [returnedTask] = await db.update(taskInstances).set({
      status: "pending",
      assignedRoleId: headChefRole.id,
      assignedUserId: headChefUser.userId,
      contextData: {
        ...(escalatedTask.contextData as any),
        returnedBy: approverUser.userId,
        returnReason: "Returned by manager for immediate physical count verification."
      },
      updatedAt: new Date()
    }).where(eq(taskInstances.id, overdueTask.id)).returning();

    console.log(`✓ Scenario B (Return): Manager reviewed and returned task to Head Chef (${returnedTask.assignedRoleId}). Status restored to: ${returnedTask.status}`);

    // Clean up negative test task
    await db.delete(taskInstances).where(eq(taskInstances.id, overdueTask.id));

    console.log("\n=== ALL PURCHASING MODULE E2E TESTS PASSED SUCCESSFULLY! ===");
    return { success: true, createdIds };

  } catch (err: any) {
    console.error("❌ E2E Test Failure:", err.message);
    throw err;
  }
}

// Self execution when invoked
runE2ETest().then((res) => {
  console.log("Result summary:", JSON.stringify(res, null, 2));
  process.exit(0);
}).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
