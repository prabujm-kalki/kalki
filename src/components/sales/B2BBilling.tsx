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
        overallDiscount
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
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText color="#3b82f6" /> B2B Billing Terminal
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>Create premium, GST-compliant invoices seamlessly.</p>
        </div>
      </div>



      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Party Details Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="#64748b" /> Party Details
              </h2>
              <button 
                onClick={() => setIsAddingCustomer(true)}
                style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16}/> Add New Customer
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Select Customer *</label>
                <select className="kalki-select" value={customer.id} onChange={handleCustomerChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                  <option value="">-- Search Customer --</option>
                  {dbCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>GSTIN</label>
                <input type="text" className="kalki-input" disabled value={customer.gstin} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }} placeholder="Auto-filled" />
              </div>
            </div>
          </div>

          {/* Item Details Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} color="#64748b" /> Itemized Bill
              </h2>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', borderRadius: '8px 0 0 8px' }}>Item Description</th>
                    <th style={{ padding: '12px', width: '90px' }}>Qty</th>
                    <th style={{ padding: '12px', width: '120px' }}>Rate (₹)</th>
                    <th style={{ padding: '12px', width: '90px' }}>Disc %</th>
                    <th style={{ padding: '12px', width: '100px' }}>GST %</th>
                    <th style={{ padding: '12px', width: '130px', textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ padding: '12px', width: '50px', borderRadius: '0 8px 8px 0' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.map((item) => (
                    <tr key={item.uid} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                      <td style={{ padding: '12px' }}>
                        <select 
                          className="kalki-select"
                          value={item.id}
                          onChange={(e) => updateItemLine(item.uid, "id", e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                           <option value="">Select an Item</option>
                           {dbItems.map(i => <option key={i.id} value={i.id}>{i.nameEn}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="number" min="1" value={item.qty} onChange={(e) => updateItemLine(item.uid, "qty", e.target.value === "" ? "" : parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="number" value={item.rate} onChange={(e) => updateItemLine(item.uid, "rate", e.target.value === "" ? "" : parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="number" value={item.discountPercent} onChange={(e) => updateItemLine(item.uid, "discountPercent", e.target.value === "" ? "" : parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={item.taxRate} onChange={(e) => updateItemLine(item.uid, "taxRate", parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>
                        {item.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button onClick={() => removeItemLine(item.uid)} disabled={itemsList.length === 1} style={{ background: 'transparent', border: 'none', color: itemsList.length === 1 ? '#cbd5e1' : '#ef4444', cursor: itemsList.length === 1 ? 'not-allowed' : 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <button onClick={addItemLine} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px dashed #94a3b8', color: '#334155', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}>
                <Plus size={16} /> Add Another Line
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Premium Glass Panel */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <div style={{ ...glassStyle, padding: '24px' }}>
            
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} color="#3b82f6" /> Settings & Summary
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Terms</label>
                <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }}>
                  <option value="Cash">Cash</option><option value="Credit">Credit</option><option>Net 30</option><option>Advance against PI</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(255,255,255,0.8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '14px' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: '500' }}>₹ {subtotal.toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569', fontSize: '14px' }}>
                <span>Overall Discount</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '4px' }}>₹</span>
                  <input type="number" style={{ width: '70px', textAlign: 'right', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={overallDiscount} onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '14px' }}>
                <span>Total Tax (GST)</span>
                <span style={{ fontWeight: '500' }}>₹ {taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '14px' }}>
                <span>Round Off</span>
                <span style={{ fontWeight: '500' }}>₹ {roundOffAmount.toFixed(2)}</span>
              </div>
              
              <div style={{ height: '1px', background: '#cbd5e1', margin: '4px 0' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>Grand Total</span>
                <span style={{ fontWeight: '800', fontSize: '24px', color: '#3b82f6' }}>₹ {roundedGrandTotal.toFixed(2)}</span>
              </div>
            </div>
            
            {invoiceError && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fca5a5', fontSize: '14px', fontWeight: '500' }}>
                  {invoiceError}
                </div>
              )}
              {invoiceSuccess && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, padding: '16px 24px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '6px solid #22c55e', borderTop: '1px solid #bbf7d0', borderRight: '1px solid #bbf7d0', borderBottom: '1px solid #bbf7d0', fontSize: '16px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', animation: 'slideIn 0.3s ease-out forwards' }}>
                  <CheckCircle size={24} /> {invoiceSuccess}
                </div>
              )}
<button 
              onClick={handleSave} 
              disabled={isSubmitting} 
              style={{ width: '100%', marginTop: '24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: '600', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)', transition: 'transform 0.1s ease-in-out' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Save size={18} /> {isSubmitting ? "Processing..." : "Generate Invoice"}
            </button>
          </div>
        </div>

      </div>

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
                  <input type="text" className="kalki-input" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="e.g. Acme Corp" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Phone Number *</label>
                  <input type="text" className="kalki-input" value={newCustomer.phone} onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 10) setNewCustomer({...newCustomer, phone: val});
                  }} placeholder="9876543210" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>GSTIN (Optional)</label>
                <input type="text" className="kalki-input" value={newCustomer.gstin} onChange={e => setNewCustomer({...newCustomer, gstin: e.target.value})} placeholder="29ABCDE1234F1Z5" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Email (Optional)</label>
                <input type="email" className="kalki-input" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="billing@acmecorp.com" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Billing Address (Optional)</label>
                <textarea className="kalki-input" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="123 Business Road..." style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1', minHeight: '60px' }} />
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
  );
}

