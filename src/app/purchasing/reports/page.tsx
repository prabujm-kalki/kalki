import { db } from "@/db";
import { purchaseOrders, vendors } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Download, Filter } from "lucide-react";

export default async function PurchaseReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const resolvedParams = await searchParams;
  const statusFilter = typeof resolvedParams.status === "string" ? resolvedParams.status : "";
  const vendorFilter = typeof resolvedParams.vendor === "string" ? resolvedParams.vendor : "";
  const dateFrom = typeof resolvedParams.from === "string" ? resolvedParams.from : "";
  const dateTo = typeof resolvedParams.to === "string" ? resolvedParams.to : "";
  
  const organizationId = typeof resolvedParams.organizationId === "string" ? resolvedParams.organizationId : "";
  const locationId = typeof resolvedParams.locationId === "string" ? resolvedParams.locationId : "";
  
  const baseQueryStr = (organizationId && locationId) ? `?organizationId=${organizationId}&locationId=${locationId}` : "";

  // Base conditions
  const conditions = [];
  
  if (organizationId) conditions.push(eq(purchaseOrders.organizationId, organizationId));
  if (locationId) conditions.push(eq(purchaseOrders.locationId, locationId));
  
  if (statusFilter) {
    conditions.push(eq(purchaseOrders.status, statusFilter));
  }
  
  if (vendorFilter) {
    conditions.push(eq(purchaseOrders.vendorId, vendorFilter));
  }
  
  if (dateFrom) {
    conditions.push(gte(purchaseOrders.createdAt, new Date(dateFrom)));
  }
  
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(purchaseOrders.createdAt, toDate));
  }

  // Fetch all vendors for the dropdown
  const allVendors = await db.select({ id: vendors.id, name: vendors.name }).from(vendors).orderBy(vendors.name);

  // Fetch data
  const reportData = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      status: purchaseOrders.status,
      vendorName: vendors.name,
      totalAmount: purchaseOrders.totalAmount,
      cashierBillAmount: purchaseOrders.cashierBillAmount,
      paymentMethod: purchaseOrders.paymentMethod,
      publicToken: purchaseOrders.publicToken,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(purchaseOrders.createdAt));

  const formatCurrency = (val: string | number | null) => {
    if (!val) return "₹0.00";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val));
  };

  const totalSpend = reportData.reduce((acc, curr) => acc + Number(curr.cashierBillAmount || curr.totalAmount || 0), 0);

  return (
    <div className="stack">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Purchase Reports</h1>
          <p className="muted">Generate and view detailed industrial standard purchase reports.</p>
        </div>
        <div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}>
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <form style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {organizationId && <input type="hidden" name="organizationId" value={organizationId} />}
          {locationId && <input type="hidden" name="locationId" value={locationId} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Status</label>
            <select name="status" defaultValue={statusFilter} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem', minWidth: '150px' }}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="dispatched">Dispatched</option>
              <option value="received">Received</option>
              <option value="audited">Audited</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Vendor</label>
            <select name="vendor" defaultValue={vendorFilter} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem', minWidth: '200px' }}>
              <option value="">All Vendors</option>
              {allVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>From Date</label>
            <input type="date" name="from" defaultValue={dateFrom} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>To Date</label>
            <input type="date" name="to" defaultValue={dateTo} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem' }} />
          </div>

          <button type="submit" className="action-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', border: 'none', height: '38px' }}>
            <Filter size={16} /> Filter Results
          </button>
          
          {(statusFilter || vendorFilter || dateFrom || dateTo) && (
            <Link href={`/purchasing/reports${baseQueryStr}`} style={{ padding: '0.5rem 1rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
              Clear Filters
            </Link>
          )}
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{reportData.length}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Spend (Filtered)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalSpend)}</div>
        </div>
      </div>

      <div className="card" style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>PO Number</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Vendor</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Method</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'right' }}>PO Amount</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'right' }}>Final Bill Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? reportData.map((po) => (
                <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link href={`/public/po/${po.publicToken}`} target="_blank" style={{ fontWeight: '600', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      #{po.poNumber || po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5)}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{po.vendorName}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '500',
                      backgroundColor: po.status === 'completed' || po.status === 'paid' ? '#dcfce7' : 
                                      po.status === 'rejected' ? '#fee2e2' : '#f1f5f9',
                      color: po.status === 'completed' || po.status === 'paid' ? '#16a34a' : 
                             po.status === 'rejected' ? '#ef4444' : '#475569'
                    }}>
                      {po.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>{po.paymentMethod}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{formatCurrency(po.totalAmount)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: po.cashierBillAmount ? '600' : 'normal' }}>
                    {po.cashierBillAmount ? formatCurrency(po.cashierBillAmount) : '-'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto', display: 'block' }} />
                    No purchase orders found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
