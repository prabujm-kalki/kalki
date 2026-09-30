"use client";

import React, { useState, useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";
import { CheckCircle, XCircle, Clock, CheckSquare } from "lucide-react";
import { generateFnFPayroll } from "@/app/payroll/processing/actions";

type FnFExit = {
  id: string;
  employeeId: string;
  locationId: string;
  organizationId: string;
  employeeCode: string;
  employeeName: string;
  type: string;
  reason: string;
  requestedLastWorkingDay: string;
  approvedLastWorkingDay: string | null;
  status: string;
  requestedAt: string;
};

export function FnFSettlementsTab({ organizationId }: { organizationId: string }) {
  const [exits, setExits] = useState<FnFExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedExit, setSelectedExit] = useState<FnFExit | null>(null);
  const [actionStatus, setActionStatus] = useState<"APPROVED" | "REJECTED" | "COMPLETED">("APPROVED");
  const [approvedDate, setApprovedDate] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [generatingExit, setGeneratingExit] = useState<FnFExit | null>(null);
  const [adHocEarnings, setAdHocEarnings] = useState<number>(0);
  const [adHocDeductions, setAdHocDeductions] = useState<number>(0);

  useEffect(() => {
    fetchExits();
  }, [organizationId]);

  async function fetchExits() {
    setLoading(true);
    try {
      const res = await apiGet<{ exits: FnFExit[] }>(`/api/employees/exits?organizationId=${organizationId}`);
      setExits(res.exits || []);
      setError(null);
    } catch (err) {
      setError("Failed to load F&F settlements.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExit) return;

    setSubmitting(true);
    try {
      await apiSend(`/api/employees/exits/${selectedExit.id}`, "PUT", {
        status: actionStatus,
        approvedLastWorkingDay: approvedDate || undefined,
        reviewComment: comment,
      });
      alert(`Exit request marked as ${actionStatus}.`);
      setSelectedExit(null);
      fetchExits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to process request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <StatusMessage tone="loading">Loading F&F Settlements...</StatusMessage>;
  if (error) return <StatusMessage tone="error">{error}</StatusMessage>;

  return (
    <div className="kalki-section">
      <div className="kalki-section-header">
        <h2 className="kalki-section-title">Full & Final (F&F) Settlements</h2>
        <p className="kalki-section-description">Manage employee resignations and terminations, process their final dues, and officially conclude their employment.</p>
      </div>

      <div className="kalki-section-content" style={{ padding: 0 }}>
        {exits.length === 0 ? (
          <div style={{ padding: "16px" }}><StatusMessage tone="empty">No exit requests found.</StatusMessage></div>
        ) : (
          <div className="kalki-table-container">
            <table className="kalki-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Requested Last Day</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {exits.map(exit => (
                  <tr key={exit.id}>
                    <td>
                      <strong>{exit.employeeName}</strong>
                      <div className="muted" style={{ fontSize: "0.85em" }}>{exit.employeeCode}</div>
                    </td>
                    <td>
                      <span className={`kalki-badge kalki-badge--${exit.type === 'TERMINATION' ? 'danger' : 'warning'}`}>
                        {exit.type}
                      </span>
                    </td>
                    <td>{new Date(exit.requestedLastWorkingDay).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {exit.status === 'PENDING' && <Clock size={14} className="text-amber-500" />}
                        {exit.status === 'APPROVED' && <CheckSquare size={14} className="text-emerald-500" />}
                        {exit.status === 'COMPLETED' && <CheckCircle size={14} className="text-blue-500" />}
                        {exit.status === 'REJECTED' && <XCircle size={14} className="text-red-500" />}
                        <span style={{ fontWeight: 600, fontSize: "0.85em" }}>{exit.status}</span>
                      </div>
                    </td>
                    <td>
                      {exit.status !== 'COMPLETED' && exit.status !== 'REJECTED' && exit.status !== 'WITHDRAWN' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="kalki-button kalki-button--secondary kalki-button--sm" 
                            onClick={() => {
                              setSelectedExit(exit);
                              setApprovedDate(exit.requestedLastWorkingDay ? new Date(exit.requestedLastWorkingDay).toISOString().split('T')[0] : "");
                              setActionStatus(exit.status === "PENDING" ? "APPROVED" : "COMPLETED");
                              setComment("");
                            }}
                          >
                            Process
                          </button>
                          
                          {exit.status === 'APPROVED' && (
                            <button 
                              className="kalki-button kalki-button--primary kalki-button--sm"
                              onClick={() => {
                                setGeneratingExit(exit);
                                setAdHocEarnings(0);
                                setAdHocDeductions(0);
                              }}
                            >
                              Generate F&F Payslip
                            </button>
                          )}
                        </div>
                      )}
                      {exit.status === 'COMPLETED' && (
                        <span className="muted" style={{ fontSize: "0.85em" }}>Settled</span>
                      )}
                      {(exit.status === 'REJECTED' || exit.status === 'WITHDRAWN') && (
                        <button 
                          className="kalki-button kalki-button--secondary kalki-button--sm" 
                          style={{ color: "var(--kalki-danger)", borderColor: "var(--kalki-danger)" }}
                          onClick={async () => {
                            if (confirm("Are you sure you want to remove this record?")) {
                              try {
                                await apiSend(`/api/employees/exits/${exit.id}`, "DELETE");
                                fetchExits();
                              } catch (e) {
                                alert("Failed to delete record.");
                              }
                            }
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedExit && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="kalki-card" style={{ width: "500px", padding: "24px", backgroundColor: "var(--kalki-surface, #ffffff)", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Process F&F: {selectedExit.employeeName}</h3>
            
            <div style={{ background: "var(--kalki-surface-hover)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.9em" }}>
              <strong>Type:</strong> {selectedExit.type} <br />
              <strong>Reason:</strong> {selectedExit.reason}
            </div>

            <form onSubmit={handleProcess} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="kalki-form-group">
                <label>Action</label>
                <select className="kalki-input" value={actionStatus} onChange={e => setActionStatus(e.target.value as any)} disabled={submitting}>
                  {selectedExit.status === 'PENDING' && <option value="APPROVED">Approve Exit</option>}
                  {selectedExit.status === 'PENDING' && <option value="REJECTED">Reject Exit</option>}
                  {(selectedExit.status === 'APPROVED' || selectedExit.status === 'PENDING') && <option value="COMPLETED">Mark as Fully Settled (Completed)</option>}
                </select>
              </div>

              {(actionStatus === 'APPROVED' || actionStatus === 'COMPLETED') && (
                <div className="kalki-form-group">
                  <label>Approved Last Working Day</label>
                  <input type="date" className="kalki-input" required value={approvedDate} onChange={e => setApprovedDate(e.target.value)} disabled={submitting} />
                </div>
              )}

              {actionStatus === 'COMPLETED' && (
                <div style={{ padding: "12px", border: "1px solid var(--warning)", background: "var(--warning-light)", borderRadius: "8px", fontSize: "0.85em", color: "var(--warning-dark)" }}>
                  <strong>Note:</strong> Marking as COMPLETED will finalize the F&F Settlement and officially change the employee's status in the system to EXITED. All dues, recoveries, and full and final calculations should be performed offline or via the dedicated calculator before taking this action.
                </div>
              )}

              <div className="kalki-form-group">
                <label>Review Notes / Comments</label>
                <textarea className="kalki-input" rows={3} value={comment} onChange={e => setComment(e.target.value)} disabled={submitting} placeholder="Add any remarks regarding calculations, notice period waivers, etc." />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button type="button" className="kalki-button kalki-button--secondary" onClick={() => setSelectedExit(null)} disabled={submitting}>Cancel</button>
                <button type="submit" className="kalki-button kalki-button--primary" disabled={submitting}>{submitting ? "Processing..." : "Confirm Action"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {generatingExit && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="kalki-card" style={{ width: "500px", padding: "24px", backgroundColor: "var(--kalki-surface, #ffffff)", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Generate F&F Payslip: {generatingExit.employeeName}</h3>
              <button 
                onClick={() => setGeneratingExit(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--kalki-text)" }}
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div>
              <p style={{ marginBottom: "1rem", fontSize: "0.95em", color: "var(--kalki-text-light)" }}>
                Before finalizing the F&F payslip, you can enter any ad-hoc adjustments such as repair charges, damages, or leave encashments.
              </p>
              
              <div className="kalki-form-group">
                <label>Additional Earnings / Encashment (₹)</label>
                <input 
                  type="number"
                  className="kalki-input"
                  min="0"
                  value={adHocEarnings}
                  onChange={e => setAdHocEarnings(Number(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="kalki-form-group" style={{ marginTop: "1rem" }}>
                <label>Penalties / Recoveries / Damages (₹)</label>
                <input 
                  type="number"
                  className="kalki-input"
                  min="0"
                  value={adHocDeductions}
                  onChange={e => setAdHocDeductions(Number(e.target.value) || 0)}
                  placeholder="e.g. 1200"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: "24px" }}>
              <button 
                className="kalki-button kalki-button--secondary"
                onClick={() => setGeneratingExit(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="kalki-button kalki-button--primary"
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const endDate = generatingExit.approvedLastWorkingDay || generatingExit.requestedLastWorkingDay;
                    const d = new Date(endDate);
                    const startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                    const formattedEndDate = d.toISOString().split('T')[0];

                    const res = await generateFnFPayroll(
                      generatingExit.employeeId,
                      startDate,
                      formattedEndDate,
                      generatingExit.organizationId,
                      generatingExit.locationId,
                      adHocEarnings,
                      adHocDeductions
                    );

                    if (res.success) {
                      alert("F&F Payslip generated successfully! Check the Payslips History tab to disburse.");
                      setGeneratingExit(null);
                    } else {
                      alert("Failed to generate F&F Payslip: " + res.error);
                    }
                  } catch(e: any) {
                    alert("Error generating payslip.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
              >
                {submitting ? "Generating..." : "Generate & Finalize"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
