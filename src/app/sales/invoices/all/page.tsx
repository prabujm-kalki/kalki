"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { Eye, Edit, MoreVertical, FileText, X, Printer, Trash2, AlertTriangle, Check, Loader2 } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchAllOrders, fetchInvoiceDetails, deleteSalesInvoice, updateSalesInvoice } from "@/app/sales/actions";
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

  // Action Menu Dropdown State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Delete State
  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit State
  const [invoiceToEdit, setInvoiceToEdit] = useState<any | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customerName: "",
    customerPhone: "",
    paymentStatus: "PAID",
    paymentMode: "CASH",
    status: "ISSUED",
  });

  const q = searchParams.get("q") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;

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
        setInvoices(data || []);
        setTotalInvoices(total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [scope, q, startDate, endDate, status, page]);

  // Close open dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-invoice-menu]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

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

  const handleOpenEdit = (inv: any) => {
    setOpenMenuId(null);
    setInvoiceToEdit(inv);
    setEditFormData({
      customerName: inv.customerName || "",
      customerPhone: inv.customerPhone || "",
      paymentStatus: inv.paymentStatus || "PAID",
      paymentMode: inv.paymentMode || "CASH",
      status: inv.status || "ISSUED",
    });
    setActionError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceToEdit) return;
    setIsSavingEdit(true);
    setActionError(null);
    try {
      await updateSalesInvoice({
        id: invoiceToEdit.id,
        customerName: editFormData.customerName,
        paymentStatus: editFormData.paymentStatus,
        paymentMode: editFormData.paymentMode,
        status: editFormData.status,
      });
      setActionSuccess(`Invoice #${invoiceToEdit.invoiceNumber} updated successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setInvoiceToEdit(null);
      await loadInvoices();
    } catch (err: any) {
      setActionError(err.message || "Failed to update invoice");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteSalesInvoice(invoiceToDelete.id);
      setActionSuccess(`Invoice #${invoiceToDelete.invoiceNumber} deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setInvoiceToDelete(null);
      await loadInvoices();
    } catch (err: any) {
      setActionError(err.message || "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
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
      case "PARTIAL":
        return { bg: "#fef3c7", text: "#b45309" };
      case "PENDING":
      case "UNPAID":
        return { bg: "#fee2e2", text: "#dc2626" };
      case "CANCELLED":
        return { bg: "#f1f5f9", text: "#64748b" };
      default:
        return { bg: "#f1f5f9", text: "#64748b" };
    }
  };

  const totalPages = Math.ceil(totalInvoices / limit);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* Toast Alerts */}
      {actionSuccess && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: "500" }}>
          <Check size={18} color="#16a34a" />
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: "500" }}>
          <AlertTriangle size={18} color="#dc2626" />
          {actionError}
        </div>
      )}

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

      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "visible" }}>
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
                const isMenuOpen = openMenuId === inv.id;
                
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
                    <td style={{ padding: "16px", textAlign: "center", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }} data-invoice-menu>
                        <button 
                          onClick={() => handleViewDetails(inv.id)} 
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center" }} 
                          title="View Details"
                          onMouseOver={(e) => (e.currentTarget.style.color = "#3b82f6")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "#64748b")}
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(inv)} 
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center" }} 
                          title="Edit Invoice"
                          onMouseOver={(e) => (e.currentTarget.style.color = "#0284c7")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "#64748b")}
                        >
                          <Edit size={18} />
                        </button>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : inv.id);
                            }} 
                            style={{ background: isMenuOpen ? "#e2e8f0" : "none", border: "none", cursor: "pointer", color: "#64748b", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center" }} 
                            title="More Actions"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div 
                              style={{ 
                                position: "absolute", 
                                right: 0, 
                                top: "100%", 
                                marginTop: "4px",
                                backgroundColor: "#ffffff", 
                                border: "1px solid #e2e8f0", 
                                borderRadius: "8px", 
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)", 
                                zIndex: 100, 
                                minWidth: "150px",
                                padding: "4px 0",
                                textAlign: "left"
                              }}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleViewDetails(inv.id);
                                }}
                                style={{ width: "100%", padding: "8px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Eye size={15} color="#64748b" /> View Details
                              </button>
                              <button
                                onClick={() => handleOpenEdit(inv)}
                                style={{ width: "100%", padding: "8px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Edit size={15} color="#0284c7" /> Edit Invoice
                              </button>
                              <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "4px 0" }} />
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setInvoiceToDelete(inv);
                                }}
                                style={{ width: "100%", padding: "8px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", color: "#dc2626", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Trash2 size={15} color="#dc2626" /> Delete Invoice
                              </button>
                            </div>
                          )}
                        </div>
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

      {/* EDIT MODAL */}
      {invoiceToEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                  Edit Invoice #{invoiceToEdit.invoiceNumber}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Update invoice status and details
                </p>
              </div>
              <button 
                onClick={() => setInvoiceToEdit(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Payment Status
                    </label>
                    <select
                      value={editFormData.paymentStatus}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' }}
                    >
                      <option value="PAID">PAID</option>
                      <option value="PARTIAL">PARTIAL</option>
                      <option value="PENDING">PENDING</option>
                      <option value="UNPAID">UNPAID</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Payment Mode
                    </label>
                    <select
                      value={editFormData.paymentMode}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentMode: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' }}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">CARD</option>
                      <option value="NETBANKING">NETBANKING</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Invoice Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' }}
                  >
                    <option value="ISSUED">ISSUED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
                  Grand Total: <strong style={{ color: '#0f172a' }}>₹{Number(invoiceToEdit.grandTotal || 0).toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setInvoiceToEdit(null)}
                  style={{ padding: '9px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  style={{ padding: '9px 18px', background: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: 'white', cursor: isSavingEdit ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSavingEdit ? 0.7 : 1 }}
                >
                  {isSavingEdit && <Loader2 size={16} className="animate-spin" />}
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {invoiceToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#dc2626' }}>
              <Trash2 size={24} />
            </div>
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              Delete Invoice
            </h3>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to delete invoice <strong style={{ color: '#0f172a' }}>#{invoiceToDelete.invoiceNumber}</strong> (₹{Number(invoiceToDelete.grandTotal || 0).toFixed(2)})? This will remove the invoice and its line items.
            </p>

            {actionError && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <AlertTriangle size={16} color="#dc2626" />
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                disabled={isDeleting}
                style={{ padding: '9px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#475569', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ padding: '9px 18px', background: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: 'white', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isDeleting ? 0.7 : 1 }}
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <span style={{ fontSize: parseFloat(selectedInvoice.advancePaid || 0) > 0 ? '16px' : '20px', fontWeight: '700', color: '#3b82f6' }}>₹ {parseFloat(selectedInvoice.grandTotal || 0).toFixed(2)}</span>
                      </div>
                      
                      {parseFloat(selectedInvoice.advancePaid || 0) > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: '#16a34a' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Advance Paid</span>
                            <span style={{ fontSize: '15px', fontWeight: '700' }}>- ₹ {parseFloat(selectedInvoice.advancePaid).toFixed(2)}</span>
                          </div>
                          <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '12px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance Due</span>
                            <span style={{ fontSize: '22px', fontWeight: '800' }}>
                              ₹ {parseFloat(selectedInvoice.balanceDue !== null && selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : (parseFloat(selectedInvoice.grandTotal || 0) - parseFloat(selectedInvoice.advancePaid || 0))).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
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
