"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import Link from "next/link";
import { 
  HelpCircle, 
  CheckCircle2, 
  X, 
  Clock, 
  AlertTriangle, 
  CheckSquare, 
  ListFilter,
  Plus
} from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export function TasksDashboard() {
  const { selected } = useSessionView();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "routines" | "overdue">("all");
  const [uploadingTask, setUploadingTask] = useState<string | null>(null);

  // Active Checklist Modal Runner State
  const [activeChecklistTask, setActiveChecklistTask] = useState<any | null>(null);
  const [checklistValues, setChecklistValues] = useState<Record<string, any>>({});
  const [activeSopHelp, setActiveSopHelp] = useState<{ title: string; text: string } | null>(null);
  const [submittingChecklist, setSubmittingChecklist] = useState(false);

  // Close modals on Escape key press (LIFO stacked)
  useEscapeKey(() => setActiveSopHelp(null), !!activeSopHelp);
  useEscapeKey(() => setActiveChecklistTask(null), !!activeChecklistTask && !activeSopHelp);

  const fetchTasks = () => {
    if (!selected) {
      setIsLoading(false);
      return;
    }
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });

    fetch(`/api/tasks?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tasks) setTasks(data.tasks);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [selected]);

  // Handle extension request (+X mins)
  const handleRequestExtension = async (taskId: string, maxMins: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionMins: maxMins }),
      });
      if (res.ok) {
        alert(`Time successfully extended by ${maxMins} minutes.`);
        fetchTasks();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to extend time");
      }
    } catch (err) {
      console.error(err);
      alert("Error extending time");
    }
  };

  // Open Checklist modal
  const handleOpenChecklistModal = (task: any) => {
    setActiveChecklistTask(task);
    const initialValues: Record<string, any> = {};
    if (Array.isArray(task.checklistConfig)) {
      task.checklistConfig.forEach((item: any) => {
        if (item.inputType === "checkbox") {
          initialValues[item.id] = false;
        } else if (item.inputType === "radio") {
          initialValues[item.id] = "";
        } else {
          initialValues[item.id] = "";
        }
      });
    }
    setChecklistValues(initialValues);
  };

  // Submit Checklist
  const handleSubmitChecklist = async () => {
    if (!activeChecklistTask || !selected) return;
    setSubmittingChecklist(true);
    try {
      const items = Array.isArray(activeChecklistTask.checklistConfig) ? activeChecklistTask.checklistConfig : [];
      const responses = items.map((item: any) => ({
        itemId: item.id,
        title: item.title,
        inputType: item.inputType,
        checked: item.inputType === "checkbox" ? !!checklistValues[item.id] : undefined,
        value: checklistValues[item.id] || null,
      }));

      const res = await fetch(`/api/tasks/${activeChecklistTask.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistResponses: responses }),
      });

      if (res.ok) {
        setActiveChecklistTask(null);
        setChecklistValues({});
        fetchTasks();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to complete routine checklist");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting checklist");
    } finally {
      setSubmittingChecklist(false);
    }
  };

  // Simple task completion
  const handleCompleteTask = async (taskId: string, proofUrl: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionProofUrl: proofUrl || undefined }),
      });
      if (res.ok) {
        fetchTasks();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to complete task");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upload proof
  const handleCompleteUpload = async (taskId: string, file: File) => {
    setUploadingTask(taskId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/tasks/upload", {
        method: "POST",
        body: formData,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        await handleCompleteTask(taskId, data.url);
      } else {
        alert("Failed to upload evidence");
      }
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    } finally {
      setUploadingTask(null);
    }
  };

  const handleReturnTask = async (taskId: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Returned to process owner by auditor" }),
      });
      if (res.ok) {
        fetchTasks();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to return task");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Active Pending Tasks
  const activeTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");

  // Filter Tasks
  const displayedTasks = activeTasks.filter((t) => {
    if (filterMode === "routines") {
      return Array.isArray(t.checklistConfig) && t.checklistConfig.length > 0;
    }
    if (filterMode === "overdue") {
      return t.escalationLevel > 0 || (t.dueAt && new Date() > new Date(t.dueAt));
    }
    return true;
  });

  // Calculate Metrics
  const pendingCount = activeTasks.length;
  const overdueCount = activeTasks.filter((t) => t.escalationLevel > 0 || (t.dueAt && new Date() > new Date(t.dueAt))).length;
  const checklistRoutinesCount = activeTasks.filter((t) => Array.isArray(t.checklistConfig) && t.checklistConfig.length > 0).length;

  return (
    <div>
      {/* 1. TOP EXECUTIVE OPERATIONAL METRICS STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "10px", border: "1px solid var(--kalki-border, #e2e8f0)", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Active Shift Tasks
            </span>
            <CheckSquare className="h-4 w-4" style={{ color: "#d97706" }} />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "6px" }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
            Routines &amp; checks pending execution
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "10px", border: "1px solid var(--kalki-border, #e2e8f0)", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Checklist Routines
            </span>
            <CheckCircle2 className="h-4 w-4" style={{ color: "#2563eb" }} />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "6px" }}>
            {checklistRoutinesCount}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
            Multi-point SOP inspection forms
          </div>
        </div>

        <div style={{ background: overdueCount > 0 ? "#fff1f2" : "#ffffff", padding: "16px 20px", borderRadius: "10px", border: overdueCount > 0 ? "1px solid #fecdd3" : "1px solid var(--kalki-border, #e2e8f0)", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: overdueCount > 0 ? "#be123c" : "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              SLA Overdue / Breached
            </span>
            <AlertTriangle className="h-4 w-4" style={{ color: overdueCount > 0 ? "#e11d48" : "#94a3b8" }} />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: overdueCount > 0 ? "#e11d48" : "#1e293b", marginTop: "6px" }}>
            {overdueCount}
          </div>
          <div style={{ fontSize: "12px", color: overdueCount > 0 ? "#9f1239" : "#64748b", marginTop: "2px" }}>
            {overdueCount > 0 ? "Requires immediate supervisor action" : "All routines within SLA target"}
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL HEADER & SHIFT FILTER BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ margin: "0 0 2px 0", fontSize: "18px" }}>
            Daily Routines &amp; Shift Queue
          </h1>
          <p className="kalki-page-description" style={{ margin: 0 }}>
            {selected ? `${selected.organizationName} • ${selected.locationName}` : "Select a location"}
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className="kalki-button kalki-button--sm"
            style={{
              background: filterMode === "all" ? "#fef3c7" : "#ffffff",
              borderColor: filterMode === "all" ? "#d97706" : "#cbd5e1",
              color: filterMode === "all" ? "#b45309" : "#475569",
              fontWeight: filterMode === "all" ? 600 : 500,
            }}
          >
            All Routines ({activeTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("routines")}
            className="kalki-button kalki-button--sm"
            style={{
              background: filterMode === "routines" ? "#fef3c7" : "#ffffff",
              borderColor: filterMode === "routines" ? "#d97706" : "#cbd5e1",
              color: filterMode === "routines" ? "#b45309" : "#475569",
              fontWeight: filterMode === "routines" ? 600 : 500,
            }}
          >
            Checklists Only ({checklistRoutinesCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("overdue")}
            className="kalki-button kalki-button--sm"
            style={{
              background: filterMode === "overdue" ? "#fef3c7" : "#ffffff",
              borderColor: filterMode === "overdue" ? "#d97706" : "#cbd5e1",
              color: filterMode === "overdue" ? "#b45309" : "#475569",
              fontWeight: filterMode === "overdue" ? 600 : 500,
            }}
          >
            Overdue ({overdueCount})
          </button>
        </div>
      </div>

      {/* 3. MAIN ROUTINE TASKS TABLE */}
      {!selected ? (
        <StatusMessage tone="empty">Please select a location from the top navigation to view shift routines.</StatusMessage>
      ) : isLoading ? (
        <StatusMessage tone="loading">Loading shift tasks and checklists...</StatusMessage>
      ) : displayedTasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "#ffffff", borderRadius: "8px", border: "1px solid var(--kalki-border, #e2e8f0)" }}>
          <CheckCircle2 className="h-10 w-10" style={{ color: "#16a34a", margin: "0 auto 12px auto" }} />
          <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 600 }}>Shift Queue Clear</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--kalki-text-secondary, #64748b)" }}>
            {filterMode === "all" ? "No routine tasks currently require action for this location." : "No tasks match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Routine Job &amp; SOP</th>
                <th>Responsible Role</th>
                <th>Priority</th>
                <th>SLA / Deadline</th>
                <th>Verification Type</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedTasks.map((t) => {
                const isOverdue = t.escalationLevel > 0 || (t.dueAt && new Date() > new Date(t.dueAt));
                const hasChecklist = Array.isArray(t.checklistConfig) && t.checklistConfig.length > 0;

                return (
                  <React.Fragment key={t.id}>
                    <tr>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{t.title}</span>
                          {t.escalationLevel > 0 && (
                            <span style={{ fontSize: "11px", color: "#e11d48", background: "#ffe4e6", padding: "2px 6px", borderRadius: "999px", fontWeight: 600 }}>
                              Escalated (L{t.escalationLevel})
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary, #64748b)", marginTop: "2px" }}>
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>
                          {t.processOwnerName}
                        </span>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        <span className="pill" data-state={t.priority === "high" || t.priority === "very_high" ? "DANGER" : "NEUTRAL"}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        {t.dueAt ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 500, color: isOverdue ? "#e11d48" : "#475569" }}>
                              {new Date(t.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={{ fontSize: "11px", color: isOverdue ? "#e11d48" : "#64748b" }}>
                              {isOverdue ? "⚠️ Overdue" : "On Schedule"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>No Cutoff</span>
                        )}
                      </td>
                      <td>
                        {hasChecklist ? (
                          <span className="pill" data-state="INFO">
                            {t.checklistConfig.length} Checklist Points
                          </span>
                        ) : t.evidenceRequirementType === "image" ? (
                          <span className="pill" data-state="WARNING">Photo Proof Req</span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Standard Tick</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                          {t.escalationLevel > 0 && (
                            <button
                              className="kalki-button kalki-button--sm"
                              style={{ borderColor: "#fca5a5", color: "#dc2626" }}
                              onClick={() => handleReturnTask(t.id)}
                            >
                              Return
                            </button>
                          )}

                          {hasChecklist ? (
                            <button
                              className="kalki-button kalki-button--sm kalki-button--primary"
                              onClick={() => handleOpenChecklistModal(t)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              Open Checklist ({t.checklistConfig.length})
                            </button>
                          ) : t.actionUrl ? (
                            <Link
                              href={`${t.actionUrl}${t.actionUrl.includes("?") ? "&" : "?"}organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
                              className="kalki-button kalki-button--sm kalki-button--primary"
                              style={{ textDecoration: "none" }}
                            >
                              {t.actionLabel || "Proceed"}
                            </Link>
                          ) : t.evidenceRequirementType === "image" || t.evidenceRequirementType === "document" ? (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <button className="kalki-button kalki-button--sm" disabled={uploadingTask === t.id}>
                                {uploadingTask === t.id ? "Uploading..." : "Upload Evidence & Complete"}
                              </button>
                              <input
                                type="file"
                                accept={t.evidenceRequirementType === "image" ? "image/*" : undefined}
                                title="Upload evidence file"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleCompleteUpload(t.id, e.target.files[0]);
                                }}
                                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                                disabled={uploadingTask === t.id}
                              />
                            </div>
                          ) : (
                            <button
                              className="kalki-button kalki-button--sm kalki-button--primary"
                              onClick={() => handleCompleteTask(t.id, "")}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Pre-SLA Warning Strip with 1-click Extension */}
                    {t.contextData?.isWarning && (
                      <tr key={`${t.id}-warning`} style={{ background: "#fffbeb" }}>
                        <td colSpan={6} style={{ padding: "8px 14px", color: "#92400e", fontSize: "12px", borderBottom: "1px solid #fef3c7" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>
                              <strong>Warning:</strong> {t.warningThresholdMins || 10} minutes remaining before deadline!
                            </span>
                            {t.allowTimeExtension && (
                              <button
                                onClick={() => handleRequestExtension(t.id, t.maxExtensionMins || 15)}
                                className="kalki-button kalki-button--sm"
                                style={{ backgroundColor: "#f59e0b", color: "white", borderColor: "#f59e0b" }}
                              >
                                Request +{t.maxExtensionMins || 15} Mins Extension
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ROUTINE CHECKLIST MODAL (SOP RUNNER) */}
      {/* ------------------------------------------------------------- */}
      {activeChecklistTask && (
        <div className="kalki-modal-overlay" style={{ zIndex: 1050 }}>
          <div className="kalki-modal" style={{ maxWidth: "660px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#ffffff", borderRadius: "12px", padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1e293b" }}>
                  {activeChecklistTask.title}
                </h3>
                {activeChecklistTask.description && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                    {activeChecklistTask.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveChecklistTask(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X className="h-5 w-5" style={{ color: "#64748b" }} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                  Verification Checks ({Array.isArray(activeChecklistTask.checklistConfig) ? activeChecklistTask.checklistConfig.length : 0})
                </span>
                {activeChecklistTask.allowTimeExtension && (
                  <button
                    type="button"
                    onClick={() => handleRequestExtension(activeChecklistTask.id, activeChecklistTask.maxExtensionMins || 15)}
                    className="kalki-button kalki-button--sm"
                    style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#b45309" }}
                  >
                    <Clock className="h-3 w-3" /> +{activeChecklistTask.maxExtensionMins || 15}m Extension
                  </button>
                )}
              </div>

              {Array.isArray(activeChecklistTask.checklistConfig) && activeChecklistTask.checklistConfig.map((item: any, idx: number) => (
                <div key={item.id} style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#ffffff" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>{idx + 1}.</span>
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>{item.title}</span>
                    </div>
                    {item.helpDescription && (
                      <button
                        type="button"
                        onClick={() => setActiveSopHelp({ title: item.title, text: item.helpDescription })}
                        title="Click to view detailed SOP instructions"
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#2563eb",
                          borderRadius: "9999px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        <HelpCircle className="h-3 w-3" /> SOP Info
                      </button>
                    )}
                  </div>

                  {item.inputType === "checkbox" && (
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", cursor: "pointer", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={!!checklistValues[item.id]}
                        onChange={(e) => setChecklistValues({ ...checklistValues, [item.id]: e.target.checked })}
                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--kalki-primary)" }}
                      />
                      <span style={{ fontSize: "13px", color: checklistValues[item.id] ? "#166534" : "#475569", fontWeight: checklistValues[item.id] ? 600 : 400 }}>
                        {checklistValues[item.id] ? "Completed / Verified ✓" : "Mark as completed"}
                      </span>
                    </label>
                  )}

                  {item.inputType === "radio" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px" }}>
                      {(item.options || ["Pass", "Fail"]).map((opt: string) => (
                        <label key={opt} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#334155", cursor: "pointer", background: checklistValues[item.id] === opt ? "#f0fdf4" : "#f8fafc", padding: "6px 12px", borderRadius: "6px", border: checklistValues[item.id] === opt ? "1px solid #86efac" : "1px solid #e2e8f0" }}>
                          <input
                            type="radio"
                            name={`item-${item.id}`}
                            value={opt}
                            checked={checklistValues[item.id] === opt}
                            onChange={() => setChecklistValues({ ...checklistValues, [item.id]: opt })}
                            style={{ cursor: "pointer", accentColor: "var(--kalki-primary)" }}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {item.inputType === "text" && (
                    <input
                      type="text"
                      placeholder="Enter verification notes..."
                      value={checklistValues[item.id] || ""}
                      onChange={(e) => setChecklistValues({ ...checklistValues, [item.id]: e.target.value })}
                      className="kalki-input"
                      style={{ marginTop: "6px", fontSize: "13px", padding: "6px 10px" }}
                    />
                  )}

                  {item.inputType === "number" && (
                    <input
                      type="number"
                      placeholder="e.g. Temperature reading"
                      value={checklistValues[item.id] || ""}
                      onChange={(e) => setChecklistValues({ ...checklistValues, [item.id]: e.target.value })}
                      className="kalki-input"
                      style={{ marginTop: "6px", fontSize: "13px", padding: "6px 10px", maxWidth: "220px" }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
              <button type="button" onClick={() => setActiveChecklistTask(null)} className="kalki-button kalki-button--secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingChecklist}
                onClick={handleSubmitChecklist}
                className="kalki-button kalki-button--primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {submittingChecklist ? "Submitting..." : activeChecklistTask.requiresApproval ? "Submit for Supervisor Review" : "Complete Routine Job"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOP Info Modal */}
      {activeSopHelp && (
        <div className="kalki-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="kalki-modal" style={{ maxWidth: "440px", backgroundColor: "#ffffff", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <HelpCircle className="h-5 w-5" style={{ color: "#2563eb" }} />
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#1e293b" }}>SOP Instructions</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveSopHelp(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px" }}
              >
                <X className="h-4 w-4" style={{ color: "#64748b" }} />
              </button>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              {activeSopHelp.title}
            </div>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              {activeSopHelp.text}
            </div>
            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setActiveSopHelp(null)}
                className="kalki-button kalki-button--sm kalki-button--primary"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
