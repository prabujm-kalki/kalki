"use client";

import { X, Clock, User, ShieldAlert, CheckCircle2, PlayCircle, History, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface TaskTimelineModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskTimelineModal({ taskId, onClose }: TaskTimelineModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ task: any; logs: any[]; availableRoles: any[] } | null>(null);
  const [error, setError] = useState("");
  
  const [isReassigning, setIsReassigning] = useState(false);
  const [newRoleId, setNewRoleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/timeline`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        if (json.message && json.status >= 400) throw new Error(json.message);
        if (!json.task) throw new Error("Invalid response format");
        setData(json);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleReassign = async () => {
    if (!newRoleId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRoleId, reason: "Manual Reassignment by Admin" })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reassign");
      
      // Reload timeline
      setLoading(true);
      const reloadRes = await fetch(`/api/tasks/${taskId}/timeline`);
      const reloadJson = await reloadRes.json();
      setData(reloadJson);
      setIsReassigning(false);
      setNewRoleId("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return <PlayCircle size={16} className="text-blue-500" />;
      case 'audit_approved':
      case 'completed': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'escalated':
      case 'audit_rejected': return <ShieldAlert size={16} className="text-red-500" />;
      case 'max_escalation_reached': return <AlertCircle size={16} className="text-red-600" />;
      default: return <History size={16} className="text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return 'bg-blue-50 border-blue-200';
      case 'audit_approved':
      case 'completed': return 'bg-green-50 border-green-200';
      case 'escalated':
      case 'audit_rejected': return 'bg-red-50 border-red-200';
      case 'max_escalation_reached': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '650px', maxHeight: '90vh', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>Task Audit Timeline</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>ID: {taskId}</p>
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
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Task Context</div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#0f172a' }}>{data.task.contextData?.title || data.task.definitionName || 'System Task'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      <User size={14} /> 
                      {data.task.assignedUserEmail || data.task.assignedRoleName || 'Unassigned / System'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Current Status</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: data.task.status === 'audit_pending' ? '#fef3c7' : data.task.status === 'completed' ? '#dcfce7' : '#e0e7ff', color: data.task.status === 'audit_pending' ? '#d97706' : data.task.status === 'completed' ? '#16a34a' : '#4f46e5', textTransform: 'capitalize' }}>
                      {data.task.status.replace('_', ' ')}
                    </div>
                    {data.task.escalationLevel > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>
                        Escalation Level: {data.task.escalationLevel}
                      </div>
                    )}
                    
                    {/* Reassign Button (Manual Override) */}
                    <div style={{ marginTop: '1rem' }}>
                      {!isReassigning ? (
                        <button 
                          onClick={() => setIsReassigning(true)}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                          className="hover:bg-gray-200 transition-colors"
                        >
                          Reassign Task
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                          <select 
                            value={newRoleId}
                            onChange={(e) => setNewRoleId(e.target.value)}
                            style={{ padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', maxWidth: '150px' }}
                          >
                            <option value="">-- Select Role --</option>
                            {data.availableRoles?.map((r: any) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={handleReassign}
                            disabled={!newRoleId || isSubmitting}
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: (!newRoleId || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!newRoleId || isSubmitting) ? 0.7 : 1 }}
                          >
                            {isSubmitting ? '...' : 'Save'}
                          </button>
                          <button 
                            onClick={() => setIsReassigning(false)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Created At</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#0f172a', marginTop: '0.25rem' }}>{formatTime(data.task.createdAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Last Updated</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#0f172a', marginTop: '0.25rem' }}>{formatTime(data.task.updatedAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Time Allowed</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#0f172a', marginTop: '0.25rem' }}>{data.task.definitionTimeMins ? `${data.task.definitionTimeMins} mins` : 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div style={{ padding: '2rem 1.5rem', backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>Chronological History</h3>
                
                {data.logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    No audit logs recorded for this task.
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
                            
                            {(log.actorEmail || log.actorName) && (
                              <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <User size={12} /> Actor: {log.actorName ? `${log.actorName} (${log.actorEmail})` : log.actorEmail}
                              </div>
                            )}
                            {(!log.actorEmail && !log.actorName) && (
                              <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <User size={12} /> Actor: System / Auto-Pilot
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
