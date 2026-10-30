import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { salesInvoices, customers, salesReceiptAllocations, creditNoteApplications } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import InvoicesClient from "./InvoicesClient";

export default async function FinanceInvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ organizationId?: string; locationId?: string; filter?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const organizationId = params.organizationId;
  const isOverdueOnly = params.filter === "overdue";

  if (!organizationId) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Please select an organization.</div>;
  }

  // Fetch open invoices for this organization
  const whereConditions = [
    eq(salesInvoices.organizationId, organizationId),
    sql`(${salesInvoices.paymentStatus} != 'PAID' AND ${salesInvoices.status} != 'CANCELLED')`
  ];

  if (params.locationId) {
    whereConditions.push(eq(salesInvoices.locationId, params.locationId));
  }

  if (isOverdueOnly) {
    whereConditions.push(sql`${salesInvoices.dueDate} IS NOT NULL AND ${salesInvoices.dueDate} < NOW()`);
  }

  const rawInvoices = await db
    .select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceDate: salesInvoices.invoiceDate,
      dueDate: salesInvoices.dueDate,
      totalAmount: salesInvoices.totalAmount,
      status: salesInvoices.status,
      customerId: salesInvoices.customerId,
      customerName: customers.name,
      locationId: salesInvoices.locationId,
      paidAmount: sql<number>`COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)`,
      creditApplied: sql<number>`COALESCE((SELECT SUM(CAST(applied_amount AS NUMERIC)) FROM credit_note_applications WHERE applied_to_invoice_id = ${salesInvoices.id}), 0)`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(...whereConditions))
    .orderBy(desc(salesInvoices.invoiceDate));

  const invoices = rawInvoices.map((inv) => {
    const total = Number(inv.totalAmount || 0);
    const paid = Number(inv.paidAmount || 0);
    const credited = Number(inv.creditApplied || 0);
    const balanceDue = Math.max(0, total - paid - credited);

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      totalAmount: total,
      paidAmount: paid,
      creditApplied: credited,
      balanceDue,
      customerId: inv.customerId,
      customerName: inv.customerName || "Unknown Customer",
      locationId: inv.locationId
    };
  });

  return (
    <InvoicesClient
      invoices={invoices}
      organizationId={organizationId}
      isOverdueOnly={isOverdueOnly}
    />
  );
}
