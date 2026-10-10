"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Eye, Edit, MoreVertical, FileText, X, Printer } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchAllOrders, fetchInvoiceDetails } from "@/app/sales/actions";
import { useSearchParams } from "next/navigation";
import SearchFilterBar from "@/components/sales/SearchFilterBar";
import Pagination from "@/components/sales/Pagination";

function InvoiceHubContent() {
  const { selected: scope } = useSessionView();
  const searchParams = useSearchParams();
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const q = searchParams.get("q") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;

  useEffect(() => {
    let active = true;
    const loadInvoices = async () => {
      setLoading(true);
      try {
        if (scope?.organizationId && scope?.locationId) {
          const { data, total } = await fetchAllOrders(
            scope.organizationId, 
            scope.locationId, 
            q, 
            page, 
            limit, 
            startDate, 
            endDate, 
            undefined, 
            status
          );
          if (active) {
            setInvoices(data || []);
            setTotalInvoices(total || 0);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInvoices();
    return () => { active = false; };
  }, [scope, q, startDate, endDate, status, page]);

  const handleViewDetails = async (id: string) => {
    setModalLoading(true);
    setSelectedInvoice({ id, loading: true });
    try {
      const data = await fetchInvoiceDetails(id);
      setSelectedInvoice(data);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-area");
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue?.toUpperCase()) {
      case "PAID":
        return { bg: "#dcfce7", text: "#16a34a" };
      case "PENDING":
        return { bg: "#fef3c7", text: "#d97706" };
      case "CANCELLED":
        return { bg: "#fee2e2", text: "#dc2626" };
      default:
        return { bg: "#f1f5f9", text: "#64748b" };
    }
  };

  const totalPages = Math.ceil(totalInvoices / limit);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={28} color="#3b82f6" />
            Unified Invoice Hub
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>Manage all your invoices in one place.</p>
        </div>
        
        <div>
          <button style={{ backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", padding: "10px 16px", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            + Create Invoice
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "flex-end" }}>
        <SearchFilterBar showDateFilter={true} showStatusFilter={true} />
      </div>

      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "16px", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</th>
              <th style={{ padding: "16px", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invoice No.</th>
              <th style={{ padding: "16px", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer</th>
              <th style={{ padding: "16px", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer Phone</th>
              <th style={{ padding: "16px", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Grand Total</th>
              <th style={{ padding: "16px", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment Status</th>
              <th style={{ padding: "16px", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  No matching invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((inv, index) => {
                const statusColors = getStatusColor(inv.paymentStatus || inv.status);
                const customerInitials = inv.customerName ? inv.customerName.charAt(0).toUpperCase() : '?';
                
                return (
                  <tr key={inv.id} style={{ borderBottom: index === invoices.length - 1 ? "none" : "1px solid #f1f5f9", transition: "background-color 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")} onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#475569", fontWeight: "500" }}>
                      {inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : ''}
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#0f172a", fontWeight: "600" }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#334155" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                          {customerInitials}
                        </div>
                        {inv.customerName || 'Unknown Customer'}
                      </div>
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px" }}>
                      <span style={{ padding: "4px 8px", backgroundColor: "#f1f5f9", borderRadius: "6px", color: "#475569", fontWeight: "500", fontSize: "12px" }}>
                        {inv.customerPhone || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#0f172a", fontWeight: "600", textAlign: "right" }}>
                      ₹{Number(inv.grandTotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", backgroundColor: statusColors.bg, color: statusColors.text, display: "inline-block" }}>
                        {inv.paymentStatus || inv.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                        <button onClick={() => handleViewDetails(inv.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px", transition: "color 0.2s" }} title="View">
                          <Eye size={18} />
                        </button>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px", transition: "color 0.2s" }} title="Edit">
                          <Edit size={18} />
                        </button>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px", transition: "color 0.2s" }} title="More">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {!loading && totalPages > 0 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              Showing {Math.min((page - 1) * limit + 1, totalInvoices)} to {Math.min(page * limit, totalInvoices)} of {totalInvoices} invoices
            </span>
            <Pagination totalPages={totalPages} currentPage={page} />
          </div>
        )}
      </div>

      {selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
                {selectedInvoice.loading ? 'Loading Invoice...' : `Invoice #${selectedInvoice.invoiceNumber}`}
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                {!selectedInvoice.loading && (
                  <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#0f172a', cursor: 'pointer' }}>
                    <Printer size={16} /> Print
                  </button>
                )}
                <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {selectedInvoice.loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading invoice details...</div>
              ) : (
                <div id="invoice-print-area">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Billed To</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{selectedInvoice.customerName}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>Phone: {selectedInvoice.customerPhone || 'N/A'}</p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{selectedInvoice.billingAddress}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Invoice Details</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>Invoice No: <span style={{ fontWeight: '500', color: '#0f172a' }}>{selectedInvoice.invoiceNumber}</span></p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>Date: <span style={{ fontWeight: '500', color: '#0f172a' }}>{selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : ''}</span></p>
                    </div>
                  </div>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '13px', color: '#64748b' }}>Description</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Qty</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Rate</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 0', fontSize: '14px', color: '#0f172a' }}>{item.description}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>{item.qty}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>₹ {Number(item.rate).toFixed(2)}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '300px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#475569' }}>Subtotal</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {parseFloat(selectedInvoice.subtotalAmount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#475569' }}>Tax Amount</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {parseFloat(selectedInvoice.taxAmount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Grand Total</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>₹ {parseFloat(selectedInvoice.grandTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnifiedInvoiceHub() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading hub...</div>}>
      <InvoiceHubContent />
    </Suspense>
  );
}
