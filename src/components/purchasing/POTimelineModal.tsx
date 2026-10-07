"use client";

import { X, Clock, User, ShieldAlert, CheckCircle2, PlayCircle, History, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface POTimelineModalProps {
  poId: string;
  onClose: () => void;
}

export function POTimelineModal({ poId, onClose }: POTimelineModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ po: any; logs: any[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/purchase-orders/${poId}/timeline`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        if (!json.po) throw new Error("Invalid response format");
        setData(json);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [poId]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'purchase order drafted': return <PlayCircle size={16} className="text-blue-500" />;
      case 'verified by cashier':
      case 'goods received (process owner)':
      case 'audit audited': 
      case 'audit completed': return <CheckCircle2 size={16} className="text-green-500" />;
      default: return <History size={16} className="text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'purchase order drafted': return 'bg-blue-50 border-blue-200';
      case 'verified by cashier':
      case 'goods received (process owner)':
      case 'audit audited':
      case 'audit completed': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '650px', maxHeight: '90vh', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>Purchase Order Timeline</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>ID: {poId}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', color: '#64748b' }} className="hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0', backgroundColor: '#fff' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>Loading timeline data...</div>
          ) : error ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>Error: {error}</div>
          ) : data ? (
            <>
              {/* Header Section */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>PO Context</div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#0f172a' }}>PO: {data.po.poNumber || 'New Draft'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      <User size={14} /> 
                      {data.po.vendorName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Current Status</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: data.po.status.includes('pending') ? '#e0e7ff' : data.po.status === 'audited' || data.po.status === 'completed' ? '#dcfce7' : '#f1f5f9', color: data.po.status.includes('pending') ? '#4f46e5' : data.po.status === 'audited' || data.po.status === 'completed' ? '#16a34a' : '#475569', textTransform: 'capitalize' }}>
                      {data.po.status.replace(/_/g, ' ')}
                    </div>
                    
                    {/* Pending Information */}
                    {(data as any).pendingRoleName && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#0f172a' }}>Pending With:</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}>
                          <ShieldAlert size={12} className="text-blue-500" /> 
                          <span>Role: <strong style={{ color: '#0f172a' }}>{(data as any).pendingRoleName}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} className="text-blue-500" />
                          <span>Assigned To: <strong style={{ color: '#0f172a' }}>{(data as any).pendingEmployeeName || 'Unassigned'}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Created At</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#0f172a', marginTop: '0.25rem' }}>{formatTime(data.po.createdAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Last Updated</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#0f172a', marginTop: '0.25rem' }}>{formatTime(data.po.updatedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div style={{ padding: '2rem 1.5rem', backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>Chronological History</h3>
                
                {data.logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    No audit logs recorded for this PO.
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* Vertical Line */}
                    <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '15px', width: '2px', backgroundColor: '#e2e8f0' }}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {data.logs.map((log: any, idx: number) => (
                        <div key={log.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                          {/* Node Icon */}
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'white', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} className={getActionColor(log.action)}>
                            {getActionIcon(log.action)}
                          </div>
                          
                          {/* Content Card */}
                          <div style={{ flex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0f172a', textTransform: 'capitalize' }}>
                                {log.action.replace(/_/g, ' ')}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={12} />
                                {formatTime(log.createdAt)}
                              </div>
                            </div>
                            
                            {(log.actorName) && (
                              <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <User size={12} /> Actor: {log.actorName}
                              </div>
                            )}

                            {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                              <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#475569', border: '1px dashed #cbd5e1' }}>
                                {Object.entries(log.metadata).map(([key, value]) => (
                                  <div key={key} style={{ display: 'flex', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: '600', width: '120px', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
