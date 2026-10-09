import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { salesInvoices, customers, salesReceiptAllocations } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { FileText, Receipt } from "lucide-react";

function formatDate(dateString: string | Date | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export default async function FinanceInvoicesPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  
  const params = await searchParams;
  const organizationId = params.organizationId;
  
  if (!organizationId) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Please select an organization.</div>;
  }

  // Fetch all open invoices for this organization
  const invoices = await db
    .select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceDate: salesInvoices.invoiceDate,
      dueDate: salesInvoices.dueDate,
      totalAmount: salesInvoices.totalAmount,
      status: salesInvoices.status,
      customerName: customers.name,
      paidAmount: sql<number>`COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)`,
      creditApplied: sql<number>`COALESCE((SELECT SUM(CAST(applied_amount AS NUMERIC)) FROM credit_note_applications WHERE applied_to_invoice_id = ${salesInvoices.id}), 0)`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(eq(salesInvoices.organizationId, organizationId), eq(salesInvoices.paymentStatus, 'PENDING')))
    .orderBy(desc(salesInvoices.invoiceDate));

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <h1 className="kalki-page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={24} color="#3b82f6" /> 
          Outstanding Invoices
        </h1>
        <p className="kalki-page-description">Manage and track all unpaid sales invoices waiting for collection.</p>
      </div>

      <div className="kalki-section" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: '#64748b' }}>
            <Receipt size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>No outstanding invoices found.</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>All sales invoices have been paid or none exist yet.</p>
          </div>
        ) : (
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th style={{ textAlign: 'right' }}>Balance Due</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const balanceDue = Number(inv.totalAmount) - Number(inv.paidAmount) - Number(inv.creditApplied);
                const isOverdue = new Date(inv.dueDate) < new Date();
                
                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td>{inv.customerName || 'Unknown Customer'}</td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td style={{ color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                      {formatDate(inv.dueDate)} {isOverdue && '(Overdue)'}
                    </td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                      ₹{Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      ₹{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <a 
                        href={`/finance/sales-receivables/receipts?invoiceId=${inv.id}`}
                        className="kalki-button kalki-button--primary" 
                        style={{ padding: "4px 12px", fontSize: "12px", textDecoration: 'none' }}
                      >
                        Receive Payment
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
