"use client";

import React, { useState, useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { Lock, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";

export function RunReviewTab({ 
  runId, 
  onBack 
}: { 
  runId: string, 
  onBack: () => void 
}) {
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);

  useEffect(() => {
    fetchRunDetails();
  }, [runId]);

  const fetchRunDetails = async () => {
    try {
      setLoading(true);
      const res = await apiGet<any>(`/api/payroll/runs/${runId}`);
      if (res.run) {
        setRunDetails(res.run);
        setPayslips(res.payslips || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLockPayroll = async () => {
    if (!confirm("Are you sure you want to lock this payroll? This will permanently freeze these payslips and automatically deduct any mapped salary advances. This action CANNOT be undone.")) {
      return;
    }
    
    try {
      setLocking(true);
      const res = await apiSend(`/api/payroll/runs/${runId}/lock`, "POST", {}) as any;
      if (res.error) {
        alert("Error locking payroll: " + res.error);
      } else {
        alert("Payroll successfully locked!");
        fetchRunDetails();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to lock payroll");
    } finally {
      setLocking(false);
    }
  };

  if (loading) {
    return <div className="kalki-loading-placeholder">Loading run details...</div>;
  }

  if (!runDetails) {
    return <div className="kalki-card">Run not found.</div>;
  }

  return (
    <div className="kalki-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--kalki-border)' }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: '0 0 0.5rem 0' }}>
            Payroll Run: {runDetails.periodStart} to {runDetails.periodEnd}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--kalki-text-muted)' }}>
            <span>Status: <strong>{runDetails.status}</strong></span>
            <span>Generated: {new Date(runDetails.runDate).toLocaleString()}</span>
          </div>
        </div>
        
        {runDetails.status === 'DRAFT' && (
          <button 
            className="kalki-btn kalki-btn-primary"
            onClick={handleLockPayroll}
            disabled={locking}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {locking ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {locking ? 'Locking...' : 'Lock Payroll & Deduct Advances'}
          </button>
        )}
        
        {runDetails.status === 'LOCKED' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontWeight: 600, padding: '8px 16px', background: '#dbeafe', borderRadius: '4px' }}>
            <Lock size={16} /> Locked
          </div>
        )}
        
        {runDetails.status === 'PAID' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 600, padding: '8px 16px', background: '#d1fae5', borderRadius: '4px' }}>
            <CheckCircle size={16} /> Paid
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--kalki-bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--kalki-text-muted)', marginBottom: '4px' }}>Total Gross</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>₹{Number(runDetails.totalGrossAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: 'var(--kalki-bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--kalki-text-muted)', marginBottom: '4px' }}>Total Deductions</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--kalki-danger)' }}>₹{Number(runDetails.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: 'var(--kalki-bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--kalki-text-muted)', marginBottom: '4px' }}>Total Net Payable</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--kalki-success)' }}>₹{Number(runDetails.totalNetAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Employee Payslips</h3>
      
      {payslips.length === 0 ? (
        <p className="kalki-text-muted">No payslips found in this run.</p>
      ) : (
        <table className="kalki-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th style={{ textAlign: 'center' }}>Present/Absent</th>
              <th style={{ textAlign: 'right' }}>Gross</th>
              <th style={{ textAlign: 'right' }}>Deductions</th>
              <th style={{ textAlign: 'right' }}>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map(ps => (
              <tr key={ps.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{ps.employeeName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--kalki-text-muted)' }}>{ps.employeeCode}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--kalki-success)' }}>{ps.totalPresentDays}</span> / <span style={{ color: 'var(--kalki-danger)' }}>{ps.totalAbsentDays}</span>
                </td>
                <td style={{ textAlign: 'right' }}>₹{Number(ps.grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', color: 'var(--kalki-danger)' }}>₹{Number(ps.deductionsAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--kalki-success)' }}>₹{Number(ps.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
