import { db } from "@/db";
import { purchaseOrders, vendors, locationRoleAssignments, organizationRoleAssignments } from "@/db/schema";
import { eq, or, isNotNull, inArray, isNull, and } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BillsQueue } from "./BillsQueue";
import { loadAuthorizationGrants } from "@/lib/authorization";

export default async function BillsPage(props: {
  searchParams?: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const searchParams = props.searchParams ? await props.searchParams : {};
  const organizationId = searchParams?.organizationId;
  const locationId = searchParams?.locationId;

  const grants = await loadAuthorizationGrants(session.user.id);
  
  let userRoleIds: string[] = [];
  if (!grants.isOwner) {
    const locRoles = await db.select({ roleId: locationRoleAssignments.roleId }).from(locationRoleAssignments).where(eq(locationRoleAssignments.userId, session.user.id));
    const orgRoles = await db.select({ roleId: organizationRoleAssignments.roleId }).from(organizationRoleAssignments).where(eq(organizationRoleAssignments.userId, session.user.id));
    userRoleIds = [...new Set([...locRoles.map(r => r.roleId), ...orgRoles.map(r => r.roleId)])];
  }

  const conditions: any[] = [
    inArray(purchaseOrders.status, ["accounts_pending", "audited"]),
    grants.isOwner ? isNotNull(purchaseOrders.id) : 
    (userRoleIds.length > 0 
      ? or(isNull(purchaseOrders.billReviewRoleId), inArray(purchaseOrders.billReviewRoleId, userRoleIds))
      : isNull(purchaseOrders.billReviewRoleId))
  ];

  if (organizationId) {
    conditions.push(eq(purchaseOrders.organizationId, organizationId));
  }
  if (locationId && locationId !== "ALL") {
    conditions.push(eq(purchaseOrders.locationId, locationId));
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
    .where(and(...conditions))
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
