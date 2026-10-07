"use client";

import { useState } from "react";
import { CheckCircle, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function BillsQueue({ initialPos }: { initialPos: any[] }) {
  const [pos, setPos] = useState(initialPos);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [viewingPo, setViewingPo] = useState<any | null>(null);
  const [poLines, setPoLines] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const router = useRouter();

  const formatCurrency = (val: any) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val) || 0);
  };

  const processBill = async (po: any) => {
    setSubmittingId(po.id);
    try {
      const res = await fetch(`/api/finance/bills/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId: po.id })
      });

      if (res.ok) {
        setPos(pos.filter(p => p.id !== po.id));
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process bill");
      }
    } catch (e) {
      console.error(e);
      alert("Error processing bill");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleViewPo = async (po: any) => {
    setViewingPo(po);
    setLoadingLines(true);
    try {
      const res = await fetch(`/api/public/po?token=${po.publicToken}`);
      if (res.ok) {
        const data = await res.json();
        setPoLines(data.lines || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLines(false);
    }
  };

  return (
    <>
      <div className="card" style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Date</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>PO Ref</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Vendor</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Verified Amount</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Notes / Bill</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pos.map(po => {
               const attachments = po.cashierAttachments as any || {};
               return (
                 <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                   <td style={{ padding: '0.75rem 1rem' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                   <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                     <button 
                       onClick={() => handleViewPo(po)} 
                       style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '600', padding: 0, textDecoration: 'underline' }}
                       title="View detailed quantities and pricing"
                     >
                       {po.poNumber || po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5)}
                     </button>
                   </td>
                   <td style={{ padding: '0.75rem 1rem' }}>{po.vendorName}</td>
                   <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#10b981' }}>{formatCurrency(po.verifiedBillAmount || po.totalAmount)}</td>
                   <td style={{ padding: '0.75rem 1rem' }}>
                     {attachments.notes && <div style={{ fontSize: '0.75rem', marginBottom: '4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={attachments.notes}>{attachments.notes}</div>}
                     {attachments.fileUrl && (
                       <a href={attachments.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                         <FileText size={12} /> View Bill
                       </a>
                     )}
                   </td>
                   <td style={{ padding: '0.75rem 1rem' }}>
                     <button 
                       onClick={() => processBill(po)}
                       disabled={submittingId === po.id}
                       style={{ padding: '0.3rem 0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: submittingId === po.id ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                     >
                       {submittingId === po.id ? 'Processing...' : <><CheckCircle size={14} /> Record Invoice</>}
                     </button>
                   </td>
                 </tr>
               );
            })}
            {pos.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audited Purchase Orders waiting for invoice processing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PO Details Modal */}
      {viewingPo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '800px', maxHeight: '90%', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>PO Details - #{viewingPo.poNumber || viewingPo.id.split('-')[0].toUpperCase() + '-' + viewingPo.id.substring(1, 5)}</h2>
              <button onClick={() => setViewingPo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {loadingLines ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading line details...</div>
              ) : (
                <>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
                    <div>
                      <p className="muted" style={{ margin: '0 0 0.25rem 0' }}>Vendor</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{viewingPo.vendorName}</p>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Item</th>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ordered Qty</th>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Received / Approved Qty</th>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Unit Price</th>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Final Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poLines.map((line, idx) => {
                        const recQty = Number(line.receivedQuantity !== undefined && line.receivedQuantity !== null ? line.receivedQuantity : line.orderedQuantity);
                        const lineTotal = recQty * Number(line.unitRate || 0);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 0.5rem' }}>{line.itemName} - {line.unitOfMeasure}</td>
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>{line.orderedQuantity}</td>
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>{recQty}</td>
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{formatCurrency(line.unitRate || 0)}</td>
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>Total Final Amount:</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#10b981' }}>
                          {formatCurrency(viewingPo.verifiedBillAmount || viewingPo.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={() => setViewingPo(null)}
                style={{ padding: '0.5rem 1.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
