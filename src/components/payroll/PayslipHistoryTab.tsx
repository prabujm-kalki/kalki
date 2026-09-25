import React, { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { History, Download, FileText, CheckCircle2 } from "lucide-react";

interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  runDate: string;
  status: string;
  payslipsCount: number;
  totalGross: number;
  totalNet: number;
}

export function PayslipHistoryTab({ organizationId, locationId }: { organizationId: string, locationId: string }) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const res = await apiGet<PayrollRun[]>(`/api/payroll/runs?organizationId=${organizationId}&locationId=${locationId}`);
        setRuns(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchRuns();
  }, [organizationId, locationId]);

  if (loading) {
    return (
      <div className="kalki-card" style={{ padding: "3rem", textAlign: "center" }}>
        Loading history...
      </div>
    );
  }

  return (
    <div className="kalki-card">
      <div className="kalki-section-header">
        <h3 className="kalki-section-title">
          <History size={20} className="kalki-icon-accent" /> Payslip History & Reports
        </h3>
      </div>
      <p className="kalki-text-muted" style={{ marginBottom: '1.5rem' }}>
        View past payroll runs, download payslips, and generate statutory compliance reports (EPF, ESI, PT).
      </p>

      <div className="kalki-table-container">
        <table className="kalki-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Run Date</th>
              <th>Payslips</th>
              <th>Gross Total</th>
              <th>Net Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--kalki-text-muted)' }}>
                  No previous payroll runs found.
                </td>
              </tr>
            ) : (
              runs.map(run => {
                const startDate = new Date(run.periodStart).toLocaleDateString();
                const endDate = new Date(run.periodEnd).toLocaleDateString();
                const runDate = new Date(run.runDate).toLocaleString();
                
                return (
                  <tr key={run.id}>
                    <td style={{ fontWeight: 500 }}>{startDate} to {endDate}</td>
                    <td style={{ color: "var(--kalki-text-muted)" }}>{runDate}</td>
                    <td>{run.payslipsCount}</td>
                    <td>₹{run.totalGross?.toFixed(2) || "0.00"}</td>
                    <td style={{ fontWeight: 600 }}>₹{run.totalNet?.toFixed(2) || "0.00"}</td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: 'rgb(22, 163, 74)',
                        borderRadius: '1rem',
                        fontWeight: 600
                      }}>
                        <CheckCircle2 size={14} /> {run.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="kalki-btn kalki-btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Download Payslips ZIP">
                          <Download size={14} /> Payslips
                        </button>
                        <button className="kalki-btn kalki-btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Statutory Reports">
                          <FileText size={14} /> Reports
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
