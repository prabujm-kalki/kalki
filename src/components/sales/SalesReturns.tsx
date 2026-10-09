"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, X, Save, CheckCircle, FileText, ChevronDown, RefreshCw } from "lucide-react";
import { fetchInvoices, fetchInvoiceDetails, createSalesReturn, fetchSalesReturns, fetchSalesReturnDetails, approveSalesReturn, rejectSalesReturn } from "@/app/sales/actions";
import { Eye, MoreVertical } from "lucide-react";
import { useSessionView } from "@/components/AppShell";

export function SalesReturns() {
  const { session, selected } = useSessionView();
  const [showNewReturnModal, setShowNewReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnReason, setReturnReason] = useState("Damaged Item");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [realReturnsList, setRealReturnsList] = useState<any[]>([]);

  // UI States for custom dialogs
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDestructive?: boolean}>({isOpen: false, title: "", message: "", onConfirm: () => {}});
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewReturnDetails, setViewReturnDetails] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewInvoiceDetails, setViewInvoiceDetails] = useState<any>(null);

  const resetNewReturnModal = () => {
    setSelectedInvoiceId("");
    setReturnItems([]);
    setReturnReason("Damaged Item");
    setReturnDate(new Date().toISOString().split('T')[0]);
    setShowNewReturnModal(false);
  };


  
  const handleViewOriginalInvoice = async () => {
    if (!viewReturnDetails?.invoiceId) return;
    const details = await fetchInvoiceDetails(viewReturnDetails.invoiceId);
    setViewInvoiceDetails(details);
    setShowInvoiceModal(true);
  };


  const loadReturns = () => {
    if (selected) {
      fetchSalesReturns(selected.organizationId, selected.locationId).then(setRealReturnsList);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [selected]);
  
  const handleViewReturn = async (id: string) => {
    const details = await fetchSalesReturnDetails(id);
    setViewReturnDetails(details);
    setShowViewModal(true);
  };


  useEffect(() => {
    if (!selected || !returnDate) return;
    setLoadingInvoices(true);
    fetchInvoices(selected.organizationId, selected.locationId).then(data => {
      // Filter by the selected return date (which implies we are looking for invoices from that date)
      const filtered = data.filter((inv: any) => inv.date === returnDate);
      setInvoices(filtered);
      setLoadingInvoices(false);
    });
  }, [selected, returnDate]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      setInvoiceDetails(null);
      setReturnItems([]);
      return;
    }
    setLoadingDetails(true);
    fetchInvoiceDetails(selectedInvoiceId, true).then(data => {
      setInvoiceDetails(data);
      if (data && data.items) {
        setReturnItems(data.items.map((item: any) => ({
          ...item,
          returnQty: 0,
          addToInventory: true
        })));
      }
      setLoadingDetails(false);
    }).catch(err => {
      alert(err.message || "Failed to load invoice details");
      setLoadingDetails(false);
      setSelectedInvoiceId("");
    });
  }, [selectedInvoiceId]);

  const handleReturnQtyChange = (index: number, val: string) => {
    const qty = parseFloat(val) || 0;
    const newItems = [...returnItems];
    newItems[index].returnQty = Math.min(qty, newItems[index].qty);
    setReturnItems(newItems);
  };

  const handleToggleInventory = (index: number) => {
    const newItems = [...returnItems];
    newItems[index].addToInventory = !newItems[index].addToInventory;
    setReturnItems(newItems);
  };

  const calculateTotalCredit = () => {
    return returnItems.reduce((acc, item) => acc + (item.returnQty * item.rate), 0);
  };

  const handleSaveReturn = async (status: string) => {
    if (isSaving) return;
    if (!selectedInvoiceId) return alert("Please select an invoice.");
    if (returnItems.filter(item => item.returnQty > 0).length === 0) return alert("Please select at least one item to return.");
    
    setIsSaving(true);
    try {
      const result = await createSalesReturn({
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        invoiceId: selectedInvoiceId,
        returnDate,
        reason: returnReason,
        status,
        items: returnItems,
        totalAmount: calculateTotalCredit()
      });
      if (result.success) {
        alert("Sales return created successfully.");
        resetNewReturnModal();
        loadReturns();
      }
    } catch (e: any) {
      alert(e.message || "Failed to create return");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveDraft = (returnId: string) => {
    const returnInfo = realReturnsList.find(r => r.id === returnId);
    const returnNumber = returnInfo ? returnInfo.returnId : returnId;

    setConfirmDialog({
      isOpen: true,
      title: "Approve Return",
      message: `Are you sure you want to approve return ${returnNumber}? This action will permanently adjust inventory and cannot be undone.`,
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await approveSalesReturn(returnId);
          if (res.success) {
            showToast(`Return ${returnNumber} has been approved successfully!`, 'success');
            loadReturns();
          }
        } catch (err: any) {
          showToast(err.message || `Failed to approve return ${returnNumber}. Check permissions.`, 'error');
        }
      }
    });
  };

  const handleRejectDraft = (returnId: string) => {
    const returnInfo = realReturnsList.find(r => r.id === returnId);
    const returnNumber = returnInfo ? returnInfo.returnId : returnId;

    setConfirmDialog({
      isOpen: true,
      title: "Reject Return",
      message: `Are you sure you want to REJECT return ${returnNumber}? This will return the items back to the invoice.`,
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await rejectSalesReturn(returnId);
          if (res.success) {
            showToast(`Return ${returnNumber} has been rejected.`, 'success');
            loadReturns();
          }
        } catch (err: any) {
          showToast(err.message || `Failed to reject return ${returnNumber}. Check permissions.`, 'error');
        }
      }
    });
  };

  // Data now fetched from DB into realReturnsList

  return (
    <div style={{ padding: "1.5rem", width: "100%", boxSizing: "border-box" }}>
      {/* Top Action Bar */}
      <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} size={18} />
            <input 
              type="text" 
              placeholder="Search Returns..." 
              style={{ padding: "0.5rem 1rem 0.5rem 2.5rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", fontSize: "0.875rem", width: "250px", outline: "none", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}
            />
          </div>
          
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", fontSize: "0.875rem", color: "#4b5563", backgroundColor: "white", cursor: "pointer" }}>
              <Filter size={16} /> Date Range <ChevronDown size={14} />
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", fontSize: "0.875rem", color: "#4b5563", backgroundColor: "white", cursor: "pointer" }}>
              Status <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => setShowNewReturnModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#2563eb", color: "white", padding: "0.5rem 1rem", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", cursor: "pointer", border: "none" }}
        >
          <Plus size={18} /> New Sales Return
        </button>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: "1.25rem", borderRadius: "0.5rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f3f4f6", color: "#6b7280", textAlign: "left" }}>
              <th style={{ padding: "0.75rem", fontWeight: "600" }}>Return ID</th>
              <th style={{ padding: "0.75rem", fontWeight: "600" }}>Date</th>
              <th style={{ padding: "0.75rem", fontWeight: "600" }}>Original Invoice #</th>
              <th style={{ padding: "0.75rem", fontWeight: "600" }}>Customer</th>
              <th style={{ padding: "0.75rem", fontWeight: "600" }}>Returned Qty</th>
              <th style={{ padding: "0.75rem", fontWeight: "600" }}>Amount</th>
              <th style={{ padding: "0.75rem", fontWeight: "600" }}>Status</th>
              <th style={{ padding: "0.75rem", fontWeight: "600", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {realReturnsList.map((ret, idx) => (
              <tr key={idx} style={{ borderBottom: idx !== realReturnsList.length - 1 ? "1px solid #f3f4f6" : "none", color: "#374151" }}>
                <td style={{ padding: "1rem 0.75rem", fontWeight: "500", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }} onClick={() => handleViewReturn(ret.id)}>{ret.returnId}</td>
                <td style={{ padding: "1rem 0.75rem" }}>{ret.date}</td>
                <td style={{ padding: "1rem 0.75rem" }}>{ret.invoice}</td>
                <td style={{ padding: "1rem 0.75rem" }}>{ret.customer}</td>
                <td style={{ padding: "1rem 0.75rem" }}>{ret.qty}</td>
                <td style={{ padding: "1rem 0.75rem", fontWeight: "500" }}>{ret.amount}</td>
                <td style={{ padding: "1rem 0.75rem" }}>
                  <span style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    backgroundColor: ret.status === 'APPROVED' ? "#dcfce7" : ret.status === 'PENDING_APPROVAL' ? "#ffedd5" : ret.status === 'REJECTED' ? "#fee2e2" : "#f3f4f6",
                    color: ret.status === 'APPROVED' ? "#166534" : ret.status === 'PENDING_APPROVAL' ? "#c2410c" : ret.status === 'REJECTED' ? "#991b1b" : "#4b5563"
                  }}>
                    {ret.status === 'PENDING_APPROVAL' ? 'Pending Approval' : ret.status === 'APPROVED' ? 'Approved' : ret.status === 'REJECTED' ? 'Rejected' : 'Draft'}
                  </span>
                </td>
                <td style={{ padding: "1rem 0.75rem", textAlign: "center" }}>
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setActionMenuOpen(actionMenuOpen === ret.id ? null : ret.id)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
                      <MoreVertical size={18} />
                    </button>
                    {actionMenuOpen === ret.id && (
                      <div style={{ position: "absolute", right: "0", top: "100%", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.375rem", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 10, width: "120px", display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
                        <button onClick={() => { handleViewReturn(ret.id); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>View Details</button>
                        {(ret.status === 'DRAFT' || ret.status === 'PENDING_APPROVAL') && (
                           <>
                             <button onClick={() => { handleApproveDraft(ret.id); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#16a34a" }}>Approve</button>
                             <button onClick={() => { handleRejectDraft(ret.id); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#dc2626" }}>Reject</button>
                           </>
                        )}
                        <button onClick={() => { alert("Printing..."); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>Print</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Sales Return Modal */}
      {showNewReturnModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Modal Header */}
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>New Sales Return</h2>
              <button onClick={() => resetNewReturnModal()} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {/* Form Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#374151" }}>Select Invoice</label>
                  <select 
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    disabled={loadingInvoices}
                    style={{ border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "0.5rem", fontSize: "0.875rem", outline: "none", width: "100%" }}
                  >
                    <option value="">Select Invoice...</option>
                    {loadingInvoices ? (
                      <option disabled>Loading...</option>
                    ) : (
                      invoices.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.invoiceNumber} ({inv.customerName})</option>
                      ))
                    )}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#374151" }}>Return Date</label>
                  <input 
                    type="date" 
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    style={{ border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "0.5rem", fontSize: "0.875rem", outline: "none", width: "100%" }} 
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#374151" }}>Return Reason</label>
                  <select 
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    style={{ border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "0.5rem", fontSize: "0.875rem", outline: "none", width: "100%" }}
                  >
                    <option value="Damaged Item">Damaged Item</option>
                    <option value="Expired">Expired</option>
                    <option value="Wrong Item Sent">Wrong Item Sent</option>
                    <option value="Customer Choice">Customer Choice</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Item Grid */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", color: "#4b5563", textTransform: "uppercase" }}>
                    <tr>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Item Name</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Original Qty</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Price</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600", width: "120px" }}>Return Qty</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600", textAlign: "center" }}>Add to Inventory</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: "0.875rem", color: "#374151" }}>
                    {loadingDetails ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                          <RefreshCw size={24} className="lucide-spin" style={{ margin: "0 auto" }} />
                        </td>
                      </tr>
                    ) : returnItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                          {selectedInvoiceId ? "All items in this invoice have already been returned." : "Select an invoice to view items"}
                        </td>
                      </tr>
                    ) : (
                      returnItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: idx !== returnItems.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "0.75rem", fontWeight: "500" }}>{item.description}</td>
                          <td style={{ padding: "0.75rem", color: "#6b7280" }}>{item.qty}</td>
                          <td style={{ padding: "0.75rem" }}>₹ {item.rate}</td>
                          <td style={{ padding: "0.75rem" }}>
                            <input 
                              type="number" 
                              min="0" 
                              max={item.qty} 
                              value={item.returnQty}
                              onChange={(e) => handleReturnQtyChange(idx, e.target.value)}
                              style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "0.25rem", padding: "0.25rem", textAlign: "center", boxSizing: "border-box" }} 
                            />
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <input 
                              type="checkbox" 
                              checked={item.addToInventory}
                              onChange={() => handleToggleInventory(idx)}
                              style={{ width: "1rem", height: "1rem", accentColor: "#2563eb", cursor: "pointer" }} 
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {calculateTotalCredit() > 0 && (
                <div style={{ backgroundColor: "#eff6ff", color: "#1e40af", padding: "1rem", borderRadius: "0.5rem", fontSize: "0.875rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <CheckCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0 }}><strong>Note:</strong> Approving this return will automatically adjust your inventory for the selected items and create a draft Credit Note for ₹ {calculateTotalCredit()}.</p>
                </div>
              )}


            </div>

            {/* Modal Footer */}
            <div style={{ padding: "1.5rem", borderTop: "1px solid #f3f4f6", backgroundColor: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderBottomLeftRadius: "0.75rem", borderBottomRightRadius: "0.75rem" }}>
              <button 
                onClick={() => resetNewReturnModal()}
                style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", color: "#374151", backgroundColor: "white", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSaveReturn("DRAFT")}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", color: "#374151", backgroundColor: "white", cursor: "pointer" }}>
                <Save size={16} /> Save Draft
              </button>
              {invoiceDetails?.policies?.requireApproval && !invoiceDetails?.canApprove ? (
                <button 
                  onClick={() => handleSaveReturn("PENDING_APPROVAL")}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", color: "white", backgroundColor: "#f59e0b", cursor: "pointer" }}>
                  <CheckCircle size={16} /> Submit for Approval
                </button>
              ) : (
                <button 
                  onClick={() => handleSaveReturn("APPROVED")}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", color: "white", backgroundColor: "#2563eb", cursor: "pointer" }}>
                  <CheckCircle size={16} /> Approve Return
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* View Return Details Modal */}
      {showViewModal && viewReturnDetails && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>Return Details: {viewReturnDetails.returnNumber}</h2>
              <button onClick={() => setShowViewModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                <div><strong>Original Invoice:</strong> <span onClick={handleViewOriginalInvoice} style={{color: "#2563eb", textDecoration: "underline", cursor:"pointer"}}>{viewReturnDetails.invoiceNumber || 'N/A'}</span></div>
                <div><strong>Return Date:</strong> {new Date(viewReturnDetails.returnDate).toLocaleDateString()}</div>
                <div><strong>Customer:</strong> {viewReturnDetails.customerName}</div>
                <div><strong>Status:</strong> {viewReturnDetails.status}</div>
                <div><strong>Reason:</strong> {viewReturnDetails.reason || 'N/A'}</div>
              </div>
              
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", color: "#4b5563", textTransform: "uppercase" }}>
                    <tr>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Item Name</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Return Qty</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Price</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600", textAlign: "center" }}>Added to Inventory</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: "0.875rem", color: "#374151" }}>
                    {viewReturnDetails.items?.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: idx !== viewReturnDetails.items.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "0.75rem", fontWeight: "500" }}>{item.description}</td>
                        <td style={{ padding: "0.75rem" }}>{item.returnQty}</td>
                        <td style={{ padding: "0.75rem" }}>₹ {item.unitPrice}</td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          {item.addToInventory ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: "1.5rem", borderTop: "1px solid #f3f4f6", backgroundColor: "#f9fafb", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowViewModal(false)}
                style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", color: "#374151", backgroundColor: "white", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Original Invoice Modal */}
      {showInvoiceModal && viewInvoiceDetails && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", width: "100%", maxWidth: "700px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>Invoice Details: {viewInvoiceDetails.invoiceNumber}</h2>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: "1.5rem", overflowY: "auto" }}>
               <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>
                    <tr>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Item Name</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Qty</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Price</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: "#374151" }}>
                    {viewInvoiceDetails.items?.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem" }}>{item.description}</td>
                        <td style={{ padding: "0.75rem" }}>{item.qty}</td>
                        <td style={{ padding: "0.75rem" }}>₹ {item.rate}</td>
                        <td style={{ padding: "0.75rem" }}>₹ {item.total}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
            <div style={{ padding: "1.5rem", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowInvoiceModal(false)} style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", backgroundColor: "white", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}


      {/* Custom Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.5rem", width: "400px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.125rem", fontWeight: "600", color: "#111827" }}>{confirmDialog.title}</h3>
            <p style={{ color: "#4b5563", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: "1.5" }}>{confirmDialog.message}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
                style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", backgroundColor: "white", color: "#374151", fontSize: "0.875rem", fontWeight: "500", cursor: "pointer" }}>
                Cancel
              </button>
              <button 
                onClick={confirmDialog.onConfirm} 
                style={{ padding: "0.5rem 1rem", border: "none", borderRadius: "0.375rem", backgroundColor: confirmDialog.isDestructive ? "#dc2626" : "#2563eb", color: "white", fontSize: "0.875rem", fontWeight: "500", cursor: "pointer" }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", backgroundColor: toast.type === 'success' ? "#10b981" : "#ef4444", color: "white", padding: "1rem 1.5rem", borderRadius: "0.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 2000, display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: "500", animation: "slideInRight 0.3s ease-out" }}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
          {toast.message}
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
