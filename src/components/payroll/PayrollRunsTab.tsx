"use client";

import React, { useState, useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { DollarSign, Plus, Eye, Lock, RefreshCw, FileText } from "lucide-react";
import { RunPayrollWizard } from "./RunPayrollWizard";
import { RunReviewTab } from "./RunReviewTab";

type PayrollRun = {
  id: string;
  periodStart: string;
  periodEnd: string;
  runDate: string;
  status: string; // DRAFT, LOCKED, PAID
  totalGrossAmount: string;
  totalDeductions: string;
  totalNetAmount: string;
  processedByUserId: string;
};

export function PayrollRunsTab({ organizationId, locationId }: { organizationId: string, locationId: string }) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    if (!showWizard && !selectedRunId) {
      fetchRuns();
    }
  }, [organizationId, locationId, showWizard, selectedRunId]);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await apiGet<any>(`/api/payroll/runs?organizationId=${organizationId}&locationId=${locationId}`);
      if (res.runs) {
        setRuns(res.runs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>DRAFT</span>;
      case 'LOCKED': return <span style={{ background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>LOCKED</span>;
      case 'PAID': return <span style={{ background: '#d1fae5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>PAID</span>;
      default: return <span>{status}</span>;
    }
  };

  if (showWizard) {
    return (
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <button className="kalki-btn kalki-btn-secondary" onClick={() => setShowWizard(false)}>
            &larr; Back to Runs
          </button>
        </div>
        <RunPayrollWizard organizationId={organizationId} locationId={locationId} />
      </div>
    );
  }

  if (selectedRunId) {
    return (
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <button className="kalki-btn kalki-btn-secondary" onClick={() => setSelectedRunId(null)}>
            &larr; Back to Runs
          </button>
        </div>
        <RunReviewTab runId={selectedRunId} onBack={() => setSelectedRunId(null)} />
      </div>
    );
  }

  return (
    <div className="kalki-card">
      <div className="kalki-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="kalki-section-title" style={{ margin: 0 }}>
          <DollarSign size={20} className="kalki-icon-accent" /> Payroll Runs
        </h3>
        <button className="kalki-btn kalki-btn-primary" onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> New Batch Run
        </button>
      </div>

      <p className="kalki-text-muted" style={{ marginBottom: '2rem' }}>
        View all generated payroll batches. Drafts must be reviewed and locked before they are marked for payment.
      </p>

      {loading ? (
        <div className="kalki-loading-placeholder">Loading payroll runs...</div>
      ) : runs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--kalki-text-muted)' }}>
          <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
          <p>No payroll runs found for this location.</p>
        </div>
      ) : (
        <table className="kalki-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Run Date</th>
              <th>Status</th>
              <th>Total Net</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr key={run.id}>
                <td>{run.periodStart} to {run.periodEnd}</td>
                <td>{new Date(run.runDate).toLocaleDateString()}</td>
                <td>{getStatusBadge(run.status)}</td>
                <td style={{ fontWeight: 600 }}>₹{Number(run.totalNetAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style={{ textAlign: "right" }}>
                  <button 
                    className="kalki-btn kalki-btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '13px' }}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    View / Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
