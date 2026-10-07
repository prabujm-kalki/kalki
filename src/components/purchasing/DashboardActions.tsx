"use client";

import { Plus, Users, PackagePlus, FileCheck, X, Trash2 } from "lucide-react";
import Link from "next/link";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface PendingApproval {
  id: string;
  realId: string;
  amount: number;
  vendorName: string;
  publicToken?: string | null;
  vendorPhone?: any;
  poDeliveryMethod?: string | null;
  poWhatsappPreference?: string | null;
  whatsappPoTemplate?: string | null;
  status?: string;
  cashierBillAmount?: string | number | null;
  cashierAttachments?: any;
  processOwnerAttachments?: any;
}

interface DashboardActionsProps {
  pendingApprovals: PendingApproval[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export function DashboardActions({ pendingApprovals }: DashboardActionsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Review Modal State
  const [reviewingApproval, setReviewingApproval] = useState<PendingApproval | null>(null);
  const [reviewLines, setReviewLines] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  
  const query = searchParams.toString();
  const href = `/purchasing/purchase-orders/create${query ? '?' + query : ''}`;

  const openApprovalModal = async (approval: PendingApproval) => {
    setReviewingApproval(approval);
    if (!approval.publicToken) {
      alert("PO missing public token, cannot review lines.");
      setReviewingApproval(null);
      return;
    }
    
    setLoadingLines(true);
    try {
      const res = await fetch(`/api/public/po?token=${approval.publicToken}`);
      if (res.ok) {
        const data = await res.json();
        // If final stage, we should edit receivedQuantity, else orderedQuantity
        const lines = data.lines || [];
        setReviewLines(lines.map((l: any) => ({
          ...l,
          // Use receivedQuantity for display/editing if it exists and status is audited
          editQuantity: approval.status === 'audited' ? (l.receivedQuantity || l.orderedQuantity) : l.orderedQuantity
        })));
        
        if (approval.status === 'audited' && data.po) {
          setReviewingApproval({
            ...approval,
            cashierBillAmount: data.po.cashierBillAmount
          });
        }
      } else {
        alert("Failed to load PO lines");
      }
    } catch (e) {
      alert("Error loading lines");
    } finally {
      setLoadingLines(false);
    }
  };

  const updateLineQty = (idx: number, val: string) => {
    const newLines = [...reviewLines];
    newLines[idx].editQuantity = val;
    setReviewLines(newLines);
  };
  
  const removeLine = (idx: number) => {
    const newLines = [...reviewLines];
    newLines.splice(idx, 1);
    setReviewLines(newLines);
  };

  const handleApprove = async (action: 'accept' | 'reject' | 'return' = 'accept') => {
    if (!reviewingApproval) return;
    const approval = reviewingApproval;
    const { id, realId, publicToken, poDeliveryMethod, vendorPhone, whatsappPoTemplate, status } = approval;
    
    try {
      setLoadingId(realId);
      // Map editQuantity correctly depending on the stage
      const apiLines = reviewLines.map(l => {
        if (status === 'audited') {
          return { ...l, receivedQuantity: l.editQuantity };
        } else {
          return { ...l, orderedQuantity: l.editQuantity };
        }
      });
      
      const res = await fetch(`/api/purchase-orders/${realId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: apiLines, action })
      });
      if (res.ok) {
        setReviewingApproval(null);
        // Only send WhatsApp if it's the first stage approval
        if (poDeliveryMethod === 'WHATSAPP' && approval.status !== 'audited' && action === 'accept') {
          if (window.confirm('Do you want to send the list through WhatsApp?')) {
            const publicUrl = window.location.origin + '/public/po/' + publicToken;
            
            // Recalculate amount dynamically if lines were edited
            const newTotal = apiLines.reduce((acc, l) => acc + (Number(l.orderedQuantity) * Number(l.unitRate)), 0);
            const itemsList = apiLines.map(l => `${l.itemName} - ${l.orderedQuantity}`).join('\n');
            
            const template = whatsappPoTemplate || 'Hello, please find Purchase Order #{poId} for {amount}.\n\n{items}\n\nView and download the PDF here: {link}';
            
            const text = template
              .replace('{poId}', id)
              .replace('{amount}', formatCurrency(newTotal || approval.amount))
              .replace(/{items?}/g, itemsList)
              .replace('{link}', publicUrl);
            const phoneObj = vendorPhone as any;
            const phone = phoneObj?.phone?.replace(/\D/g, '') || '';
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
            
            try {
              await fetch(`/api/purchase-orders/${realId}/mark-sent`, { method: "POST" });
              window.open(waUrl, '_blank');
            } catch (e) {
              console.error(e);
            }
          }
        }
        router.refresh();
      } else {
        alert(`Failed to ${action} PO`);
      }
    } catch (e) {
      alert("An error occurred");
    } finally {
      setLoadingId(null);
    }
  };
  
  const handleReject = async (id: string, realId: string) => {
    try {
      setLoadingId(realId);
      const res = await fetch(`/api/purchase-orders/${realId}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to reject PO");
      }
    } catch (e) {
      alert("An error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="card" style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white', height: '100%' }}>
      
      {/* Review Modal */}
      {reviewingApproval && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '600px', maxHeight: '90%', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Review & Approve PO #{reviewingApproval.id}</h2>
              <button onClick={() => setReviewingApproval(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {loadingLines ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading lines...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Item</th>
                      <th style={{ padding: '0.5rem', width: '100px' }}>Quantity</th>
                      <th style={{ padding: '0.5rem', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewLines.map((line, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem' }}>{line.itemName}</td>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                          <input 
                            type="number" 
                            step="any"
                            value={line.editQuantity} 
                            onChange={(e) => updateLineQty(idx, e.target.value)}
                            style={{ width: '60px', padding: '0.25rem', border: '1px solid #ccc', borderRadius: '0.25rem' }}
                          /> <span style={{ marginLeft: '4px' }}>{line.unitOfMeasure}</span>
                        </td>
                        {reviewingApproval.status === 'audited' && (
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>
                            ₹{line.unitRate}
                          </td>
                        )}
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reviewLines.length === 0 && (
                      <tr><td colSpan={reviewingApproval.status === 'audited' ? 4 : 3} style={{ textAlign: 'center', padding: '1rem' }}>No items left</td></tr>
                    )}
                  </tbody>
                </table>
              )}
              
              {reviewingApproval.status === 'audited' && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Cashier Bill Amount: </strong> ₹{reviewLines.reduce((acc, line) => acc + ((Number(line.editQuantity) || 0) * (Number(line.unitRate) || 0)), 0)}
                  </div>
                  {reviewingApproval.cashierAttachments && reviewingApproval.cashierAttachments.length > 0 && (
                    <a 
                      href={reviewingApproval.cashierAttachments[0]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ padding: '0.25rem 0.75rem', backgroundColor: '#16a34a', color: 'white', borderRadius: '0.25rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}
                    >
                      View Bill
                    </a>
                  )}
                </div>
              )}
              
              {reviewingApproval.processOwnerAttachments && reviewingApproval.processOwnerAttachments.length > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Process Owner: </strong> Proof of Delivery Attached
                  </div>
                  <a 
                    href={reviewingApproval.processOwnerAttachments[0]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ padding: '0.25rem 0.75rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.25rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500' }}
                  >
                    View Delivery Proof
                  </a>
                </div>
              )}
            </div>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
              <button onClick={() => setReviewingApproval(null)} style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '0.25rem', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
              {reviewingApproval.status === 'audited' && (
                <button onClick={() => handleApprove('return')} disabled={loadingId === reviewingApproval.realId} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.25rem', backgroundColor: '#eab308', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  {loadingId === reviewingApproval.realId ? '...' : 'Return'}
                </button>
              )}
              {reviewingApproval.status === 'audited' && (
                <button onClick={() => handleApprove('reject')} disabled={loadingId === reviewingApproval.realId} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.25rem', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  {loadingId === reviewingApproval.realId ? '...' : 'Reject'}
                </button>
              )}
              <button onClick={() => handleApprove('accept')} disabled={loadingId === reviewingApproval.realId || reviewLines.length === 0} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.25rem', backgroundColor: '#16a34a', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                {loadingId === reviewingApproval.realId ? 'Processing...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Quick Actions</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <Link href={`/purchasing/stock-assessment${query ? '?' + query : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.2rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.25rem' }}>
            <FileCheck size={12} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.7rem' }}>Daily Stock Assessment</span>
        </Link>

        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.2rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.25rem' }}>
            <Plus size={12} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.7rem' }}>Create New PO</span>
        </Link>

        <Link href={`/inventory${query ? '?' + query : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.2rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '0.25rem' }}>
            <PackagePlus size={12} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.7rem' }}>Record Goods Receipt</span>
        </Link>

        <Link href={`/purchasing/vendors${query ? '?' + query : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.2rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '0.25rem' }}>
            <Users size={12} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.7rem' }}>Add New Vendor</span>
        </Link>

        <Link href={`/purchasing/schedules${query ? '?' + query : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.2rem', backgroundColor: '#f3e8ff', color: '#9333ea', borderRadius: '0.25rem' }}>
            <FileCheck size={12} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.7rem' }}>Routine Tasks</span>
        </Link>
      </div>

      <div style={{ marginTop: '0.75rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCheck size={14} /> Requires My Approval
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {pendingApprovals.map(approval => (
            <div key={approval.id} style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.125rem' }}>
                <span style={{ fontWeight: '600', fontSize: '0.75rem' }}>{approval.id}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{formatCurrency(approval.amount)}</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{approval.vendorName}</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  onClick={() => openApprovalModal(approval)}
                  disabled={loadingId === approval.realId}
                  style={{ flex: 1, padding: '0.2rem', backgroundColor: 'transparent', color: loadingId === approval.realId ? '#86efac' : '#16a34a', border: '1px solid #16a34a', borderRadius: '0.25rem', fontSize: '0.65rem', cursor: loadingId === approval.realId ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  {loadingId === approval.realId ? 'Approving...' : 'Review & Approve'}
                </button>
                <button 
                  onClick={() => handleReject(approval.id, approval.realId)}
                  disabled={loadingId === approval.realId}
                  style={{ flex: 1, padding: '0.2rem', backgroundColor: 'transparent', color: loadingId === approval.realId ? '#fca5a5' : '#dc2626', border: '1px solid #dc2626', borderRadius: '0.25rem', fontSize: '0.65rem', cursor: loadingId === approval.realId ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  {loadingId === approval.realId ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
          {pendingApprovals.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No pending approvals</div>
          )}
        </div>
      </div>
    </div>
  );
}
