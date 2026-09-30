import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, items, vendors } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CashierAuditQueue } from "@/components/finance/CashierAuditQueue";

export default async function CashierPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  // Fetch POs that are 'received' or any equivalent status awaiting cashier audit
  const rawPos = await db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      vendorName: vendors.name,
      totalAmount: purchaseOrders.totalAmount,
      cashierBillAmount: purchaseOrders.cashierBillAmount,
      publicToken: purchaseOrders.publicToken,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .where(
      eq(purchaseOrders.status, "received") // Status updated by manager after receiving
    )
    .orderBy(purchaseOrders.createdAt);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cashier Audit Queue</h1>
          <p className="muted">Audit and verify received Purchase Orders before final payment.</p>
        </div>
      </div>

      <CashierAuditQueue initialPos={rawPos} />
    </div>
  );
}
