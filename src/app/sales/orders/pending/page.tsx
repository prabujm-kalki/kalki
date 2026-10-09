import React from "react";
import { fetchPendingOrders } from "@/app/sales/actions";
import MarkAsPaidButton from "@/components/sales/MarkAsPaidButton";
import SearchFilterBar from "@/components/sales/SearchFilterBar";

export default async function PendingOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; locationId?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { organizationId, locationId, q: searchQuery } = params;

  if (!organizationId || !locationId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px", color: "#0f172a" }}>Missing Context</h2>
        <p>Please select an organization and location to view pending orders.</p>
      </div>
    );
  }

  const pendingOrders = await fetchPendingOrders(organizationId, locationId, searchQuery);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px 0" }}>Pending Orders</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>Manage invoices that have been issued but not yet paid.</p>
        </div>
        <SearchFilterBar />
      </div>

      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
        {pendingOrders.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#334155", margin: "0 0 8px 0" }}>No pending orders found.</h3>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>All invoices are cleared!</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <tr>
                <th style={{ padding: "16px 24px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Date</th>
                <th style={{ padding: "16px 24px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Customer Name</th>
                <th style={{ padding: "16px 24px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Due Date</th>
                <th style={{ padding: "16px 24px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Payment Terms</th>
                <th style={{ padding: "16px 24px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em", textAlign: "right" }}>Grand Total</th>
                <th style={{ padding: "16px 24px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((order) => (
                <tr key={order.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s" }}>
                  <td style={{ padding: "16px 24px", color: "#334155" }}>
                    {order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                  </td>
                  <td style={{ padding: "16px 24px", fontWeight: "500", color: "#0f172a" }}>
                    {order.customerName || "Walk-in Customer"}
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{order.invoiceNumber}</div>
                  </td>
                  <td style={{ padding: "16px 24px", color: "#334155" }}>
                    {order.dueDate ? new Date(order.dueDate).toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <span style={{ display: "inline-block", backgroundColor: "#f1f5f9", color: "#475569", padding: "4px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: "500" }}>
                      {order.paymentMode || "CREDIT"}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: "600", color: "#0f172a" }}>
                    ₹ {Number(order.grandTotal).toFixed(2)}
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "center" }}>
                    <MarkAsPaidButton invoiceId={order.id} customerId={order.customerId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}