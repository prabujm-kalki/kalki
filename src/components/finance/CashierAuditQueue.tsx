"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";

export function CashierAuditQueue({ initialPos }: { initialPos: any[] }) {
  const [pos, setPos] = useState(initialPos);
  const [auditingPo, setAuditingPo] = useState<any | null>(null);
  const [auditLines, setAuditLines] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // States for cashier override
  const [cashierBillAmount, setCashierBillAmount] = useState<string>("");
  const [cashierNotes, setCashierNotes] = useState<string>("");
  const [billFile, setBillFile] = useState<File | null>(null);

  const formatCurrency = (val: any) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val) || 0);
  };

  const handleAuditClick = async (po: any) => {
    setAuditingPo(po);
    setLoadingLines(true);
    setCashierBillAmount(po.cashierBillAmount || po.totalAmount || "");
    try {
      const res = await fetch(`/api/public/po?token=${po.publicToken}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLines(data.lines || []);
      } else {
        alert("Failed to load PO details");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading PO lines");
    } finally {
      setLoadingLines(false);
    }
  };

  const submitAudit = async () => {
    const finalAmount = cashierBillAmount || calculatedTotal.toString();
    
    if (!finalAmount) {
      alert("Please enter the actual Cashier Bill Amount.");
      return;
    }
    if (!billFile) {
      alert("It is mandatory to upload the physical bill image/PDF.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("cashierBillAmount", finalAmount);
      formData.append("notes", cashierNotes);
      formData.append("lines", JSON.stringify(auditLines));
      formData.append("billFile", billFile);

      // Create new API endpoint for Cashier Audit processing
      const res = await fetch(`/api/finance/cashier/audit/${auditingPo.id}`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        setPos(pos.filter(p => p.id !== auditingPo.id));
        setAuditingPo(null);
        alert("Audit completed and sent for payment processing.");
      } else {
        const data = await res.json();
        alert("Failed to process audit: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Error processing audit");
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedTotal = auditLines.reduce((acc, line) => {
    const qty = Number(line.receivedQuantity !== undefined ? line.receivedQuantity : line.orderedQuantity);
    const price = Number(line.unitRate || 0);
    return acc + (qty * price);
  }, 0);

  const difference = (cashierBillAmount === "" ? 0 : Number(cashierBillAmount) - calculatedTotal);

  return (
    <div>
      {/* Audit Modal */}
      {auditingPo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '800px', maxHeight: '90%', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Cashier Audit - PO #{auditingPo.id}</h2>
              <button onClick={() => setAuditingPo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {loadingLines ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading lines...</div>
              ) : (
                <>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
                    <div>
                      <p className="muted" style={{ margin: '0 0 0.25rem 0' }}>Vendor</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{auditingPo.vendorName}</p>
                    </div>
                    <div>
                      <p className="muted" style={{ margin: '0 0 0.25rem 0' }}>Status</p>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#f59e0b' }}>Awaiting Audit</p>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Manager's Received Quantities</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '0.5rem' }}>Item</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Ordered</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right', color: '#2563eb' }}>Received</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLines.map((line, idx) => {
                        const recQty = Number(line.receivedQuantity !== undefined && line.receivedQuantity !== null ? line.receivedQuantity : line.orderedQuantity);
                        const lineTotal = recQty * Number(line.unitRate || 0);
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.5rem' }}>{line.itemName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>{line.orderedQuantity}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>{recQty}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                                <span>₹</span>
                                <input 
                                  type="number" 
                                  value={line.unitRate || 0}
                                  onChange={(e) => {
                                    const newLines = [...auditLines];
                                    newLines[idx].unitRate = e.target.value;
                                    setAuditLines(newLines);
                                  }}
                                  style={{ width: '80px', textAlign: 'right', padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                                />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>Calculated Total:</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(calculatedTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Cashier Verification</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600' }}>
                            Physical Bill Amount (₹)
                          </label>
                          <button 
                            onClick={() => setCashierBillAmount(calculatedTotal.toString())}
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: '600', textDecoration: 'underline' }}
                          >
                            Use Calculated
                          </button>
                        </div>
                        <input 
                          type="number" 
                          value={cashierBillAmount || calculatedTotal || ""}
                          onChange={(e) => setCashierBillAmount(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '1rem', fontWeight: 'bold' }}
                          placeholder="0.00"
                        />
                        {Math.abs(difference) > 0.01 && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>
                            Discrepancy: {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          Upload Bill (Mandatory)
                        </label>
                        <input 
                          type="file" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setBillFile(e.target.files[0]);
                            }
                          }}
                          accept="image/*,.pdf"
                          style={{ width: '100%', padding: '0.4rem', border: '1px dashed #cbd5e1', borderRadius: '0.25rem', fontSize: '0.875rem', backgroundColor: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          Audit Notes (Optional)
                        </label>
                        <textarea 
                          value={cashierNotes}
                          onChange={(e) => setCashierNotes(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.875rem', minHeight: '60px' }}
                          placeholder={Math.abs(difference) > 0.01 ? "Please explain the discrepancy..." : "Any comments..."}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={() => setAuditingPo(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}
              >
                Cancel
              </button>
              <button 
                onClick={submitAudit}
                disabled={submitting || loadingLines}
                style={{ padding: '0.5rem 1.5rem', border: 'none', borderRadius: '0.25rem', backgroundColor: '#10b981', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={16} />
                {submitting ? 'Processing...' : 'Verify & Send to Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="card" style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Date</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>PO Ref</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Vendor</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Est. Amount</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pos.map(po => (
              <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{po.id}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{po.vendorName}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{formatCurrency(po.totalAmount)}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <button 
                    onClick={() => handleAuditClick(po)}
                    style={{ padding: '0.3rem 0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '500', fontSize: '0.75rem' }}
                  >
                    Audit Bill
                  </button>
                </td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No pending Purchase Orders to audit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
