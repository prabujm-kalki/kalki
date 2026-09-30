"use client";

import React, { useEffect, useState } from "react";
import { getPayrollHistory, disbursePayrollRun, getPayrollRunDetails, deletePayrollRun } from "@/app/payroll/processing/actions";
import { Calendar, ReceiptText, CheckCircle2, Clock, Upload, X, Eye, Download, Trash2 } from "lucide-react";
import { useSessionView } from "@/components/AppShell";

export function PayslipsHistoryTab() {
  const { selected } = useSessionView();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [disburseRunId, setDisburseRunId] = useState<string | null>(null);
  const [viewProofRun, setViewProofRun] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentRows, setPaymentRows] = useState<{ mode: string; reference: string; attachments: string[] }[]>([{ mode: "BANK_TRANSFER", reference: "", attachments: [] }]);

  const [viewDetailsRunId, setViewDetailsRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const fetchRunDetails = async (runId: string) => {
    setViewDetailsRunId(runId);
    setLoadingDetails(true);
    setRunDetails(null);
    const res = await getPayrollRunDetails(runId);
    if (res.success) {
      setRunDetails(res.data);
    } else {
      alert("Failed to load details: " + res.error);
    }
    setLoadingDetails(false);
  };

  const fetchHistory = () => {
    if (selected) {
      setLoading(true);
      getPayrollHistory(selected.organizationId, selected.locationId)
        .then(res => {
          if (res.success) {
            setHistory(res.data || []);
          }
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selected]);

  const handleDisburse = async () => {
    if (!disburseRunId) return;
    setSubmitting(true);
    const res = await disbursePayrollRun(disburseRunId, paymentRows);
    if (res.success) {
      setDisburseRunId(null);
      setPaymentRows([{ mode: "BANK_TRANSFER", reference: "", attachments: [] }]);
      fetchHistory();
    } else {
      alert("Failed to disburse: " + res.error);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem 0" }}>
      <div style={{ background: "var(--kalki-card-bg)", border: "1px solid var(--kalki-border)", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--kalki-border)", background: "var(--kalki-bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ReceiptText size={20} color="var(--kalki-primary)" />
            Payroll History
          </h4>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>Loading history...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>
            <Calendar size={48} style={{ opacity: 0.2, marginBottom: "1rem", display: "block", marginLeft: "auto", marginRight: "auto" }} />
            <p>No processed payrolls found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="kalki-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--kalki-bg)", textAlign: "left", borderBottom: "2px solid var(--kalki-border)" }}>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>Period</th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>Processed Date</th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>Total Gross</th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>Total Net</th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--kalki-border)" }}>
                    <td style={{ padding: "1rem", fontWeight: 500 }}>
                      {new Date(run.periodStart).toLocaleDateString()} - {new Date(run.periodEnd).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--kalki-text-secondary)" }}>
                      {new Date(run.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "1rem" }}>₹{Number(run.totalGrossAmount).toFixed(2)}</td>
                    <td style={{ padding: "1rem", fontWeight: 600 }}>₹{Number(run.totalNetAmount).toFixed(2)}</td>
                    <td style={{ padding: "1rem" }}>
                      {run.status === "PENDING_DISBURSEMENT" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "4px 8px", background: "rgba(245, 158, 11, 0.1)", color: "#d97706", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                          <Clock size={14} /> Pending Payment
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "4px 8px", background: "rgba(34, 197, 94, 0.1)", color: "#16a34a", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Disbursed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {run.status === "PENDING_DISBURSEMENT" && (
                        <>
                          <button 
                            className="kalki-button kalki-button--primary"
                            onClick={(e) => { e.stopPropagation(); setDisburseRunId(run.id); }}
                            style={{ padding: "4px 12px", fontSize: "0.8rem", marginRight: "0.5rem" }}
                          >
                            Settle Payment
                          </button>
                          <button 
                            className="kalki-button kalki-button--secondary"
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              if (confirm("Are you sure you want to delete this payroll run? This will delete all associated draft payslips. You can generate them again.")) {
                                const res = await deletePayrollRun(run.id);
                                if (res.success) {
                                  alert("Payroll run deleted successfully");
                                  fetchHistory();
                                } else {
                                  alert("Failed to delete: " + res.error);
                                }
                              }
                            }}
                            style={{ padding: "4px 12px", fontSize: "0.8rem", marginRight: "0.5rem", color: "var(--kalki-danger)", borderColor: "var(--kalki-danger)" }}
                          >
                            <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
                          </button>
                        </>
                      )}
                      {run.status === "DISBURSED" && run.paymentAttachments && (
                        <button 
                          className="kalki-button kalki-button--secondary"
                          onClick={(e) => { e.stopPropagation(); setViewProofRun(run); }}
                          style={{ padding: "4px 12px", fontSize: "0.8rem", marginRight: "0.5rem" }}
                        >
                          View Proofs
                        </button>
                      )}
                      <button 
                        className="kalki-button kalki-button--secondary"
                        onClick={() => fetchRunDetails(run.id)}
                        style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                      >
                        <Eye size={14} style={{ marginRight: 4 }} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {disburseRunId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "800px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Settle Payroll Payment</h3>
              <button onClick={() => setDisburseRunId(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {paymentRows.map((row, i) => (
                <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "1rem", border: "1px solid var(--kalki-border)", borderRadius: "8px", background: "var(--kalki-bg)" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>Payment Method</label>
                    <select className="kalki-input" value={row.mode} onChange={e => { const newRows = [...paymentRows]; newRows[i].mode = e.target.value; setPaymentRows(newRows); }}>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>Ref / Transaction No.</label>
                    <input type="text" className="kalki-input" placeholder="e.g. UTR123456" value={row.reference} onChange={e => { const newRows = [...paymentRows]; newRows[i].reference = e.target.value; setPaymentRows(newRows); }} />
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>Proof of Payment</label>
                    <div style={{ border: "1px dashed var(--kalki-border)", padding: "0.5rem", borderRadius: "4px", textAlign: "center", position: "relative", cursor: "pointer", background: "white" }}>
                      <input type="file" multiple style={{ position: "absolute", opacity: 0, top: 0, left: 0, right: 0, bottom: 0, cursor: "pointer" }} onChange={e => { if (e.target.files) { const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f)); const newRows = [...paymentRows]; newRows[i].attachments.push(...urls); setPaymentRows(newRows); } }} />
                      <span style={{ fontSize: "0.8rem", color: "var(--kalki-primary)" }}>{row.attachments.length > 0 ? `${row.attachments.length} attached` : "Browse..."}</span>
                    </div>
                  </div>
                  {paymentRows.length > 1 && (
                    <button onClick={() => setPaymentRows(paymentRows.filter((_, idx) => idx !== i))} style={{ marginTop: "1.8rem", background: "none", border: "none", color: "var(--kalki-danger)", cursor: "pointer", padding: "0.5rem" }}><X size={16} /></button>
                  )}
                </div>
              ))}

              {paymentRows.length < 8 && (
                <button onClick={() => setPaymentRows([...paymentRows, { mode: "BANK_TRANSFER", reference: "", attachments: [] }])} style={{ background: "none", border: "1px dashed var(--kalki-primary)", color: "var(--kalki-primary)", padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                  + Add Another Payment Row
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
              <button className="kalki-button kalki-button--secondary" onClick={() => setDisburseRunId(null)}>Cancel</button>
              <button className="kalki-button kalki-button--primary" onClick={handleDisburse} disabled={submitting} style={{ opacity: submitting ? 0.5 : 1 }}>
                {submitting ? "Saving..." : "Confirm & Close Loop"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewProofRun && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "800px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Payment Proofs</h3>
              <button onClick={() => setViewProofRun(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {(viewProofRun.paymentAttachments || []).map((row: any, i: number) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem", border: "1px solid var(--kalki-border)", borderRadius: "8px", background: "var(--kalki-bg)" }}>
                  <div style={{ display: "flex", gap: "2rem" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--kalki-text-secondary)", textTransform: "uppercase" }}>Method</span>
                      <div style={{ fontWeight: 600 }}>{row.mode}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--kalki-text-secondary)", textTransform: "uppercase" }}>Reference No.</span>
                      <div style={{ fontWeight: 600 }}>{row.reference || "N/A"}</div>
                    </div>
                  </div>
                  {row.attachments && row.attachments.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--kalki-text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>Attachments</span>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {row.attachments.map((url: string, aIdx: number) => (
                          <a key={aIdx} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "white", border: "1px solid var(--kalki-border)", borderRadius: "4px", color: "var(--kalki-primary)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>
                            <ReceiptText size={16} /> View Document {aIdx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {(!viewProofRun.paymentAttachments || viewProofRun.paymentAttachments.length === 0) && (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>
                  No payment proofs recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {viewDetailsRunId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "900px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Payroll Run Details</h3>
              <button onClick={() => { setViewDetailsRunId(null); setSelectedPayslip(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>Loading details...</div>
            ) : runDetails ? (
              <div>
                <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--kalki-bg)", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--kalki-text-secondary)", textTransform: "uppercase" }}>Period</div>
                    <div style={{ fontWeight: 600 }}>{new Date(runDetails.run.periodStart).toLocaleDateString()} - {new Date(runDetails.run.periodEnd).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--kalki-text-secondary)", textTransform: "uppercase" }}>Total Employees</div>
                    <div style={{ fontWeight: 600 }}>{runDetails.slips.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--kalki-text-secondary)", textTransform: "uppercase" }}>Total Gross</div>
                    <div style={{ fontWeight: 600 }}>₹{Number(runDetails.run.totalGrossAmount).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--kalki-text-secondary)", textTransform: "uppercase" }}>Total Net</div>
                    <div style={{ fontWeight: 600, color: "var(--kalki-success)" }}>₹{Number(runDetails.run.totalNetAmount).toFixed(2)}</div>
                  </div>
                </div>

                {!selectedPayslip ? (
                  <div>
                    <h4 style={{ marginBottom: "1rem" }}>Employee Payslips</h4>
                    <table className="kalki-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--kalki-bg)", textAlign: "left", borderBottom: "2px solid var(--kalki-border)" }}>
                          <th style={{ padding: "1rem", fontWeight: 600 }}>Emp Code</th>
                          <th style={{ padding: "1rem", fontWeight: 600 }}>Name</th>
                          <th style={{ padding: "1rem", fontWeight: 600 }}>Gross Pay</th>
                          <th style={{ padding: "1rem", fontWeight: 600 }}>Deductions</th>
                          <th style={{ padding: "1rem", fontWeight: 600 }}>Net Pay</th>
                          <th style={{ padding: "1rem", fontWeight: 600 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runDetails.slips.map((slip: any, i: number) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--kalki-border)" }}>
                            <td style={{ padding: "1rem", fontWeight: 500 }}>{slip.employeeCode}</td>
                            <td style={{ padding: "1rem" }}>{slip.employeeName}</td>
                            <td style={{ padding: "1rem" }}>₹{Number(slip.grossAmount).toFixed(2)}</td>
                            <td style={{ padding: "1rem", color: "var(--kalki-danger)" }}>₹{Number(slip.deductionsAmount).toFixed(2)}</td>
                            <td style={{ padding: "1rem", fontWeight: 600, color: "var(--kalki-success)" }}>₹{Number(slip.netAmount).toFixed(2)}</td>
                            <td style={{ padding: "1rem" }}>
                              <button 
                                className="kalki-button kalki-button--secondary"
                                onClick={() => setSelectedPayslip(slip)}
                                style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                              >
                                View Breakup
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }} className="no-print">
                      <button 
                        onClick={() => setSelectedPayslip(null)} 
                        style={{ background: "none", border: "none", color: "var(--kalki-primary)", cursor: "pointer", fontWeight: 500 }}
                      >
                        ← Back to Employee List
                      </button>
                      <button 
                        className="kalki-button kalki-button--primary"
                        onClick={() => window.print()}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                      >
                        <Download size={16} /> Download / Print Payslip
                      </button>
                    </div>

                    <style>{`
                      @media print {
                        body * {
                          visibility: hidden;
                        }
                        #printable-payslip, #printable-payslip * {
                          visibility: visible;
                        }
                        #printable-payslip {
                          position: absolute;
                          left: 0;
                          top: 0;
                          width: 100%;
                          border: none !important;
                          padding: 0 !important;
                          box-shadow: none !important;
                        }
                        .no-print {
                          display: none !important;
                        }
                      }
                    `}</style>

                    {/* Payslip View */}
                    <div id="printable-payslip" style={{ padding: "3rem", border: "1px solid var(--kalki-border)", borderRadius: "8px", background: "white", maxWidth: "800px", margin: "0 auto", color: "#333", fontFamily: "sans-serif" }}>
                      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <h1 style={{ margin: 0, color: "#111", fontSize: "1.8rem", textTransform: "uppercase", letterSpacing: "1px" }}>Kalki BOS</h1>
                        <h2 style={{ margin: "0.5rem 0", color: "#555", fontSize: "1.2rem", fontWeight: 500 }}>PAYSLIP</h2>
                        <p style={{ margin: 0, color: "#777", fontSize: "0.9rem" }}>
                          For the period <strong>{new Date(runDetails.run.periodStart).toLocaleDateString()}</strong> to <strong>{new Date(runDetails.run.periodEnd).toLocaleDateString()}</strong>
                        </p>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem 1.5rem", background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: "6px", marginBottom: "2rem" }}>
                        <div>
                          <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}><span style={{ color: "#666", display: "inline-block", width: "120px" }}>Employee Name:</span> <strong style={{ color: "#222" }}>{selectedPayslip.employeeName}</strong></div>
                          <div style={{ fontSize: "0.9rem" }}><span style={{ color: "#666", display: "inline-block", width: "120px" }}>Employee Code:</span> <strong style={{ color: "#222" }}>{selectedPayslip.employeeCode}</strong></div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}><span style={{ color: "#666" }}>Processed Date:</span> <strong style={{ color: "#222", marginLeft: "0.5rem" }}>{new Date(runDetails.run.createdAt).toLocaleDateString()}</strong></div>
                          <div style={{ fontSize: "0.9rem" }}><span style={{ color: "#666" }}>Status:</span> <strong style={{ color: "#16a34a", marginLeft: "0.5rem" }}>PROCESSED</strong></div>
                        </div>
                      </div>

                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", border: "1px solid #dee2e6", width: "50%", color: "#444" }}>EARNINGS</th>
                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", border: "1px solid #dee2e6", width: "50%", color: "#444" }}>DEDUCTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: "0", border: "1px solid #dee2e6", verticalAlign: "top" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                  {(selectedPayslip.components || []).filter((c: any) => c.type === "EARNING").map((c: any, i: number) => (
                                    <tr key={i}>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", color: "#333", fontSize: "0.9rem" }}>{c.componentName}</td>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", textAlign: "right", color: "#333", fontSize: "0.9rem" }}>₹{Number(c.amount).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  {(!selectedPayslip.components || selectedPayslip.components.length === 0) && (
                                    <tr>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", color: "#333", fontSize: "0.9rem" }}>Basic Pay / Gross</td>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", textAlign: "right", color: "#333", fontSize: "0.9rem" }}>₹{Number(selectedPayslip.grossAmount).toFixed(2)}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </td>
                            <td style={{ padding: "0", border: "1px solid #dee2e6", verticalAlign: "top" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                  {(selectedPayslip.components || []).filter((c: any) => c.type === "DEDUCTION").map((c: any, i: number) => (
                                    <tr key={i}>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", color: "#333", fontSize: "0.9rem" }}>{c.componentName}</td>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", textAlign: "right", color: "#333", fontSize: "0.9rem" }}>₹{Number(c.amount).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  {(!selectedPayslip.components || selectedPayslip.components.filter((c: any) => c.type === "DEDUCTION").length === 0) && (
                                    <tr>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", color: "#aaa", fontSize: "0.9rem", fontStyle: "italic" }}>No Deductions</td>
                                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5", textAlign: "right", color: "#aaa", fontSize: "0.9rem" }}>-</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr style={{ background: "#f8f9fa", fontWeight: 600 }}>
                            <td style={{ padding: "0", border: "1px solid #dee2e6" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: "0.75rem 1rem", color: "#222" }}>Total Earnings</td>
                                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#222" }}>₹{Number(selectedPayslip.grossAmount).toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                            <td style={{ padding: "0", border: "1px solid #dee2e6" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: "0.75rem 1rem", color: "#222" }}>Total Deductions</td>
                                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#222" }}>₹{Number(selectedPayslip.deductionsAmount).toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#166534" }}>Net Pay</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#16a34a" }}>₹{Number(selectedPayslip.netAmount).toFixed(2)}</div>
                      </div>

                      <div style={{ marginTop: "3rem", display: "flex", justifyContent: "space-between", color: "#777", fontSize: "0.85rem" }}>
                        <div style={{ borderTop: "1px solid #ccc", paddingTop: "0.5rem", width: "200px", textAlign: "center" }}>Employer Signature</div>
                        <div style={{ borderTop: "1px solid #ccc", paddingTop: "0.5rem", width: "200px", textAlign: "center" }}>Employee Signature</div>
                      </div>
                      
                      <div style={{ marginTop: "2rem", textAlign: "center", color: "#999", fontSize: "0.75rem" }}>
                        This is a computer generated payslip and does not require a physical signature.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>Failed to load details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
