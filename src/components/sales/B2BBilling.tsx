"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Calculator, FileText, UserPlus, CheckCircle, Search, Hash } from "lucide-react";
import { fetchItems, fetchCustomers, createB2BInvoice, addCustomer } from "@/app/sales/actions";
import { useSessionView } from "@/components/AppShell";

export function B2BBilling() {
  const { selected: scope } = useSessionView();
  
  const [itemsList, setItemsList] = useState([{ uid: 1, id: "", name: "", hsn: "", qty: 1, rate: 0, discountPercent: 0, taxRate: 18, amount: 0, unit: "PCS" }]);
  const [customer, setCustomer] = useState({ id: "", name: "", gstin: "", address: "" });
  
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Cash");
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState("");
    const [invoiceError, setInvoiceError] = useState("");
    const [customerError, setCustomerError] = useState("");
    const [customerSuccess, setCustomerSuccess] = useState("");
  
  // Add Customer State
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", gstin: "", address: "", email: "", phone: "" });

  const loadData = () => {
    if (scope?.organizationId && scope?.locationId) {
      fetchItems(scope.organizationId, scope.locationId).then(data => setDbItems(data || []));
      fetchCustomers(scope.organizationId).then(data => setDbCustomers(data || []));
    }
  };

  useEffect(() => {
    loadData();
  }, [scope]);

  const handleCreateCustomer = async () => {
    setCustomerError("");
    setCustomerSuccess("");
    if (!scope?.organizationId) return;
    
    if (!newCustomer.name || !newCustomer.name.trim()) {
      return setCustomerError("Customer Name is required");
    }
    const phoneDigits = newCustomer.phone?.replace(/\D/g, '') || '';
    if (phoneDigits.length !== 10) {
      return setCustomerError("Mobile number must be exactly 10 digits");
    }

    try {
      const created = await addCustomer(scope.organizationId, newCustomer);
      setDbCustomers([...dbCustomers, created]);
      setCustomer({ id: created.id, name: created.name, gstin: created.taxId || "", address: created.address || "" });
      
      setCustomerSuccess("Customer saved successfully!");
      setTimeout(() => {
        setIsAddingCustomer(false);
        setNewCustomer({ name: "", gstin: "", address: "", email: "", phone: "" });
        setCustomerSuccess("");
      }, 1500);
    } catch (err) {
      setCustomerError("Failed to add customer. Please try again.");
      console.error(err);
    }
  };

  const addItemLine = () => {
    const newUid = Date.now();
    setItemsList([...itemsList, { uid: newUid, id: "", name: "", hsn: "", qty: 1, rate: 0, discountPercent: 0, taxRate: 18, amount: 0, unit: "PCS" }]);
    setTimeout(() => {
      const el = document.getElementById("item-select-" + newUid);
      if (el) el.focus();
    }, 50);
  };

  const removeItemLine = (uid: number) => {
    if (itemsList.length > 1) {
      setItemsList(itemsList.filter(item => item.uid !== uid));
    }
  };

  const updateItemLine = (uid: number, field: string, value: any) => {
    setItemsList(itemsList.map(item => {
      if (item.uid === uid) {
        const updated = { ...item, [field]: value };
        if (field === "id") {
          const selectedDbItem = dbItems.find(dbI => dbI.id === value);
          if (selectedDbItem) {
            updated.name = selectedDbItem.nameEn;
            updated.rate = parseFloat(selectedDbItem.currentPrice || "0");
            updated.unit = selectedDbItem.unit;
          }
        }
        if (field === "qty" || field === "rate" || field === "id" || field === "discountPercent") {
          const gross = (updated.qty || 0) * (updated.rate || 0);
          const discountAmt = gross * ((updated.discountPercent || 0) / 100);
          updated.amount = gross - discountAmt;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    const selected = dbCustomers.find(c => c.id === custId);
    if (selected) {
      setCustomer({ id: selected.id, name: selected.name, gstin: selected.taxId || "", address: selected.address || "" });
    } else {
      setCustomer({ id: "", name: "", gstin: "", address: "" });
    }
  };

  const subtotal = itemsList.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);
  const taxableAmount = itemsList.reduce((sum, item) => sum + item.amount, 0) - overallDiscount;
  
  const taxAmount = itemsList.reduce((sum, item) => {
    const gross = (item.qty || 0) * (item.rate || 0);
    const itemNet = gross - (gross * ((item.discountPercent || 0) / 100));
    return sum + (itemNet * (item.taxRate / 100));
  }, 0);
  
  const grandTotal = taxableAmount + taxAmount;
  const roundedGrandTotal = Math.round(grandTotal);
  const roundOffAmount = roundedGrandTotal - grandTotal;

  const handleSave = async () => {
    if (!scope?.organizationId || !scope?.locationId) return alert("Select Org & Location first!");
    if (!customer.id) return alert("Please select a customer.");
    if (!itemsList[0].id) return alert("Please select at least one item.");

    setIsSubmitting(true);
    try {
      const payload = {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        customerId: customer.id,
        customerName: customer.name,
        items: itemsList.filter(i => i.id),
        paymentTerms,
        invoiceDate,
        dueDate,
        overallDiscount,
        advancePaid
      };
      const res = await createB2BInvoice(payload);
      if (res.success) {
        setInvoiceSuccess("Invoice generated successfully: " + res.invoice.invoiceNumber);
        setItemsList([{ uid: Date.now(), id: "", name: "", hsn: "", qty: 1, rate: 0, discountPercent: 0, taxRate: 18, amount: 0, unit: "PCS" }]);
        setCustomer({ id: "", name: "", gstin: "", address: "" });
        setOverallDiscount(0);
        setTimeout(() => setInvoiceSuccess(""), 5000);
      }
    } catch (err: any) {
      setInvoiceError("Error generating invoice: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Premium Custom Styles
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.07)',
    borderRadius: '16px'
  };

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px'
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "1.5rem", fontFamily: "sans-serif", color: "#1e293b", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0f172a", letterSpacing: "-0.025em", margin: 0 }}>New Invoice</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", marginBottom: 0 }}>Create and manage your billing transactions</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ backgroundColor: "#fef3c7", color: "#92400e", fontSize: "0.75rem", fontWeight: "bold", padding: "0.25rem 0.75rem", borderRadius: "9999px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Draft Mode
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Top Row: Customer & Invoice Settings */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {/* Premium accent bar */}
          <div style={{ height: "0.25rem", width: "100%", background: "linear-gradient(to right, #d97706, #eab308)" }}></div>
          
          <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", boxSizing: "border-box" }}>
            {/* Left: Customer */}
            <div>
              <h2 style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", marginTop: 0 }}>Customer Details</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "0.25rem" }}>
                    Select Customer *
                    <button type="button" onClick={() => setIsAddingCustomer(true)} style={{ background: "none", border: "none", color: "#d97706", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>+ Add New</button>
                  </label>
                  <select 
                    value={customer.id} 
                    onChange={e => handleCustomerChange(e)}
                    style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem", borderRadius: "0.5rem", padding: "0.625rem", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="">-- Search Customer --</option>
                    {dbCustomers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "0.25rem" }}>GSTIN</label>
                  <input 
                    type="text" 
                    disabled 
                    value={customer.gstin || ""}
                    placeholder="Auto-filled" 
                    style={{ width: "100%", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.875rem", borderRadius: "0.5rem", padding: "0.625rem", cursor: "not-allowed", boxSizing: "border-box" }} 
                  />
                </div>
              </div>
            </div>

            {/* Right: Settings */}
            <div>
              <h2 style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", marginTop: 0 }}>Invoice Settings</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "0.25rem" }}>Invoice Date</label>
                  <input 
                    type="date" 
                    value={invoiceDate} 
                    onChange={e => setInvoiceDate(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem", borderRadius: "0.5rem", padding: "0.625rem", outline: "none", boxSizing: "border-box" }} 
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "0.25rem" }}>Due Date</label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem", borderRadius: "0.5rem", padding: "0.625rem", outline: "none", boxSizing: "border-box" }} 
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "0.25rem" }}>Payment Terms</label>
                  <select 
                    value={paymentTerms} 
                    onChange={e => setPaymentTerms(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem", borderRadius: "0.5rem", padding: "0.625rem", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row: Full Width Itemized Table */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", fontSize: "0.875rem", textAlign: "left", color: "#475569", borderCollapse: "collapse" }}>
            <thead style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <tr>
                <th scope="col" style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Item Description</th>
                <th scope="col" style={{ padding: "1rem 1rem", fontWeight: 600, width: "6rem" }}>Qty</th>
                <th scope="col" style={{ padding: "1rem 1rem", fontWeight: 600, width: "8rem" }}>Rate (₹)</th>
                <th scope="col" style={{ padding: "1rem 1rem", fontWeight: 600, width: "6rem" }}>Disc %</th>
                <th scope="col" style={{ padding: "1rem 1rem", fontWeight: 600, width: "7rem" }}>GST %</th>
                <th scope="col" style={{ padding: "1rem 1.5rem", fontWeight: 600, textAlign: "right", width: "8rem" }}>Amount (₹)</th>
                <th scope="col" style={{ padding: "1rem", width: "4rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {itemsList.map((item, index) => (
                <tr key={item.uid} style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1.5rem" }}>
                    <select 
                      value={item.id} 
                      onChange={e => updateItemLine(item.uid, 'id', e.target.value)}
                      style={{ width: "100%", backgroundColor: "transparent", border: "1px solid #e2e8f0", borderRadius: "0.25rem", color: "#0f172a", fontWeight: 500, padding: "0.375rem", outline: "none", boxSizing: "border-box" }}
                    >
                      <option value="">Select an Item</option>
                      {dbItems.map(dbItem => (
                        <option key={dbItem.id} value={dbItem.id}>{dbItem.nameEn}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <input 
                      type="number" 
                      value={item.qty} 
                      onChange={e => updateItemLine(item.uid, 'qty', e.target.value === "" ? "" : parseFloat(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.25rem", padding: "0.375rem", textAlign: "center", outline: "none", boxSizing: "border-box" }} 
                    />
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <input 
                      type="number" 
                      value={item.rate} 
                      onChange={e => updateItemLine(item.uid, 'rate', e.target.value === "" ? "" : parseFloat(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.25rem", padding: "0.375rem", textAlign: "right", outline: "none", boxSizing: "border-box" }} 
                    />
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <input 
                      type="number" 
                      value={item.discountPercent} 
                      onChange={e => updateItemLine(item.uid, 'discountPercent', e.target.value === "" ? "" : parseFloat(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.25rem", padding: "0.375rem", textAlign: "center", outline: "none", boxSizing: "border-box" }} 
                    />
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <select 
                      value={item.taxRate} 
                      onChange={e => updateItemLine(item.uid, 'taxRate', parseFloat(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.25rem", padding: "0.375rem", outline: "none", boxSizing: "border-box" }}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </td>
                  <td style={{ padding: "0.75rem 1.5rem", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                    {item.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    <button onClick={() => removeItemLine(item.uid)} disabled={itemsList.length === 1} style={{ background: "none", border: "none", color: itemsList.length === 1 ? '#cbd5e1' : '#ef4444', cursor: itemsList.length === 1 ? 'not-allowed' : 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "1rem", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <button 
              onClick={addItemLine}
              style={{ fontSize: "0.875rem", fontWeight: 500, color: "#d97706", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
            >
              + Add Another Line
            </button>
          </div>
        </div>

        {/* Bottom Row: Summary & Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          
          {/* Left: Notes */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", padding: "1.5rem", boxSizing: "border-box" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", marginTop: 0 }}>Terms & Notes</h2>
            <textarea 
              rows={4} 
              style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#334155", fontSize: "0.875rem", borderRadius: "0.5rem", padding: "0.75rem", outline: "none", resize: "none", boxSizing: "border-box" }} 
              placeholder="Thank you for your business."
            ></textarea>
          </div>

          {/* Right: Financial Math */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem", color: "#475569" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span style={{ fontWeight: 500 }}>₹ {subtotal.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  Overall Discount 
                  <input 
                    type="number" 
                    style={{ width: "60px", padding: "2px", border: "1px solid #cbd5e1", borderRadius: "4px" }} 
                    placeholder="₹" 
                    value={overallDiscount || ""}
                    onChange={e => setOverallDiscount(parseFloat(e.target.value) || 0)}
                  />
                </span>
                <span style={{ fontWeight: 500 }}>- ₹ {overallDiscount.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Tax (GST)</span><span style={{ fontWeight: 500 }}>+ ₹ {taxAmount.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Round Off</span><span style={{ fontWeight: 500 }}>₹ {roundOffAmount.toFixed(2)}</span></div>
            </div>
            
            <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grand Total</span>
                <span style={{ fontSize: "1.35rem", fontWeight: "bold", color: "#0f172a", letterSpacing: "-0.025em" }}>₹ {roundedGrandTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", color: "#059669" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>
                  Advance Paid
                  <input 
                    type="number" 
                    style={{ width: "80px", padding: "2px 6px", border: "1px solid #10b981", borderRadius: "4px", fontSize: "0.85rem" }} 
                    placeholder="₹" 
                    value={advancePaid || ""} 
                    onChange={e => setAdvancePaid(parseFloat(e.target.value) || 0)} 
                  />
                </span>
                <span style={{ fontWeight: 600, fontSize: "1rem" }}>- ₹ {advancePaid.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", paddingTop: "0.5rem", borderTop: "2px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em" }}>Balance Due</span>
                <span style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#dc2626", letterSpacing: "-0.025em" }}>₹ {Math.max(0, roundedGrandTotal - advancePaid).toFixed(2)}</span>
              </div>

              {invoiceError && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '0.5rem', border: '1px solid #fca5a5', fontSize: '0.875rem', fontWeight: '500' }}>
                  {invoiceError}
                </div>
              )}
              {invoiceSuccess && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '0.5rem', border: '1px solid #bbf7d0', fontSize: '0.875rem', fontWeight: '500' }}>
                  {invoiceSuccess}
                </div>
              )}

              <button 
                onClick={handleSave} 
                disabled={isSubmitting}
                style={{ width: "100%", background: "linear-gradient(to right, #f59e0b, #b45309)", color: "white", fontWeight: 600, borderRadius: "0.5rem", fontSize: "0.875rem", padding: "0.875rem 1.25rem", textAlign: "center", border: "none", cursor: isSubmitting ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
              >
                {isSubmitting ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>

        {/* Create New Customer Modal (Restored Original) */}
        {isAddingCustomer && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Create New Customer
                <button onClick={() => { setIsAddingCustomer(false); setCustomerError(""); setCustomerSuccess(""); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>&times;</button>
              </h3>
              {customerError && (
                  <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10000, padding: '16px 24px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '6px solid #ef4444', borderTop: '1px solid #fca5a5', borderRight: '1px solid #fca5a5', borderBottom: '1px solid #fca5a5', fontSize: '16px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
                    {customerError}
                  </div>
                )}
              {customerSuccess && (
                  <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10000, padding: '16px 24px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '6px solid #22c55e', borderTop: '1px solid #bbf7d0', borderRight: '1px solid #bbf7d0', borderBottom: '1px solid #bbf7d0', fontSize: '16px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
                    <CheckCircle size={24} /> {customerSuccess}
                  </div>
                )}
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Customer Name *</label>
                    <input type="text" className="kalki-input" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="e.g. Acme Corp" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1', boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Phone Number *</label>
                    <input type="text" className="kalki-input" value={newCustomer.phone} onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 10) setNewCustomer({...newCustomer, phone: val});
                    }} placeholder="9876543210" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1', boxSizing: "border-box" }} />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>GSTIN (Optional)</label>
                  <input type="text" className="kalki-input" value={newCustomer.gstin} onChange={e => setNewCustomer({...newCustomer, gstin: e.target.value})} placeholder="29ABCDE1234F1Z5" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1', boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Email (Optional)</label>
                  <input type="email" className="kalki-input" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="billing@acmecorp.com" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1', boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Billing Address (Optional)</label>
                  <textarea className="kalki-input" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="123 Business Road..." style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1', minHeight: '60px', boxSizing: "border-box" }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setIsAddingCustomer(false)} style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button onClick={handleCreateCustomer} className="kalki-button kalki-button--primary" style={{ padding: '8px 16px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Save Customer</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
