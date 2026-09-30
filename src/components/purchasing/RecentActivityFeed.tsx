"use client";

import { Edit, Package, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export interface Activity {
  id: string;
  realId?: string;
  type: string;
  entity: string;
  date: string;
  status: string;
  value: number;
  publicToken?: string | null;
  vendorPhone?: any;
  poDeliveryMethod?: string | null;
  poWhatsappPreference?: string | null;
  whatsappPoTemplate?: string | null;
}

interface RecentActivityFeedProps {
  activities: Activity[];
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved": return <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Approved</span>;
    case "pending":
    case "pending approval": return <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Pending</span>;
    case "received": return <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Received</span>;
    case "discrepancy": return <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Discrepancy</span>;
    case "rejected": return <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Rejected</span>;
    default: return <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>{status}</span>;
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const qStr = query ? `?${query}` : '';
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  
  // States for Receive Modal
  const [receivingPo, setReceivingPo] = useState<Activity | null>(null);
  const [receiveLines, setReceiveLines] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [submittingReceive, setSubmittingReceive] = useState(false);

  return (
    <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
      {previewToken && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '900px', height: '90%', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Purchase Order Preview</h2>
              <button onClick={() => setPreviewToken(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
              <iframe src={`/public/po/${previewToken}`} style={{ width: '100%', height: '100%', border: 'none' }} title="PO Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {receivingPo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '600px', maxHeight: '90%', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Receive PO #{receivingPo.id}</h2>
              <button onClick={() => setReceivingPo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {loadingLines ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading lines...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Item Name</th>
                      <th style={{ padding: '0.5rem', width: '150px' }}>Quantity Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiveLines.map((line, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem' }}>{line.itemName} - {line.orderedQuantity}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <input 
                            type="number" 
                            value={line.receivedQuantity !== undefined ? line.receivedQuantity : line.orderedQuantity} 
                            onChange={(e) => {
                              const newLines = [...receiveLines];
                              newLines[idx].receivedQuantity = e.target.value;
                              setReceiveLines(newLines);
                            }}
                            style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={() => setReceivingPo(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setSubmittingReceive(true);
                  try {
                    const payloadLines = receiveLines.map(l => ({
                      id: l.id,
                      orderedQuantity: l.orderedQuantity,
                      receivedQuantity: l.receivedQuantity !== undefined ? l.receivedQuantity : l.orderedQuantity
                    }));
                    
                    const res = await fetch(`/api/purchase-orders/${receivingPo.realId}/receive`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ receivedLines: payloadLines })
                    });
                    
                    if (res.ok) {
                      setReceivingPo(null);
                      window.location.reload();
                    } else {
                      const data = await res.json();
                      alert("Failed to receive PO: " + (data.error || 'Unknown error'));
                    }
                  } catch (e) {
                    console.error(e);
                    alert("Error receiving PO");
                  } finally {
                    setSubmittingReceive(false);
                  }
                }}
                disabled={submittingReceive || loadingLines}
                style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.25rem', backgroundColor: '#3b82f6', color: 'white', cursor: submittingReceive ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {submittingReceive ? 'Submitting...' : 'Submit to Cashier'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Recent Activity Feed</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
            <option>Status: All</option>
          </select>
          <select style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
            <option>Last 7 Days</option>
          </select>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>ID / Ref</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Type</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Entity</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Date</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Value</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity, index) => (
            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.5rem 0.75rem' }}>
                {activity.realId && activity.type === 'Purchase Order' && activity.publicToken ? (
                  <button onClick={() => setPreviewToken(activity.publicToken!)} style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: '500', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}>
                    {activity.id}
                  </button>
                ) : activity.id}
              </td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{activity.type}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{activity.entity}</td>
              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{activity.date}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{getStatusBadge(activity.status)}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{formatCurrency(activity.value)}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {activity.type === 'Purchase Order' && activity.realId ? (
                    <>
                      {(activity.status === 'Approved' || activity.status === 'Sent_to_vendor') && activity.poDeliveryMethod === 'WHATSAPP' && (
                        <button 
                          onClick={async () => {
                            const publicUrl = window.location.origin + '/public/po/' + activity.publicToken;
                            let text = '';
                            
                            try {
                              const poRes = await fetch('/api/public/po?token=' + activity.publicToken);
                              let itemsList = '';
                              if (poRes.ok) {
                                const poData = await poRes.json();
                                if (poData.lines && poData.lines.length > 0) {
                                  itemsList = poData.lines.map((l: any) => `${l.itemName} - ${l.orderedQuantity}`).join('\n');
                                }
                              }
                              
                              const template = activity.whatsappPoTemplate || 'Hello, please find Purchase Order #{poId} for {amount}.\n\n{items}\n\nView and download the PDF here: {link}';
                              
                              text = template
                                .replace('{poId}', activity.id)
                                .replace('{amount}', formatCurrency(activity.value))
                                .replace(/{items?}/g, itemsList)
                                .replace('{link}', publicUrl);
                                
                            } catch (e) {
                              console.error("Failed to fetch PO lines for WhatsApp message");
                              text = `Hello, please find Purchase Order #${activity.id} for ${formatCurrency(activity.value)}.\n\nView and download the PDF here: ${publicUrl}`;
                            }
                            const phoneObj = activity.vendorPhone as any;
                            const phone = phoneObj?.phone?.replace(/\\D/g, '') || '';
                            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
                            
                            try {
                              await fetch(`/api/purchase-orders/${activity.realId}/mark-sent`, { method: "POST" });
                              window.open(waUrl, '_blank');
                              window.location.reload();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          style={{ padding: '0.3rem 0.6rem', backgroundColor: activity.status === 'Sent_to_vendor' ? '#94a3b8' : '#4ade80', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}
                        >{activity.status === 'Sent_to_vendor' ? 'Sent via WhatsApp' : 'Send via WhatsApp'}
                        </button>
                      )}
                      {(activity.status === 'Approved' || activity.status === 'Sent_to_vendor') && (
                        <button 
                          onClick={async () => {
                            setReceivingPo(activity);
                            setLoadingLines(true);
                            try {
                              const res = await fetch(`/api/public/po?token=${activity.publicToken}`);
                              if (res.ok) {
                                const data = await res.json();
                                setReceiveLines(data.lines || []);
                              } else {
                                alert("Failed to load PO details");
                              }
                            } catch (e) {
                              console.error(e);
                              alert("Error loading PO lines");
                            } finally {
                              setLoadingLines(false);
                            }
                          }}
                          style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Receive
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button style={{ padding: '0.2rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', fontSize: '0.65rem', cursor: 'pointer' }}>View</button>
                      <button style={{ padding: '0.2rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', fontSize: '0.65rem', cursor: 'pointer' }}>Receive</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {activities.length === 0 && (
             <tr>
               <td colSpan={7} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No recent activity found.</td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
