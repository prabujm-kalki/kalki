"use client";

import React, { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { History, Eye, CheckCircle2, Clock, Filter, AlertTriangle } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export function TasksHistoryClient() {
  const { selected } = useSessionView();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEscapeKey(() => setSelectedTask(null), !!selectedTask);

  const loadHistory = () => {
    if (!selected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const searchParams = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    if (statusFilter !== "all") {
      searchParams.set("status", statusFilter);
    }

    fetch(`/api/tasks/history?${searchParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setTasks([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadHistory();
  }, [selected, statusFilter]);

  if (!selected) {
    return <StatusMessage tone="empty">Please select an organization and location to view history.</StatusMessage>;
  }

  return (
    <div>
      <div className="kalki-page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <History className="h-6 w-6" style={{ color: "#d97706" }} />
            Task History &amp; Compliance Logs
          </h1>
          <p className="kalki-page-description">
            Complete audit trail of executed daily routines, verification scores, and SLA compliance.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter className="h-4 w-4" style={{ color: "#64748b" }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="kalki-select"
            style={{ width: "auto", fontSize: "13px", padding: "6px 12px" }}
          >
            <option value="all">All Historical Records</option>
            <option value="completed">Completed Only</option>
            <option value="audit_pending">Pending Audit Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <StatusMessage tone="loading">Loading task audit history...</StatusMessage>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "#ffffff", borderRadius: "8px", border: "1px solid var(--kalki-border, #e2e8f0)" }}>
          <History className="h-10 w-10" style={{ color: "#94a3b8", margin: "0 auto 12px auto" }} />
          <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 600 }}>No History Records</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--kalki-text-secondary, #64748b)" }}>
            Completed routine checklists and tasks will appear here as they are finished by staff.
          </p>
        </div>
      ) : (
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Role / Staff</th>
                <th>Completion Date</th>
                <th>Score &amp; SLA</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const score = t.scoreSnapshot;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{t.description}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>{t.assignedRoleName}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Staff: {t.completedByName}</div>
                    </td>
                    <td style={{ fontSize: "12px", color: "#475569" }}>
                      {t.completedAt ? new Date(t.completedAt).toLocaleString() : new Date(t.updatedAt).toLocaleString()}
                    </td>
                    <td>
                      {score ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span className="pill" data-state={score.scorePercent === 100 ? "VERIFIED" : "WARNING"}>
                            {score.scorePercent}% ({score.completedItems}/{score.totalItems})
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: score.slaStatus === "ON_TIME" ? "#16a34a" : "#d97706" }}>
                            SLA: {score.slaStatus}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Standard Task</span>
                      )}
                    </td>
                    <td>
                      <span className="pill" data-state={t.status === "completed" ? "VERIFIED" : "WARNING"}>
                        {t.status === "completed" ? "Completed" : "Audit Pending"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="kalki-button kalki-button--sm kalki-button--secondary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Eye className="h-3.5 w-3.5" /> View Log
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Historical Inspection Modal */}
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
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1e293b" }}>
                  Historical Record: {selectedTask.title}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Completed on {selectedTask.completedAt ? new Date(selectedTask.completedAt).toLocaleString() : "N/A"}
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

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {selectedTask.scoreSnapshot && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Overall Score</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                      {selectedTask.scoreSnapshot.scorePercent}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>SLA Performance</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: selectedTask.scoreSnapshot.slaStatus === "ON_TIME" ? "#16a34a" : "#d97706" }}>
                      {selectedTask.scoreSnapshot.slaStatus}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Escalations / Extensions</div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>
                      {selectedTask.scoreSnapshot.extensionRequestedMins || 0}m added
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                  Recorded Checklist Verification Responses
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
                          background: "#ffffff",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 500 }}>
                          {idx + 1}. {item.title}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>
                          {item.inputType === "checkbox" ? (
                            item.checked ? (
                              <span style={{ color: "#16a34a" }}>✓ Completed</span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>— Skipped</span>
                            )
                          ) : (
                            <span style={{ color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "4px" }}>
                              {item.value || "N/A"}
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
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", textAlign: "right", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="kalki-button kalki-button--primary kalki-button--sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
