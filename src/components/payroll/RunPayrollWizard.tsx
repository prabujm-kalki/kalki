"use client";

import React, { useState } from "react";
import { DollarSign, Loader2, FileSpreadsheet, CheckCircle } from "lucide-react";
import { apiGet, apiSend } from "@/lib/api";

type PayrollPreview = {
  employeeId: string;
  employeeName: string;
  totalPresent: number;
  totalAbsent: number;
  grossAmount: number;
  deductions: number;
  advanceDeductions: number;
  netAmount: number;
};

export function RunPayrollWizard({ organizationId, locationId }: { organizationId: string, locationId: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PayrollPreview[]>([]);
  
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePreview = async () => {
    if (!periodStart || !periodEnd) {
      setError("Please select both start and end dates.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await apiSend(`/api/payroll/preview`, "POST", {
        organizationId,
        locationId,
        periodStart,
        periodEnd
      }) as any;
      
      if (res.error) {
        setError(res.error);
      } else {
        setPreviewData(res.preview);
        setStep(2);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to generate preview.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiSend(`/api/payroll/finalize`, "POST", {
        organizationId,
        locationId,
        periodStart,
        periodEnd,
        previewData
      }) as any;
      
      if (res.error) {
        setError(res.error);
      } else {
        setStep(3);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to finalize payroll.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="kalki-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <CheckCircle size={64} className="kalki-icon-success" style={{ margin: '0 auto 1.5rem', color: '#10b981' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Payroll Run Completed!</h2>
        <p className="kalki-text-muted" style={{ marginBottom: '2rem' }}>
          Payslips have been successfully generated for the period {periodStart} to {periodEnd}.
        </p>
        <button className="kalki-btn kalki-btn-secondary" onClick={() => { setStep(1); setPreviewData([]); }}>
          Run Another Payroll
        </button>
      </div>
    );
  }

  return (
    <div className="kalki-card">
      <div className="kalki-section-header">
        <h3 className="kalki-section-title">
          <DollarSign size={20} className="kalki-icon-accent" /> Run Monthly Payroll
        </h3>
      </div>
      
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--kalki-radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <div style={{ maxWidth: '600px' }}>
          <p className="kalki-text-muted" style={{ marginBottom: '1.5rem' }}>
            Select the pay period. The system will automatically fetch attendance logs, calculate gross pay from active salary structures, and deduct any pending salary advances.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <div className="kalki-form-group" style={{ flex: 1 }}>
              <label>Period Start Date</label>
              <input 
                type="date" 
                className="kalki-input" 
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="kalki-form-group" style={{ flex: 1 }}>
              <label>Period End Date</label>
              <input 
                type="date" 
                className="kalki-input" 
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            className="kalki-btn kalki-btn-primary" 
            onClick={handleGeneratePreview}
            disabled={loading}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Calculating...</> : 'Generate Payroll Preview'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Review Payroll Calculations</h4>
              <p className="kalki-text-muted" style={{ fontSize: '0.9rem' }}>Period: {periodStart} to {periodEnd}</p>
            </div>
            <button className="kalki-btn kalki-btn-secondary" onClick={() => setStep(1)}>
              Back to Settings
            </button>
          </div>

          <div className="kalki-table-container" style={{ marginBottom: '2rem' }}>
            <table className="kalki-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th style={{ textAlign: 'right' }}>Present/Absent</th>
                  <th style={{ textAlign: 'right' }}>Gross Pay</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Advance Recovery</th>
                  <th style={{ textAlign: 'right' }}>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {previewData.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center' }}>No employees found for this period.</td></tr>
                ) : (
                  previewData.map(p => (
                    <tr key={p.employeeId}>
                      <td style={{ fontWeight: 500 }}>{p.employeeName}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: '#10b981' }}>{p.totalPresent}</span> / <span style={{ color: '#ef4444' }}>{p.totalAbsent}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>₹{p.grossAmount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: '#ef4444' }}>₹{p.deductions.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: '#f59e0b' }}>₹{p.advanceDeductions.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{p.netAmount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot style={{ backgroundColor: 'var(--kalki-bg-secondary)', fontWeight: 600 }}>
                <tr>
                  <td colSpan={2}>Totals</td>
                  <td style={{ textAlign: 'right' }}>₹{previewData.reduce((acc, curr) => acc + curr.grossAmount, 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: '#ef4444' }}>₹{previewData.reduce((acc, curr) => acc + curr.deductions, 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: '#f59e0b' }}>₹{previewData.reduce((acc, curr) => acc + curr.advanceDeductions, 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>₹{previewData.reduce((acc, curr) => acc + curr.netAmount, 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button className="kalki-btn kalki-btn-primary" onClick={handleFinalize} disabled={loading || previewData.length === 0}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Finalizing...</> : <><FileSpreadsheet size={18} /> Finalize & Generate Payslips</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
