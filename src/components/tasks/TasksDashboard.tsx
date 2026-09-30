"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";

export function TasksDashboard() {
  const { selected } = useSessionView();
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "audit" | "definitions">("pending");
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [auditTasks, setAuditTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selected) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    let cancelled = false;
    const searchParams = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });

    // Fetch Tasks
    fetch(`/api/tasks?${searchParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.tasks) setTasks(data.tasks);
        setIsLoading(false);
      })
      .catch(() => { if (!cancelled) setIsLoading(false); });

    // Fetch Audit Tasks
    fetch(`/api/tasks/audit?${searchParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.tasks) setAuditTasks(data.tasks);
      });

    // Fetch Definitions
    fetch(`/api/task-definitions?${searchParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.definitions) setDefinitions(data.definitions);
      });

    return () => { cancelled = true; };
  }, [selected]);

  const handleNewTask = async () => {
    if (!selected) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          title: "Check freezer 1",
          description: "Ad-hoc task created from dashboard (requires image)",
          priority: "high",
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          evidenceRequirementType: "image",
        })
      });
      if (res.ok) {
        const searchParams = new URLSearchParams({
          organizationId: selected.organizationId,
          locationId: selected.locationId,
        });
        const data = await fetch(`/api/tasks?${searchParams.toString()}`).then(r => r.json());
        if (data.tasks) setTasks(data.tasks);
      }
    } catch (err) { console.error(err); }
  };

  const handleNewDefinition = async () => {
    if (!selected) return;
    try {
      const res = await fetch("/api/task-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected.organizationId,
          module: "core",
          title: "Daily Kitchen Check",
          description: "Verify freezer temperatures and vegetable stock",
          triggerType: "time",
          triggerConfig: { cron: "0 9 * * *" }, // Daily at 9 AM
          priority: "high",
          evidenceRequirementType: "image"
        })
      });
      if (res.ok) {
        const searchParams = new URLSearchParams({ organizationId: selected.organizationId });
        const data = await fetch(`/api/task-definitions?${searchParams.toString()}`).then(r => r.json());
        if (data.definitions) setDefinitions(data.definitions);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) { console.error(err); }
  };

  const [uploadingTask, setUploadingTask] = useState<string | null>(null);

  const handleCompleteUpload = async (taskId: string, file: File) => {
    setUploadingTask(taskId);
    try {
      const formData = new FormData();
      formData.append("evidence", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
         alert("Upload failed. Please try again.");
         setUploadingTask(null);
         return;
      }
      const data = await uploadRes.json();
      const url = data.urls.evidence;
      // Complete the task with the URL from our server
      await handleCompleteTask(taskId, url);
    } catch (e) {
      alert("Error uploading file");
    }
    setUploadingTask(null);
  };

  const handleCompleteTask = async (taskId: string, proofUrl: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionProofUrl: proofUrl || undefined }),
      });
      if (res.ok) {
        const searchParams = new URLSearchParams({
          organizationId: selected.organizationId,
          locationId: selected.locationId,
        });
        const data = await fetch(`/api/tasks?${searchParams.toString()}`).then(r => r.json());
        if (data.tasks) setTasks(data.tasks);
        
        // Also refresh audit tasks in case it moved to audit
        const auditData = await fetch(`/api/tasks/audit?${searchParams.toString()}`).then(r => r.json());
        if (auditData.tasks) setAuditTasks(auditData.tasks);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to complete task");
      }
    } catch (err) { console.error(err); }
  };

  const handleAuditTask = async (taskId: string, action: "approve" | "reject") => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comments: action === "reject" ? "Rejected by auditor" : "Looks good" }),
      });
      if (res.ok) {
        const searchParams = new URLSearchParams({
          organizationId: selected.organizationId,
          locationId: selected.locationId,
        });
        const auditData = await fetch(`/api/tasks/audit?${searchParams.toString()}`).then(r => r.json());
        if (auditData.tasks) setAuditTasks(auditData.tasks);
        
        // Refresh pending in case it was rejected
        const data = await fetch(`/api/tasks?${searchParams.toString()}`).then(r => r.json());
        if (data.tasks) setTasks(data.tasks);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to audit task");
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Task Engine</p>
            <h2>My Tasks</h2>
            <p>{selected ? `${selected.organizationName} - ${selected.locationName}` : "No Location Selected"}</p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button className="kalki-button primary" onClick={handleNewTask} disabled={!selected}>
              + Test Ad-Hoc Task
            </button>
            <button className="kalki-button" onClick={handleNewDefinition} disabled={!selected}>
              + Test Definition (Blueprint)
            </button>
          </div>
        </div>
        <p className="muted">
          Active tasks requiring your attention or auditing.
        </p>
      </section>

      <div className="toolbar" role="tablist">
        <button 
          className="filter-button" 
          data-active={activeTab === "pending"} 
          onClick={() => setActiveTab("pending")}
        >
          Instances
        </button>
        <button 
          className="filter-button" 
          data-active={activeTab === "audit"} 
          onClick={() => setActiveTab("audit")}
        >
          To Audit
        </button>
        <button 
          className="filter-button" 
          data-active={activeTab === "definitions"} 
          onClick={() => setActiveTab("definitions")}
        >
          Blueprints
        </button>
      </div>

      {!selected ? (
        <StatusMessage tone="empty">Please select a location from the top navigation to view tasks.</StatusMessage>
      ) : isLoading ? (
        <StatusMessage tone="loading">Loading tasks...</StatusMessage>
      ) : (
        <>
          {activeTab === "pending" && (
            tasks.length === 0 ? (
              <StatusMessage tone="empty">No active tasks.</StatusMessage>
            ) : (
              <div className="panel" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Title</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Priority</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Status</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Due Date</th>
                      <th style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.filter(t => t.status === "pending" || t.status === "in_progress").length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                          No tasks require action right now.
                        </td>
                      </tr>
                    ) : tasks.filter(t => t.status === "pending" || t.status === "in_progress").map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.4rem 0.5rem", fontWeight: "500" }}>{t.title}</td>
                        <td style={{ padding: "0.4rem 0.5rem", textTransform: "capitalize" }}>{t.priority}</td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>
                          <span style={{ 
                            fontSize: "0.75em", 
                            fontWeight: "600", 
                            padding: "0.15rem 0.5rem", 
                            borderRadius: "999px", 
                            background: t.status === 'pending' ? '#fef9c3' : '#f1f5f9', 
                            color: t.status === 'pending' ? '#854d0e' : '#475569' 
                          }}>
                            {t.status.replace("_", " ").toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>{new Date(t.dueAt).toLocaleDateString()}</td>
                        <td style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>
                          {(t.status === "pending" || t.status === "in_progress") && (
                            t.actionUrl ? (
                              <a href={t.actionUrl} className="kalki-button kalki-button--sm primary" style={{ textDecoration: "none" }}>
                                {t.actionLabel || "Proceed"}
                              </a>
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
                                className="kalki-button kalki-button--sm"
                                onClick={() => handleCompleteTask(t.id, "")}
                              >
                                Complete
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === "audit" && (
            auditTasks.length === 0 ? (
              <StatusMessage tone="empty">No tasks pending audit.</StatusMessage>
            ) : (
              <div className="panel" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Title</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Priority</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Evidence</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Completed On</th>
                      <th style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditTasks.map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.4rem 0.5rem", fontWeight: "500" }}>{t.title}</td>
                        <td style={{ padding: "0.4rem 0.5rem", textTransform: "capitalize" }}>{t.priority}</td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>
                          {t.completionProofUrl ? (
                            <a href={t.completionProofUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>View Evidence</a>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>{new Date(t.completedAt).toLocaleString()}</td>
                        <td style={{ padding: "0.4rem 0.5rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button 
                            className="kalki-button kalki-button--sm"
                            style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}
                            onClick={() => handleAuditTask(t.id, "reject")}
                          >
                            Reject
                          </button>
                          <button 
                            className="kalki-button kalki-button--primary kalki-button--sm"
                            onClick={() => handleAuditTask(t.id, "approve")}
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === "definitions" && (
            definitions.length === 0 ? (
              <StatusMessage tone="empty">No task definitions exist yet.</StatusMessage>
            ) : (
              <div className="panel" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Title</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Description</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Trigger</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Priority</th>
                      <th style={{ padding: "0.4rem 0.5rem" }}>Evidence Req</th>
                      <th style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definitions.map(d => (
                      <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.4rem 0.5rem", fontWeight: "500" }}>{d.title}</td>
                        <td style={{ padding: "0.4rem 0.5rem" }} className="muted">{d.description}</td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>
                          <span style={{ textTransform: "capitalize", fontWeight: "500" }}>{d.triggerType}</span>
                          {d.triggerConfig?.cron && (
                            <span style={{ display: "block", fontSize: "0.85em", color: "var(--color-text-muted)" }}>
                              {d.triggerConfig.cron === "0 9 * * *" ? "Scheduled at 9 AM" : d.triggerConfig.cron}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.4rem 0.5rem", textTransform: "capitalize" }}>{d.priority}</td>
                        <td style={{ padding: "0.4rem 0.5rem", textTransform: "capitalize" }}>{d.evidenceRequirementType}</td>
                        <td style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>
                          <button className="kalki-button kalki-button--sm">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
