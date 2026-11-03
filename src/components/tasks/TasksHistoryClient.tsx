"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { History, Eye, CheckCircle2, Clock, Filter, AlertTriangle, Sparkles, Paperclip, Check, ShieldCheck } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export function TasksHistoryClient() {
  const { selected } = useSessionView();
  const searchParamsHook = useSearchParams();
  const initialStatus = searchParamsHook.get("status") || "all";
  const initialPriority = searchParamsHook.get("priority") || "all";

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [moduleFilter, setModuleFilter] = useState("all");

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
    if (priorityFilter !== "all") {
      searchParams.set("priority", priorityFilter);
    }
    if (moduleFilter !== "all") {
      searchParams.set("module", moduleFilter);
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
  }, [selected, statusFilter, priorityFilter, moduleFilter]);

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
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="kalki-select"
            style={{ width: "auto", fontSize: "13px", padding: "6px 12px" }}
          >
            <option value="all">All Modules</option>
            <option value="purchase">Purchasing</option>
            <option value="catering">Catering</option>
            <option value="inventory">Inventory</option>
            <option value="system">Daily Routines &amp; System</option>
          </select>
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
                const module = t.module || "system";
                const badgeLabel = t.categoryBadge || (module === "purchase" ? "PURCHASING" : module === "catering" ? "CATERING" : module === "inventory" ? "INVENTORY" : "ROUTINE");

                // Badge styling
                let badgeBg = "#f1f5f9";
                let badgeColor = "#475569";
                if (module === "purchase") {
                  badgeBg = "#ecfdf5";
                  badgeColor = "#059669";
                } else if (module === "catering") {
                  badgeBg = "#faf5ff";
                  badgeColor = "#7e22ce";
                } else if (module === "inventory") {
                  badgeBg = "#fffbeb";
                  badgeColor = "#b45309";
                } else if (module === "sales" || module === "finance") {
                  badgeBg = "#eff6ff";
                  badgeColor = "#1d4ed8";
                }

                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            letterSpacing: "0.05em",
                            border: `1px solid ${badgeColor}33`,
                          }}
                        >
                          {badgeLabel}
                        </span>
                        <span>{t.title}</span>
                      </div>
                      {t.description && (
                        <div style={{ fontSize: "12px", color: "#64748b", paddingLeft: "2px" }}>{t.description}</div>
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
              {/* Visual 4-Stage Execution Pipeline */}
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                  <Sparkles className="h-4 w-4" style={{ color: "#7c3aed" }} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                    Execution Lifecycle Pipeline
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#15803d", backgroundColor: "#dcfce7", padding: "1px 8px", borderRadius: "10px", marginLeft: "auto" }}>
                    ✓ Fulfilled Run
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
                  {/* Stage 1: Trigger & Dispatch */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: "#dbeafe",
                        color: "#1d4ed8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}>
                        1
                      </div>
                      <div style={{ width: "2px", height: "36px", backgroundColor: "#93c5fd", marginTop: "3px" }}></div>
                    </div>
                    <div style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>Automated Trigger &amp; Dispatch</span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Scheduled"}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Dispatched to role: <strong>{selectedTask.assignedRoleName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Stage 2: Employee Operational Task */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: "#e0e7ff",
                        color: "#4338ca",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}>
                        2
                      </div>
                      <div style={{ width: "2px", height: "36px", backgroundColor: "#a5b4fc", marginTop: "3px" }}></div>
                    </div>
                    <div style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>Employee Execution</span>
                        <span style={{ fontSize: "11px", color: "#4338ca", fontWeight: 600, backgroundColor: "#eef2ff", padding: "1px 6px", borderRadius: "4px" }}>
                          Executed
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Actioned by: <strong>{selectedTask.completedByName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Stage 3: SLA Monitoring & Escalation */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: selectedTask.scoreSnapshot?.slaStatus === "BREACHED" ? "#fee2e2" : "#fef3c7",
                        color: selectedTask.scoreSnapshot?.slaStatus === "BREACHED" ? "#b91c1c" : "#b45309",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}>
                        3
                      </div>
                      <div style={{ width: "2px", height: "36px", backgroundColor: "#fde68a", marginTop: "3px" }}></div>
                    </div>
                    <div style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>SLA Monitoring &amp; Compliance</span>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: selectedTask.scoreSnapshot?.slaStatus === "BREACHED" ? "#dc2626" : selectedTask.scoreSnapshot?.slaStatus === "EXTENDED" ? "#d97706" : "#16a34a",
                          backgroundColor: selectedTask.scoreSnapshot?.slaStatus === "BREACHED" ? "#fee2e2" : selectedTask.scoreSnapshot?.slaStatus === "EXTENDED" ? "#fef3c7" : "#dcfce7",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}>
                          {selectedTask.scoreSnapshot?.slaStatus || "ON_TIME"}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {selectedTask.scoreSnapshot?.extensionRequestedMins
                          ? `${selectedTask.scoreSnapshot.extensionRequestedMins} mins extension utilized`
                          : "Completed within allocated target SLA window"}
                      </div>
                    </div>
                  </div>

                  {/* Stage 4: Verification & Audit */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: "#dcfce7",
                        color: "#15803d",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}>
                        4
                      </div>
                    </div>
                    <div style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "8px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>
                          {selectedTask.requiresApproval ? "Supervisor Audit & Sign-off" : "Instant Verification & Completion"}
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", backgroundColor: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>
                          Score: {selectedTask.scoreSnapshot?.scorePercent ?? 100}%
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Finished on {selectedTask.completedAt ? new Date(selectedTask.completedAt).toLocaleString() : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTask.completionProofUrl && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Proof Attachment</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Document or photo uploaded by employee during completion</div>
                    </div>
                  </div>
                  <a
                    href={selectedTask.completionProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#2563eb",
                      textDecoration: "underline",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    View / Download Proof ↗
                  </a>
                </div>
              )}

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
                          ) : Array.isArray(item.value) ? (
                            <span style={{ color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "4px" }}>
                              ✓ {item.value.join(", ") || "None selected"}
                            </span>
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
