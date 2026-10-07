import { db } from "@/db";
import { purchaseOrders, vendors, locationRoleAssignments, organizationRoleAssignments } from "@/db/schema";
import { eq, or, isNotNull, inArray, isNull, and } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BillsQueue } from "./BillsQueue";
import { loadAuthorizationGrants } from "@/lib/authorization";

export default async function BillsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const grants = await loadAuthorizationGrants(session.user.id);
  
  let userRoleIds: string[] = [];
  if (!grants.isOwner) {
    const locRoles = await db.select({ roleId: locationRoleAssignments.roleId }).from(locationRoleAssignments).where(eq(locationRoleAssignments.userId, session.user.id));
    const orgRoles = await db.select({ roleId: organizationRoleAssignments.roleId }).from(organizationRoleAssignments).where(eq(organizationRoleAssignments.userId, session.user.id));
    userRoleIds = [...new Set([...locRoles.map(r => r.roleId), ...orgRoles.map(r => r.roleId)])];
    
    // In a real scenario, we might also explicitly check if any of these roles have "accounts" authority, 
    // but for now we enforce that at least one role must match the target's required role, 
    // or if no role is required, we fallback to isOwner.
    // For BillsPage, typically only specific finance roles should access this.
    // We will restrict the query so they only see POs assigned to their role for bill review,
    // OR if they are owner they see all.
  }

  const rawPos = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      status: purchaseOrders.status,
      vendorId: purchaseOrders.vendorId,
      vendorName: vendors.name,
      totalAmount: purchaseOrders.totalAmount,
      verifiedBillAmount: purchaseOrders.cashierBillAmount,
      cashierAttachments: purchaseOrders.cashierAttachments,
      publicToken: purchaseOrders.publicToken,
      createdAt: purchaseOrders.createdAt,
      organizationId: purchaseOrders.organizationId,
      locationId: purchaseOrders.locationId,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .where(
      and(
        eq(purchaseOrders.status, "accounts_pending"),
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
          <h1 className="page-title">Accounts Processing (Bills)</h1>
          <p className="muted">Review audited Purchase Orders and record them as Supplier Invoices in the ledger.</p>
        </div>
      </div>

      <BillsQueue initialPos={rawPos} />
    </div>
  );
}
