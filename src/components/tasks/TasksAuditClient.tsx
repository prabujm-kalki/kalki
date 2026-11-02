"use client";

import React, { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { ShieldCheck, CheckCircle2, XCircle, Clock, Eye, AlertCircle } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export function TasksAuditClient() {
  const { selected } = useSessionView();
  const [auditTasks, setAuditTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [actionComments, setActionComments] = useState("");
  const [extensionPercent, setExtensionPercent] = useState<number>(50);
  const [processing, setProcessing] = useState(false);

  // Close audit inspection drawer on Escape
  useEscapeKey(() => setSelectedTask(null), !!selectedTask);

  const loadAuditTasks = () => {
    if (!selected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const searchParams = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });

    fetch(`/api/tasks/audit?${searchParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setAuditTasks(data.tasks || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setAuditTasks([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAuditTasks();
  }, [selected]);

  const handleAuditDecision = async (action: "approve" | "reject") => {
    if (!selectedTask || !selected) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comments: actionComments || undefined,
          extensionPercentage: action === "reject" ? extensionPercent : undefined,
        }),
      });

      if (res.ok) {
        setSelectedTask(null);
        setActionComments("");
        loadAuditTasks();
      } else {
        const error = await res.json();
        alert(error.error || `Failed to ${action} task`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error submitting ${action}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!selected) {
    return <StatusMessage tone="empty">Please select an organization and location to review audit tasks.</StatusMessage>;
  }

  return (
    <div>
      <div className="kalki-page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck className="h-6 w-6" style={{ color: "#0284c7" }} />
            Supervisor Audit &amp; Approvals
          </h1>
          <p className="kalki-page-description">
            Review completed daily routines, check off submitted SOP items, and certify or reject with feedback.
          </p>
        </div>
        <div>
          <span className="pill" data-state="WARNING">
            {auditTasks.length} Pending Review
          </span>
        </div>
      </div>

      {loading ? (
        <StatusMessage tone="loading">Loading tasks awaiting audit...</StatusMessage>
      ) : auditTasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "#ffffff", borderRadius: "8px", border: "1px solid var(--kalki-border, #e2e8f0)" }}>
          <CheckCircle2 className="h-10 w-10" style={{ color: "#16a34a", margin: "0 auto 12px auto" }} />
          <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 600 }}>All Caught Up</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--kalki-text-secondary, #64748b)" }}>
            There are no routine checklists or tasks currently awaiting your review.
          </p>
        </div>
      ) : (
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Task / Checklist Title</th>
                <th>Priority</th>
                <th>Due / Submitted</th>
                <th>Checklist Score</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {auditTasks.map((t) => {
                const score = t.scoreSnapshot;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary, #64748b)" }}>
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{t.priority}</td>
                    <td style={{ fontSize: "12px", color: "#475569" }}>
                      {t.completedAt ? new Date(t.completedAt).toLocaleString() : t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td>
                      {score ? (
                        <span className="pill" data-state={score.scorePercent === 100 ? "VERIFIED" : "WARNING"}>
                          {score.completedItems}/{score.totalItems} Items ({score.scorePercent}%)
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Standard Task</span>
                      )}
                    </td>
                    <td>
                      <span className="pill" data-state="WARNING">
                        Audit Pending
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(t);
                          setActionComments("");
                        }}
                        className="kalki-button kalki-button--sm kalki-button--primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Review &amp; Sign-off
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review & Audit Modal */}
      {selectedTask && (
        <div className="kalki-modal-overlay" style={{ zIndex: 1050 }}>
          <div
            className="kalki-modal"
            style={{
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: 0,
            }}
          >
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1e293b" }}>
                  Supervisor Audit: {selectedTask.title}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Verify employee checklist answers, inspect evidence, and certify completion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
              >
                ✕
              </button>
            </div>

            {/* Checklist responses review body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {selectedTask.scoreSnapshot && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Completion Score</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                      {selectedTask.scoreSnapshot.scorePercent}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>SLA Status</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: selectedTask.scoreSnapshot.slaStatus === "ON_TIME" ? "#16a34a" : "#d97706" }}>
                      {selectedTask.scoreSnapshot.slaStatus}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Items Answered</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
                      {selectedTask.scoreSnapshot.completedItems} of {selectedTask.scoreSnapshot.totalItems}
                    </div>
                  </div>
                </div>
              )}

              {/* Submitted Answers */}
              <div>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                  Submitted Checklist Answers
                </h4>
                {Array.isArray(selectedTask.checklistResponses) && selectedTask.checklistResponses.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedTask.checklistResponses.map((item: any, idx: number) => (
                      <div
                        key={item.itemId || idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          background: item.checked || item.value ? "#ffffff" : "#fff1f2",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 500 }}>
                          {idx + 1}. {item.title}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>
                          {item.inputType === "checkbox" ? (
                            item.checked ? (
                              <span style={{ color: "#16a34a" }}>✓ Verified Done</span>
                            ) : (
                              <span style={{ color: "#e11d48" }}>✗ Incomplete</span>
                            )
                          ) : (
                            <span style={{ color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "4px" }}>
                              {item.value || "No response"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "#64748b", padding: "12px", background: "#f8fafc", borderRadius: "6px" }}>
                    No checklist items attached. Standard task completion.
                  </div>
                )}
              </div>

              {/* Proof URL if required */}
              {selectedTask.completionProofUrl && (
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Attached Completion Evidence:</div>
                  <a href={selectedTask.completionProofUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontSize: "13px", textDecoration: "underline" }}>
                    View Uploaded Evidence Document / Photo
                  </a>
                </div>
              )}

              {/* Supervisor Feedback / Rejection Extension Controls */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                <label className="kalki-label" style={{ fontSize: "12px" }}>
                  Supervisor Audit Notes / Remarks (Optional for Approval, Required for Rejection)
                </label>
                <textarea
                  rows={2}
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  placeholder="e.g. Approved with standard marks, or specify what needs to be redone..."
                  className="kalki-input"
                  style={{ fontSize: "13px" }}
                />

                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>If rejecting, grant re-do time:</span>
                  <select
                    value={extensionPercent}
                    onChange={(e) => setExtensionPercent(Number(e.target.value))}
                    className="kalki-select"
                    style={{ width: "auto", fontSize: "12px", padding: "4px 8px" }}
                  >
                    <option value={25}>+25% original time</option>
                    <option value={50}>+50% original time</option>
                    <option value={75}>+75% original time</option>
                    <option value={100}>+100% full time reset</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Decisions */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="kalki-button kalki-button--secondary"
              >
                Close
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAuditDecision("reject")}
                  className="kalki-button kalki-button--danger"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <XCircle className="h-4 w-4" /> Reject &amp; Return
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAuditDecision("approve")}
                  className="kalki-button kalki-button--primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve &amp; Certify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
