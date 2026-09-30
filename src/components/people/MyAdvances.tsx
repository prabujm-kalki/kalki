"use client";

import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { fetchAdvancesDataForEmployee, submitAdvanceRequestAction } from "@/app/payroll/advances/actions";

export function MyAdvances({ employeeId }: { employeeId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    advanceTypeId: "",
    requestedAmount: "",
    repaymentMonths: "1",
  });

  const loadData = async () => {
    setIsLoading(true);
    const res = await fetchAdvancesDataForEmployee(employeeId);
    if (res.success && res.data) {
      setRequests(res.data.requests || []);
      setTypes(res.data.types || []);
    } else {
      setError(res.error || "Failed to load your advances data.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const handleSubmitRequest = async () => {
    if (!reqForm.advanceTypeId || !reqForm.requestedAmount) {
      alert("Please fill all required fields.");
      return;
    }
    const res = await submitAdvanceRequestAction({
      employeeId: employeeId,
      advanceTypeId: reqForm.advanceTypeId,
      requestedAmount: parseFloat(reqForm.requestedAmount),
      repaymentMonths: parseInt(reqForm.repaymentMonths),
    });

    if (res.success) {
      setIsRequestModalOpen(false);
      loadData();
    } else {
      alert(res.error || "Failed to submit request.");
    }
  };

  const getBadgeClass = (status: string) => {
    if (status === "APPROVED") return "kalki-badge kalki-badge--success";
    if (status === "REJECTED") return "kalki-badge kalki-badge--danger";
    return "kalki-badge kalki-badge--warning";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--kalki-text-primary)' }}>My Advances</h2>
          <p style={{ color: 'var(--kalki-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Request new advances and track your existing loans.
          </p>
        </div>
        <button 
          className="kalki-button kalki-button--primary"
          onClick={() => {
            setReqForm({ advanceTypeId: "", requestedAmount: "", repaymentMonths: "1" });
            setIsRequestModalOpen(true);
          }}
        >
          <Plus size={16} style={{ marginRight: '8px' }} /> Request Advance
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px', borderRadius: '6px' }}>{error}</div>}

      <div style={{ background: '#fff', border: '1px solid var(--kalki-border)', borderRadius: '8px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#666' }}>
            <p style={{ marginBottom: '16px' }}>You have not submitted any advance requests yet.</p>
          </div>
        ) : (
          <div className="kalki-table-container">
            <table className="kalki-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Advance Type</th>
                  <th>Requested Amt</th>
                  <th>Approved Amt</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{r.advanceTypeName}</td>
                    <td>₹{Number(r.requestedAmount).toLocaleString()}</td>
                    <td>{r.approvedAmount ? `₹${Number(r.approvedAmount).toLocaleString()} (${r.repaymentMonths}mo)` : '-'}</td>
                    <td>
                      <span className={getBadgeClass(r.status)}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isRequestModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--kalki-bg-panel, #ffffff)', borderRadius: '12px', width: '100%', maxWidth: '450px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--kalki-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--kalki-text-primary)' }}>Submit Request</h3>
              <button onClick={() => setIsRequestModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--kalki-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--kalki-text-primary)' }}>Advance Type</label>
                <select 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--kalki-border)', background: 'var(--kalki-bg-panel, #ffffff)', color: 'var(--kalki-text-primary)' }}
                  value={reqForm.advanceTypeId} 
                  onChange={e => setReqForm({...reqForm, advanceTypeId: e.target.value})}
                  required
                >
                  <option value="" style={{ color: 'var(--kalki-text-primary)' }}>-- Choose Type --</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id} style={{ color: 'var(--kalki-text-primary)' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--kalki-text-primary)' }}>Requested Amount (₹)</label>
                <input 
                  type="number" 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--kalki-border)', background: 'var(--kalki-bg-panel, #ffffff)', color: 'var(--kalki-text-primary)' }}
                  value={reqForm.requestedAmount} 
                  onChange={e => setReqForm({...reqForm, requestedAmount: e.target.value})} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--kalki-text-primary)' }}>Repayment Months</label>
                <input 
                  type="number" 
                  min="1" 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--kalki-border)', background: 'var(--kalki-bg-panel, #ffffff)', color: 'var(--kalki-text-primary)' }}
                  value={reqForm.repaymentMonths} 
                  onChange={e => setReqForm({...reqForm, repaymentMonths: e.target.value})} 
                />
              </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--kalki-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--kalki-bg-app, #f8fafc)', borderRadius: '0 0 12px 12px' }}>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="kalki-button kalki-button--secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitRequest}
                className="kalki-button kalki-button--primary"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
