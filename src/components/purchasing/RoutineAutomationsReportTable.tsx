"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, ExternalLink, Zap } from "lucide-react";
import { TaskTimelineModal } from "./TaskTimelineModal";

export interface RoutineAutomationReportRow {
  id: string;
  status: string;
  priority?: string | null;
  dueAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  contextData?: any;
  completionData?: any;
  roleName?: string | null;
  poNumber?: string | null;
  publicToken?: string | null;
  poId?: string | null;
  poStatus?: string | null;
}

interface RoutineAutomationsReportTableProps {
  rows: RoutineAutomationReportRow[];
  tenantParams: string;
}

export function RoutineAutomationsReportTable({ rows, tenantParams }: RoutineAutomationsReportTableProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
        <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <tr>
            <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Cycle / Vendor</th>
            <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Scheduled Run Date</th>
            <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Assigned Role</th>
            <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Deadline / Due At</th>
            <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Completed / Audited At</th>
            <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Status</th>
            <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "center" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((rt) => {
              const ctx = (rt.contextData as any) || {};
              const comp = (rt.completionData as any) || {};
              const vendorName = ctx.vendorName || "Routine Vendor";
              const isAuditPending = rt.status === "audit_pending";
              const isCompleted = rt.status === "completed";
              const isMissed = rt.status === "pending" && rt.dueAt && new Date(rt.dueAt) < new Date();
              const isInProgress = rt.status === "in_progress";

              const poId = rt.poId || comp.poId;
              const poLink = poId ? `/public/po/${rt.publicToken || poId}` : null;

              let statusBadge = (
                <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#fef3c7", color: "#d97706", fontSize: "11px", fontWeight: 700, display: "inline-block" }}>
                  Pending
                </span>
              );

              if (isCompleted) {
                statusBadge = (
                  <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#dcfce7", color: "#16a34a", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={12} /> {ctx.escalated ? "Audited & Cleared" : "Completed"}
                  </span>
                );
              } else if (isAuditPending) {
                statusBadge = (
                  <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#ffedd5", color: "#c2410c", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={12} /> Audit Pending ({ctx.escalationReason || "Escalated"})
                  </span>
                );
              } else if (isMissed) {
                statusBadge = (
                  <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={12} /> Overdue / Missed
                  </span>
                );
              } else if (isInProgress) {
                statusBadge = (
                  <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#eff6ff", color: "#2563eb", fontSize: "11px", fontWeight: 700, display: "inline-block" }}>
                    In Progress
                  </span>
                );
              }

              // Assess action URL
              let assessUrl = ctx.actionUrl || `/purchasing/stock-assessment?vendorId=${ctx.vendorId}&taskId=${rt.id}`;
              if (!assessUrl.includes("organizationId=") && tenantParams) {
                assessUrl = `${assessUrl}${tenantParams}`;
              }

              return (
                <tr key={rt.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                      {vendorName}
                    </div>
                    {poLink ? (
                      <Link
                        href={poLink}
                        target="_blank"
                        style={{
                          fontSize: "11px",
                          color: "#2563eb",
                          fontFamily: "monospace",
                          marginTop: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                        title="Click to view generated Purchase Order items & details"
                      >
                        <span>{rt.poNumber || ctx.title || `Cycle #${rt.id.slice(0, 8)}`}</span>
                        <ExternalLink size={11} />
                      </Link>
                    ) : (
                      <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>
                        {ctx.title || `Cycle #${rt.id.slice(0, 8)}`}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {new Date(rt.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>
                    {rt.roleName || "Head Chef / Kitchen"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    {rt.dueAt
                      ? new Date(rt.dueAt).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: rt.completedAt ? "#16a34a" : "#94a3b8" }}>
                    {rt.completedAt
                      ? new Date(rt.completedAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {statusBadge}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      {(rt.status === "pending" || rt.status === "in_progress") && (
                        <Link
                          href={assessUrl}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: "#7c3a27",
                            color: "#ffffff",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          <Zap size={11} />
                          <span>Assess Stock</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(rt.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          backgroundColor: "#f1f5f9",
                          color: "#1e293b",
                          border: "1px solid #cbd5e1",
                          padding: "4px 9px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="View complete task audit log, timeline and execution details"
                      >
                        Audit Log &rarr;
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                <CheckCircle2 size={40} style={{ opacity: 0.25, margin: "0 auto 10px auto", display: "block" }} />
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>No routine automation records found</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>No routine purchasing assessment tasks recorded for the selected filter.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedTaskId && (
        <TaskTimelineModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
