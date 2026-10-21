"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import { TaskTimelineModal } from "./TaskTimelineModal";

export interface ExecutionAuditLogTask {
  id: string;
  scheduleId?: string | null;
  status: string;
  dueAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  contextData?: any;
  roleName?: string | null;
}

interface RecentExecutionAuditLogProps {
  tasks: ExecutionAuditLogTask[];
  nowIso: string;
}

export function RecentExecutionAuditLog({ tasks, nowIso }: RecentExecutionAuditLogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const now = new Date(nowIso);

  if (tasks.length === 0) {
    return (
      <div
        style={{
          padding: "1.5rem",
          textAlign: "center",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          border: "1px dashed #cbd5e1",
          color: "#64748b",
          fontSize: "0.8125rem",
        }}
      >
        No task executions recorded yet.
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
          <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>Task / Vendor</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>Triggered At</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>Assigned Role</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>Status</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>Completed At</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "10px", textAlign: "center" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const ctx = (t.contextData as any) || {};
              const vendorName = ctx.vendorName || "Routine Vendor";
              const isCompleted = t.status === "completed";
              const isAuditPending = t.status === "audit_pending";
              const isMissed = t.status === "pending" && t.dueAt && new Date(t.dueAt) < now;

              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{vendorName}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>{ctx.title || t.id.slice(0, 8)}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>
                    {new Date(t.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500 }}>
                    {t.roleName || "Kitchen Staff"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {isCompleted ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#dcfce7", color: "#16a34a", fontWeight: 700, fontSize: "10px" }}>
                        <CheckCircle2 size={10} /> {ctx.escalated ? "Audited & Cleared" : "Completed"}
                      </span>
                    ) : isAuditPending ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#ffedd5", color: "#c2410c", fontWeight: 700, fontSize: "10px" }}>
                        <AlertCircle size={10} /> Audit Pending
                      </span>
                    ) : isMissed ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: "10px" }}>
                        <AlertCircle size={10} /> Missed
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: "10px" }}>
                        <PlayCircle size={10} /> {t.status === "in_progress" ? "In Progress" : "Pending"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", color: t.completedAt ? "#16a34a" : "#94a3b8" }}>
                    {t.completedAt ? new Date(t.completedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(t.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      Log &rarr;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedTaskId && (
        <TaskTimelineModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
