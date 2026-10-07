import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, vendors, businessRoles, locationRoleAssignments, organizationRoleAssignments, authUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [po] = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        vendorName: vendors.name,
        cashierBillAmount: purchaseOrders.cashierBillAmount,
        cashierPaymentMethod: purchaseOrders.cashierPaymentMethod,
        cashierAttachments: purchaseOrders.cashierAttachments,
        processOwnerAttachments: purchaseOrders.processOwnerAttachments,
        locationId: purchaseOrders.locationId,
        organizationId: purchaseOrders.organizationId,
        processOwnerRoleId: purchaseOrders.processOwnerRoleId,
        reviewRoleId: purchaseOrders.reviewRoleId,
        billReviewRoleId: purchaseOrders.billReviewRoleId,
        createdByUserId: purchaseOrders.createdByUserId,
        approvedByUserId: purchaseOrders.approvedByUserId,
        receivedByUserId: purchaseOrders.receivedByUserId,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    const logs = [];

    // Pending Info Logic
    let pendingRoleName = null;
    let pendingEmployeeName = null;

    let expectsPending = false;
    let targetRoleId = null;
    if (po.status === 'pending_approval' || po.status === 'pending_review') { targetRoleId = po.reviewRoleId; expectsPending = true; }
    if (po.status === 'accounts_pending' || po.status === 'audit_pending' || po.status === 'received' || po.status === 'audited') { targetRoleId = po.billReviewRoleId; expectsPending = true; }
    if (po.status === 'draft') { targetRoleId = po.processOwnerRoleId; expectsPending = true; }

    if (targetRoleId) {
      const [roleInfo] = await db.select({ name: businessRoles.name }).from(businessRoles).where(eq(businessRoles.id, targetRoleId));
      if (roleInfo) {
        pendingRoleName = roleInfo.name;
        // Fetch assignee
        const assignees = await db
          .select({ name: authUsers.name })
          .from(locationRoleAssignments)
          .innerJoin(authUsers, eq(locationRoleAssignments.userId, authUsers.id))
          .where(and(eq(locationRoleAssignments.roleId, targetRoleId), eq(locationRoleAssignments.locationId, po.locationId)))
          .limit(1);
        if (assignees.length > 0) {
          pendingEmployeeName = assignees[0].name;
        } else {
          const orgAssignees = await db
            .select({ name: authUsers.name })
            .from(organizationRoleAssignments)
            .innerJoin(authUsers, eq(organizationRoleAssignments.userId, authUsers.id))
            .where(and(eq(organizationRoleAssignments.roleId, targetRoleId), eq(organizationRoleAssignments.organizationId, po.organizationId)))
            .limit(1);
          if (orgAssignees.length > 0) {
            pendingEmployeeName = orgAssignees[0].name;
          }
        }
      }
    } else if (expectsPending) {
      pendingRoleName = "System Owner (Escalated)";
      pendingEmployeeName = "System Owner";
    }

    // 1. Created
    let drafterName = 'System / Process Owner';
    if (po.createdByUserId) {
      const u = await db.select({ name: authUsers.name }).from(authUsers).where(eq(authUsers.id, po.createdByUserId)).limit(1);
      if (u.length > 0) drafterName = u[0].name;
    } else if (po.processOwnerRoleId) {
      const drafterQuery = await db
        .select({ name: authUsers.name })
        .from(locationRoleAssignments)
        .innerJoin(authUsers, eq(locationRoleAssignments.userId, authUsers.id))
        .where(and(eq(locationRoleAssignments.roleId, po.processOwnerRoleId), eq(locationRoleAssignments.locationId, po.locationId)))
        .limit(1);
      if (drafterQuery.length > 0) drafterName = drafterQuery[0].name;
      else {
        const orgDrafterQuery = await db
          .select({ name: authUsers.name })
          .from(organizationRoleAssignments)
          .innerJoin(authUsers, eq(organizationRoleAssignments.userId, authUsers.id))
          .where(and(eq(organizationRoleAssignments.roleId, po.processOwnerRoleId), eq(organizationRoleAssignments.organizationId, po.organizationId)))
          .limit(1);
        if (orgDrafterQuery.length > 0) drafterName = orgDrafterQuery[0].name;
      }
    }

    logs.push({
      id: `${id}-created`,
      action: 'Purchase Order Drafted',
      createdAt: po.createdAt,
      actorName: drafterName,
      metadata: {
        Vendor: po.vendorName,
        TotalAmount: po.totalAmount
      }
    });

    // 2. Verified by Cashier (if applicable)
    if (po.cashierBillAmount) {
      logs.push({
        id: `${id}-cashier`,
        action: 'Verified by Cashier',
        createdAt: po.updatedAt,
        actorName: 'Cashier',
        metadata: {
          BilledAmount: po.cashierBillAmount,
          PaymentMethod: po.cashierPaymentMethod || 'cash',
          Attachments: po.cashierAttachments ? 'Yes' : 'No'
        }
      });
    }

    // 3. Process Owner Proof (if applicable)
    if (po.receivedByUserId || po.processOwnerAttachments || po.status === 'received' || po.status === 'completed' || po.status === 'audited' || po.status === 'accounts_pending') {
      let receiverName = 'Process Owner';
      if (po.receivedByUserId) {
        const u = await db.select({ name: authUsers.name }).from(authUsers).where(eq(authUsers.id, po.receivedByUserId)).limit(1);
        if (u.length > 0) receiverName = u[0].name;
      }
      logs.push({
        id: `${id}-process-owner`,
        action: 'Goods Received',
        createdAt: po.updatedAt,
        actorName: receiverName,
        metadata: {
          ProofUploaded: (po.processOwnerAttachments && Array.isArray(po.processOwnerAttachments) && po.processOwnerAttachments.length > 0) ? 'Yes' : 'No'
        }
      });
    }

    if (po.status === 'audited' || po.status === 'completed' || po.status === 'received' || po.approvedByUserId) {
      let approverName = 'Manager / Reviewer';
      if (po.approvedByUserId) {
        const u = await db.select({ name: authUsers.name }).from(authUsers).where(eq(authUsers.id, po.approvedByUserId)).limit(1);
        if (u.length > 0) approverName = u[0].name;
      }
      logs.push({
        id: `${id}-approved`,
        action: 'Purchase Order Approved',
        createdAt: po.updatedAt,
        actorName: approverName,
      });
    }

    // 4. Final Status (if Audited, etc)
    if (po.status === 'audited' || po.status === 'completed') {
      logs.push({
        id: `${id}-audited`,
        action: `Audit ${po.status}`,
        createdAt: po.updatedAt,
        actorName: 'Auditor',
      });
    }

    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ po, logs, pendingRoleName, pendingEmployeeName }, { status: 200 });
  } catch (error: any) {
    console.error("GET po timeline error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
