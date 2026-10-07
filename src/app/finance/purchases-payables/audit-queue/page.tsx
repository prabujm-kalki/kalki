import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, items, vendors, locationRoleAssignments, organizationRoleAssignments } from "@/db/schema";
import { eq, and, isNotNull, inArray, or, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PaymentAuditQueue } from "@/components/finance/PaymentAuditQueue";
import { loadAuthorizationGrants } from "@/lib/authorization";

export default async function PaymentAuditPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const grants = await loadAuthorizationGrants(session.user.id);
  
  let userRoleIds: string[] = [];
  if (!grants.isOwner) {
    const locRoles = await db.select({ roleId: locationRoleAssignments.roleId }).from(locationRoleAssignments).where(eq(locationRoleAssignments.userId, session.user.id));
    const orgRoles = await db.select({ roleId: organizationRoleAssignments.roleId }).from(organizationRoleAssignments).where(eq(organizationRoleAssignments.userId, session.user.id));
    userRoleIds = [...new Set([...locRoles.map(r => r.roleId), ...orgRoles.map(r => r.roleId)])];
  }

  const rawPos = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      status: purchaseOrders.status,
      vendorName: vendors.name,
      totalAmount: purchaseOrders.totalAmount,
      verifiedBillAmount: purchaseOrders.cashierBillAmount,
      publicToken: purchaseOrders.publicToken,
      processOwnerAttachments: purchaseOrders.processOwnerAttachments,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .where(
      and(
        inArray(purchaseOrders.status, ["received", "audited"]),
        grants.isOwner ? isNotNull(purchaseOrders.id) : 
        (userRoleIds.length > 0 
          ? or(isNull(purchaseOrders.billReviewRoleId), inArray(purchaseOrders.billReviewRoleId, userRoleIds))
          : isNull(purchaseOrders.billReviewRoleId))
      )
    )
    .orderBy(purchaseOrders.createdAt);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Audit Queue</h1>
          <p className="muted">Audit and verify received Purchase Orders before final payment.</p>
        </div>
      </div>

      <PaymentAuditQueue initialPos={rawPos} />
    </div>
  );
}
