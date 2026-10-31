"use server";

import { db } from "@/db";
import { 
  purchaseOrders, 
  spotPurchases,
  locationRoleAssignments, 
  organizationRoleAssignments, 
  employeeRoleAssignments, 
  employees,
  businessRoles,
  taskInstances,
  taskDefinitions,
  vendors,
  branchPurchasePolicies,
  items,
} from "@/db/schema";
import { eq, desc, and, inArray, or, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";

export interface GlobalPendingTaskItem {
  id: string;
  title: string;
  description: string;
  type: "APPROVAL" | "AUDIT" | "FINANCE" | "ROUTINE";
  priority: "HIGH" | "NORMAL";
  isEscalated?: boolean;
  actionUrl: string;
  actionLabel: string;
  createdAt?: string;
  poId?: string;
  publicToken?: string | null;
  spotPurchaseId?: string;
  spotPurchase?: {
    id: string;
    voucherNumber: string;
    vendorName: string;
    totalAmount: string | number;
    itemName?: string | null;
    quantity?: string | number;
    uom?: string;
    unitPrice?: string | number;
    paymentSource?: string;
    receiptPhotoUrl?: string | null;
    createdAt?: Date | string;
    organizationId: string;
    locationId: string;
  };
}

export async function fetchGlobalPendingTasks(params?: {
  organizationId?: string;
  locationId?: string;
}): Promise<{
  success: boolean;
  tasks: GlobalPendingTaskItem[];
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, tasks: [], error: "Unauthorized. Please log in." };
    }

    const context = await getSessionContext(session.user);
    const primaryScope = context.scopes[0];
    const organizationId = params?.organizationId || primaryScope?.organizationId;
    const locationId = params?.locationId || primaryScope?.locationId;
    const isOwner = context.isOwner || false;
    const userId = session.user.id;

    if (!organizationId) {
      return { success: true, tasks: [] };
    }

    // 1. Load active direct role assignments & dynamic authority delegation (for subordinates on leave)
    const { getEffectiveUserAuthority } = await import("@/domains/session/delegationAuthority");
    const authority = await getEffectiveUserAuthority(userId, organizationId);
    const userRoleIds: string[] = authority.effectiveRoleIds;
    const delegatedRoleIdsSet = new Set(authority.delegatedRoleIds);

    const tenantQs = organizationId 
      ? `&organizationId=${organizationId}${locationId && locationId !== "ALL" ? `&locationId=${locationId}` : ""}`
      : "";

    const poTenantFilters = [
      eq(purchaseOrders.organizationId, organizationId),
      locationId && locationId !== "ALL" ? eq(purchaseOrders.locationId, locationId) : undefined,
    ].filter(Boolean);

    // 2. Fetch Pending Audits (Shift-End Spot Purchases)
    const pendingAuditsPromise = db
      .select({
        id: spotPurchases.id,
        voucherNumber: spotPurchases.voucherNumber,
        vendorName: spotPurchases.vendorName,
        totalAmount: spotPurchases.totalAmount,
        submittedByUserId: spotPurchases.submittedByUserId,
        locationId: spotPurchases.locationId,
        createdAt: spotPurchases.createdAt,
        itemName: items.nameEn,
        quantity: spotPurchases.quantity,
        uom: spotPurchases.uom,
        unitPrice: spotPurchases.unitPrice,
        paymentSource: spotPurchases.paymentSource,
        receiptPhotoUrl: spotPurchases.receiptPhotoUrl,
      })
      .from(spotPurchases)
      .leftJoin(items, eq(spotPurchases.itemId, items.id))
      .where(and(
        eq(spotPurchases.organizationId, organizationId),
        eq(spotPurchases.auditStatus, "PENDING_AUDIT"),
        locationId && locationId !== "ALL" ? eq(spotPurchases.locationId, locationId) : undefined
      ))
      .orderBy(desc(spotPurchases.createdAt))
      .limit(5);

    // 3. Fetch Pending Approvals (POs awaiting review/approval)
    const pendingApprovalPOsPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        processOwnerRoleId: purchaseOrders.processOwnerRoleId,
        reviewRoleId: purchaseOrders.reviewRoleId,
        status: purchaseOrders.status,
        publicToken: purchaseOrders.publicToken,
        createdByUserId: purchaseOrders.createdByUserId,
      })
      .from(purchaseOrders)
      .where(and(
        inArray(purchaseOrders.status, ["draft", "pending_approval", "pending_review"]),
        ...poTenantFilters
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(10);

    // 4. Fetch Cashier Payment Audit Queue (Received POs awaiting initial cashier check-in)
    const pendingCashierAuditsPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        cashierBillAmount: purchaseOrders.cashierBillAmount,
        billReviewRoleId: purchaseOrders.billReviewRoleId,
        status: purchaseOrders.status,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.status, "received"),
        ...poTenantFilters
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(10);

    // 5. Fetch Pending Finance / Accounts Review (Accounts Pending & Escalated Audited POs)
    const pendingAccountsPOsPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        cashierBillAmount: purchaseOrders.cashierBillAmount,
        billReviewRoleId: purchaseOrders.billReviewRoleId,
        status: purchaseOrders.status,
      })
      .from(purchaseOrders)
      .where(and(
        inArray(purchaseOrders.status, ["accounts_pending", "audited"]),
        ...poTenantFilters
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(10);

    // 6. Fetch POs Awaiting Delivery / Goods Receipt (sent_to_vendor, ordered, approved, in_transit)
    const pendingGoodsReceiptPOsPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        vendorName: vendors.name,
        processOwnerRoleId: purchaseOrders.processOwnerRoleId,
        reviewRoleId: purchaseOrders.reviewRoleId,
        status: purchaseOrders.status,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(
        inArray(purchaseOrders.status, ["sent_to_vendor", "ordered", "approved", "in_transit"]),
        isNull(purchaseOrders.receivedByUserId),
        ...poTenantFilters
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(10);

    const [pendingAudits, pendingApprovalPOs, pendingCashierAudits, pendingAccountsPOs, pendingGoodsReceiptPOs] = await Promise.all([
      pendingAuditsPromise,
      pendingApprovalPOsPromise,
      pendingCashierAuditsPromise,
      pendingAccountsPOsPromise,
      pendingGoodsReceiptPOsPromise,
    ]);

    const tasks: GlobalPendingTaskItem[] = [];

    // Get all assigned roles in organization to detect vacant reviewer roles and reporting hierarchy
    const occupiedRoleIds = new Set<string>();
    const orgRoleMap = new Map<string, string | null>(); // roleId -> reportsToRoleId

    const [allLocAssignments, allOrgAssignments, allEmpAssignments, allOrgRoles, allTaskDefs, branchPolicies] = await Promise.all([
      db.select({ roleId: locationRoleAssignments.roleId }).from(locationRoleAssignments).where(eq(locationRoleAssignments.organizationId, organizationId)),
      db.select({ roleId: organizationRoleAssignments.roleId }).from(organizationRoleAssignments).where(eq(organizationRoleAssignments.organizationId, organizationId)),
      db.select({ roleId: employeeRoleAssignments.roleId }).from(employeeRoleAssignments).where(and(eq(employeeRoleAssignments.organizationId, organizationId), eq(employeeRoleAssignments.isActive, true))),
      db.select({ id: businessRoles.id, reportsToRoleId: businessRoles.reportsToRoleId }).from(businessRoles).where(eq(businessRoles.organizationId, organizationId)),
      db.select({
        id: taskDefinitions.id,
        module: taskDefinitions.module,
        title: taskDefinitions.title,
        targetRoleId: taskDefinitions.targetRoleId,
        completionTimeMins: taskDefinitions.completionTimeMins,
      }).from(taskDefinitions).where(eq(taskDefinitions.organizationId, organizationId)),
      db.select().from(branchPurchasePolicies).where(eq(branchPurchasePolicies.organizationId, organizationId)),
    ]);

    allLocAssignments.forEach(r => occupiedRoleIds.add(r.roleId));
    allOrgAssignments.forEach(r => occupiedRoleIds.add(r.roleId));
    allEmpAssignments.forEach(r => occupiedRoleIds.add(r.roleId));
    allOrgRoles.forEach(r => orgRoleMap.set(r.id, r.reportsToRoleId));

    const policyMap = new Map<string, typeof branchPolicies[0]>();
    branchPolicies.forEach(p => policyMap.set(p.locationId, p));

    // Map Shift-End Spot Purchases Audits
    for (const audit of pendingAudits) {
      // 1. Segregation of Duties: The user who created the spot purchase can NEVER audit their own purchase
      if (audit.submittedByUserId && audit.submittedByUserId === userId) {
        continue;
      }

      const locPolicy = audit.locationId ? policyMap.get(audit.locationId) : null;
      const reviewRoleId = locPolicy?.reviewRoleId;
      const escalationRoleId = locPolicy?.escalationRoleId;
      const slaHours = locPolicy?.slaHours ?? 4;
      const autoEscalateToOwner = locPolicy?.autoEscalateToOwner ?? true;

      // Calculate elapsed hours since creation to check SLA breach
      const hoursSinceCreated = audit.createdAt
        ? (Date.now() - new Date(audit.createdAt).getTime()) / (1000 * 60 * 60)
        : 0;
      const isSlaBreached = hoursSinceCreated > slaHours;

      let isAssigned = false;

      if (isSlaBreached) {
        // SLA Breached: Route to Escalation Role, or System Owner if configured or role vacant
        if (escalationRoleId && userRoleIds.includes(escalationRoleId)) {
          isAssigned = true;
        } else if (autoEscalateToOwner && isOwner) {
          isAssigned = true;
        } else if (isOwner && (!escalationRoleId || !occupiedRoleIds.has(escalationRoleId))) {
          isAssigned = true;
        }
      } else {
        // Within SLA: Route to Designated Reviewer Role
        if (reviewRoleId) {
          const isRoleAssigned = userRoleIds.includes(reviewRoleId);
          const isRoleVacant = !occupiedRoleIds.has(reviewRoleId);
          isAssigned = isRoleAssigned || (isOwner && isRoleVacant);
        } else {
          // If no specific review role configured, default to System Owner
          isAssigned = isOwner;
        }
      }

      if (isAssigned) {
        tasks.push({
          id: `audit-${audit.id}`,
          title: `Shift-End Audit Required: ${audit.voucherNumber || audit.id.slice(0, 8)}${isSlaBreached ? " (SLA Overdue)" : ""}`,
          description: isSlaBreached
            ? `Spot purchase of ₹${Number(audit.totalAmount).toLocaleString("en-IN")} from ${audit.vendorName} is past the ${slaHours}h SLA. Escalated for review.`
            : `Spot purchase of ₹${Number(audit.totalAmount).toLocaleString("en-IN")} from ${audit.vendorName} requires manager review.`,
          type: "AUDIT",
          priority: isSlaBreached ? "HIGH" : "NORMAL",
          actionUrl: `/purchasing/dashboard?view=audit${tenantQs ? `&${tenantQs.slice(1)}` : ""}#shift-end-audit`,
          actionLabel: "Audit Now",
          createdAt: audit.createdAt ? new Date(audit.createdAt).toISOString() : undefined,
          spotPurchaseId: audit.id,
          spotPurchase: {
            id: audit.id,
            voucherNumber: audit.voucherNumber,
            vendorName: audit.vendorName,
            totalAmount: audit.totalAmount,
            itemName: audit.itemName,
            quantity: audit.quantity,
            uom: audit.uom,
            unitPrice: audit.unitPrice,
            paymentSource: audit.paymentSource,
            receiptPhotoUrl: audit.receiptPhotoUrl,
            createdAt: audit.createdAt,
            organizationId,
            locationId: audit.locationId || locationId,
          },
        });
      }
    }

    // Dynamic SLA lookup from Task Engine configurations
    // 1. Cashier Review SLA: lookup rule for module 'finance' or title matching 'cashier' / 'bill'
    const cashierDef = allTaskDefs.find(d => 
      d.module === "finance" || 
      d.title.toLowerCase().includes("cashier") || 
      d.title.toLowerCase().includes("bill")
    );
    const cashierSlaHours = cashierDef?.completionTimeMins ? (Number(cashierDef.completionTimeMins) / 60) : 4; // default 4 hrs

    // 2. Goods Receipt SLA: lookup rule for module 'purchase' or title matching 'receipt' / 'delivery'
    const goodsReceiptDef = allTaskDefs.find(d => 
      (d.module === "purchase" && (d.title.toLowerCase().includes("receipt") || d.title.toLowerCase().includes("delivery")))
    );
    const goodsReceiptSlaHours = goodsReceiptDef?.completionTimeMins ? (Number(goodsReceiptDef.completionTimeMins) / 60) : 15; // default 15 hrs (order night to morning delivery)

    // Map Purchase Order Approvals
    for (const po of pendingApprovalPOs) {
      // 1. The user who created the PO cannot approve their own PO
      if (po.createdByUserId && po.createdByUserId === userId) {
        continue;
      }

      // 2. An approver must hold the designated review role
      const targetRoleId = po.reviewRoleId || (po.status === "draft" ? po.processOwnerRoleId : null);
      const isRoleAssigned = targetRoleId ? userRoleIds.includes(targetRoleId) : false;

      // 3. If the role is vacant (nobody is assigned in the org) or not set, escalate to System Owner
      const isRoleVacant = targetRoleId ? !occupiedRoleIds.has(targetRoleId) : true;
      const isAssigned = isRoleAssigned || (isOwner && isRoleVacant);

      if (isAssigned) {
        tasks.push({
          id: `po-approval-${po.id}`,
          title: `PO Approval Pending: ${po.poNumber || po.id.slice(0, 8)}`,
          description: `Total Amount: ₹${Number(po.totalAmount).toLocaleString("en-IN")}. Awaiting review & approval.`,
          type: "APPROVAL",
          priority: "HIGH",
          actionUrl: `/purchasing/review/${po.id}${tenantQs ? `?${tenantQs.slice(1)}` : ""}`,
          actionLabel: "Review & Approve",
          poId: po.id,
          publicToken: po.publicToken,
        });
      }
    }

    // Map Goods Receipt Tasks (Ordered / Sent to Vendor POs awaiting delivery check-in)
    for (const po of pendingGoodsReceiptPOs) {
      // 1. Target role: processOwnerRoleId (e.g. Head Chef) or reviewRoleId
      const targetRoleId = po.processOwnerRoleId || po.reviewRoleId;
      const isRoleAssigned = targetRoleId ? userRoleIds.includes(targetRoleId) : false;

      // 2. Supervisor / Reporting check
      let isSupervisor = false;
      if (targetRoleId && orgRoleMap.has(targetRoleId)) {
        const supervisorRoleId = orgRoleMap.get(targetRoleId);
        if (supervisorRoleId && userRoleIds.includes(supervisorRoleId)) {
          isSupervisor = true;
        }
      }

      // Check delivery duration against configured Goods Receipt SLA window (e.g. 15 hours)
      const hoursSinceOrdered = po.createdAt ? (Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60) : 0;
      const isDeliveryOverdue = hoursSinceOrdered > goodsReceiptSlaHours;

      // 3. If the role is vacant or overdue, escalate
      const isRoleVacant = targetRoleId ? !occupiedRoleIds.has(targetRoleId) : true;
      const isAssigned = isRoleAssigned || (isSupervisor && isDeliveryOverdue) || (isOwner && (isRoleVacant || hoursSinceOrdered > 36));

      if (isAssigned) {
        const poNum = po.poNumber || po.id.slice(0, 8).toUpperCase();
        tasks.push({
          id: `goods-receipt-${po.id}`,
          title: `Receive Goods: ${poNum}${isDeliveryOverdue ? " (Delayed Delivery)" : ""}`,
          description: isDeliveryOverdue
            ? `Delivery delayed (${Math.round(hoursSinceOrdered)}h since order vs ${goodsReceiptSlaHours}h SLA). Vendor: ${po.vendorName || "Supplier"}. Verify if shipment arrived.`
            : `Vendor: ${po.vendorName || "Supplier"}. Total: ₹${Number(po.totalAmount).toLocaleString("en-IN")}. Verify and receive items into inventory.`,
          type: "ROUTINE",
          priority: isDeliveryOverdue ? "HIGH" : "NORMAL",
          actionUrl: `/purchasing/dashboard?receivePoId=${po.id}${tenantQs ? `&${tenantQs.slice(1)}` : ""}`,
          actionLabel: "Receive Goods",
          createdAt: po.createdAt ? new Date(po.createdAt).toISOString() : undefined,
          poId: po.id,
        });
      }
    }

    // Map Cashier Payment Audit Queue (Received / Audited POs)
    for (const po of pendingCashierAudits) {
      // 1. Check if current user directly holds the billReviewRole (e.g. Cashier)
      const isRoleAssigned = po.billReviewRoleId ? userRoleIds.includes(po.billReviewRoleId) : false;
      
      // 2. Check if the designated role is vacant across the organization
      const isRoleVacant = po.billReviewRoleId ? !occupiedRoleIds.has(po.billReviewRoleId) : true;

      // 3. Check if current user holds a supervisory/reporting role over the billReviewRole
      let isSupervisor = false;
      if (po.billReviewRoleId && orgRoleMap.has(po.billReviewRoleId)) {
        const directSupervisorRoleId = orgRoleMap.get(po.billReviewRoleId);
        if (directSupervisorRoleId && userRoleIds.includes(directSupervisorRoleId)) {
          isSupervisor = true;
        }
      }

      // Check if SLA timeout has been breached using the dynamically configured SLA window
      const hoursSinceReceived = po.createdAt ? (Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60) : 0;
      const isSlaBreached = hoursSinceReceived > cashierSlaHours;

      // Assign to user if:
      // a) User is the primary Cashier/Reviewer
      // b) User is the Supervisor and the task has breached SLA (escalated)
      // c) User is System Owner and the role is completely vacant or severely overdue (> 24h)
      const isAssigned = isRoleAssigned || (isSupervisor && isSlaBreached) || (isOwner && (isRoleVacant || hoursSinceReceived > 24));

      if (isAssigned) {
        tasks.push({
          id: `cashier-audit-${po.id}`,
          title: `Cashier Review: ${po.poNumber || po.id.slice(0, 8)}${isSlaBreached ? " (Overdue)" : ""}`,
          description: isSlaBreached 
            ? `Escalated to Supervisor: Cashier review exceeded configured SLA (${Math.round(hoursSinceReceived)}h elapsed vs ${cashierSlaHours}h limit). Awaiting physical bill verification.`
            : `Supplier goods received. Awaiting physical bill verification and audit payment approval (SLA: ${cashierSlaHours}h).`,
          type: "AUDIT",
          priority: isSlaBreached ? "HIGH" : "NORMAL",
          actionUrl: `/finance/purchases-payables/audit-queue${tenantQs ? `?${tenantQs.slice(1)}` : ""}`,
          actionLabel: "Audit Bill",
          poId: po.id,
        });
      }
    }

    // Map Accounts / Finance Processing Bills
    for (const po of pendingAccountsPOs) {
      const isRoleAssigned = po.billReviewRoleId ? userRoleIds.includes(po.billReviewRoleId) : false;
      const isRoleVacant = po.billReviewRoleId ? !occupiedRoleIds.has(po.billReviewRoleId) : true;
      const isAssigned = isRoleAssigned || (isOwner && isRoleVacant);

      if (isAssigned) {
        const amt = Number(po.cashierBillAmount || po.totalAmount || 0);
        tasks.push({
          id: `finance-bill-${po.id}`,
          title: `Finance Processing Pending: ${po.poNumber || po.id.slice(0, 8)}`,
          description: `Amount: ₹${amt.toLocaleString("en-IN")}. Awaiting supplier bill entry into finance ledger.`,
          type: "FINANCE",
          priority: "HIGH",
          actionUrl: `/finance/purchases-payables/bills${tenantQs ? `?${tenantQs.slice(1)}` : ""}`,
          actionLabel: "Process Bill",
          poId: po.id,
        });
      }
    }

    // 6. Fetch Task Engine: Pending Audits & Escalations (status = 'audit_pending')
    const taskEngineConditions = [
      eq(taskInstances.organizationId, organizationId),
      eq(taskInstances.status, "audit_pending"),
    ];

    if (!isOwner) {
      if (userRoleIds.length > 0) {
        taskEngineConditions.push(
          or(
            eq(taskInstances.assignedUserId, userId),
            inArray(taskInstances.assignedRoleId, userRoleIds)
          )!
        );
      } else {
        taskEngineConditions.push(eq(taskInstances.assignedUserId, userId));
      }
    }

    const taskAuditResults = await db
      .select({
        instance: taskInstances,
        definition: taskDefinitions,
      })
      .from(taskInstances)
      .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .where(and(...taskEngineConditions))
      .orderBy(desc(taskInstances.updatedAt))
      .limit(10);

    for (const { instance, definition } of taskAuditResults) {
      const ctx: any = instance.contextData || {};
      // If location filter applies and instance is tied to a different location, skip
      if (locationId && locationId !== "ALL" && ctx.locationId && ctx.locationId !== locationId) {
        continue;
      }

      const taskTitle = ctx.title || definition.title || "Audit Task";
      const isEscalated = Boolean(ctx.escalated || ctx.escalationReason || (instance.escalationLevel && instance.escalationLevel > 0));
      const descText = isEscalated 
        ? `Escalated to management: ${ctx.escalationReason || "Deadline missed by assignee"}. Awaiting your audit / approval.`
        : (ctx.description || definition.description || "Task execution complete. Requires supervisor audit verification.");

      tasks.push({
        id: `task-engine-audit-${instance.id}`,
        title: `Audit Required: ${taskTitle}`,
        description: descText,
        type: "AUDIT",
        priority: "HIGH",
        isEscalated,
        actionUrl: `/tasks?tab=audit${tenantQs}`,
        actionLabel: "Audit Task",
        createdAt: instance.createdAt ? new Date(instance.createdAt).toISOString() : undefined,
      });
    }

    // 7. Fetch Task Engine: Active Routine/Assigned Tasks (status in ('pending', 'in_progress'))
    // Best Practice (Industry Standard): When a task is escalated, it remains visible and actionable
    // to the original assignee / operational role, while simultaneously notifying supervisor and management roles.
    const activeRoutineConditions = [
      eq(taskInstances.organizationId, organizationId),
      inArray(taskInstances.status, ["pending", "in_progress"]),
    ];

    if (!isOwner) {
      if (userRoleIds.length > 0) {
        activeRoutineConditions.push(
          or(
            eq(taskInstances.assignedUserId, userId),
            inArray(taskInstances.assignedRoleId, userRoleIds),
            // Match if user's role was the initial responsible role (stored in contextData)
            sql`(${taskInstances.contextData}->>'initialRoleId') IN (${sql.join(userRoleIds.map(r => sql`${r}`), sql`, `)})`,
            // Match if user's role is in the escalation role history
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(COALESCE(${taskInstances.contextData}->'escalationRoleHistory', '[]'::jsonb)) AS elem
              WHERE elem IN (${sql.join(userRoleIds.map(r => sql`${r}`), sql`, `)})
            )`
          )!
        );
      } else {
        activeRoutineConditions.push(eq(taskInstances.assignedUserId, userId));
      }
    }

    const activeRoutineTasks = await db
      .select({
        instance: taskInstances,
        definition: taskDefinitions,
      })
      .from(taskInstances)
      .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .where(and(...activeRoutineConditions))
      .orderBy(desc(taskInstances.dueAt))
      .limit(10);

    for (const { instance, definition } of activeRoutineTasks) {
      const ctx: any = instance.contextData || {};
      if (locationId && locationId !== "ALL" && ctx.locationId && ctx.locationId !== locationId) {
        continue;
      }

      const isPurchasingRoutine = Boolean(ctx.scheduleId || ctx.vendorId || ctx.actionUrl?.includes("stock-assessment"));
      
      // If this is an operational purchasing routine task (e.g. Daily Stock Assessment),
      // allow:
      // 1. Directly assigned user
      // 2. User holding current assignedRoleId
      // 3. User holding initial responsible role (e.g. Tandoori Chef / Raju)
      // 4. User holding any intermediate escalation role (e.g. Head Chef)
      // 5. System Owner / Executive Director
      if (isPurchasingRoutine && !isOwner) {
        const isDirectlyAssigned = instance.assignedUserId === userId;
        const hasCurrentAssignedRole = Boolean(instance.assignedRoleId && userRoleIds.includes(instance.assignedRoleId));
        const hasInitialRole = Boolean(ctx.initialRoleId && userRoleIds.includes(ctx.initialRoleId));
        const hasHistoryRole = Array.isArray(ctx.escalationRoleHistory) 
          && ctx.escalationRoleHistory.some((rid: string) => userRoleIds.includes(rid));

        if (!isDirectlyAssigned && !hasCurrentAssignedRole && !hasInitialRole && !hasHistoryRole) {
          continue;
        }
      }

      const taskTitle = ctx.vendorName 
        ? `Stock Assessment: ${ctx.vendorName}` 
        : (ctx.title || definition.title || "Routine Task");
      
      // Format time strictly in Asia/Kolkata (IST) so user sees actual scheduled/due time in their local timezone
      const dueStr = instance.dueAt 
        ? `Due: ${new Date(instance.dueAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit', hour12: true })}` 
        : "";

      const isEscalated = Boolean(ctx.escalated || ctx.escalationReason || (instance.escalationLevel && instance.escalationLevel > 0));

      tasks.push({
        id: `task-engine-routine-${instance.id}`,
        title: isPurchasingRoutine ? taskTitle : `Task: ${taskTitle}`,
        description: `${ctx.description || (isPurchasingRoutine ? "Scheduled daily purchasing order cycle started. Stock assessment pending completion." : definition.description) || "Assigned task awaiting completion."}${dueStr ? ` • ${dueStr}` : ""}`,
        type: "ROUTINE",
        priority: isEscalated || instance.priority === "high" || instance.priority === "HIGH" ? "HIGH" : "NORMAL",
        isEscalated,
        actionUrl: ctx.actionUrl ? `${ctx.actionUrl}${tenantQs}` : `/tasks${tenantQs ? `?${tenantQs.slice(1)}` : ""}`,
        actionLabel: ctx.actionLabel || (isPurchasingRoutine ? "Assess Stock" : "Open Task"),
        createdAt: instance.createdAt ? new Date(instance.createdAt).toISOString() : undefined,
      });
    }

    return {
      success: true,
      tasks,
    };
  } catch (error: any) {
    console.error("fetchGlobalPendingTasks error:", error);
    return {
      success: false,
      tasks: [],
      error: error?.message || "Failed to fetch pending tasks",
    };
  }
}
