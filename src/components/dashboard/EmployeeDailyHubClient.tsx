"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EmployeeDashboardPulse } from "@/app/actions/employee-personal-pulse";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  User, 
  CheckSquare, 
  ArrowRight,
  Camera,
  Coffee,
  ChevronRight,
  ShieldCheck,
  Building2,
  Briefcase
} from "lucide-react";

interface EmployeeDailyHubClientProps {
  pulse: EmployeeDashboardPulse;
  organizationId: string;
  locationId: string;
  isExecutive?: boolean;
  onSwitchToExecutive?: () => void;
}

export function EmployeeDailyHubClient({
  pulse,
  organizationId,
  locationId,
  isExecutive,
  onSwitchToExecutive,
}: EmployeeDailyHubClientProps) {
  const { employee, attendanceToday, leaveSummary, assignedTasks } = pulse;
  const qs = `?organizationId=${organizationId}&locationId=${locationId}`;

  const punchStatusConfig = {
    PUNCHED_IN: {
      label: "Currently Checked In",
      color: "#166534",
      bg: "#dcfce7",
      border: "#bbf7d0",
      icon: CheckCircle2,
    },
    ON_BREAK: {
      label: "On Break",
      color: "#854d0e",
      bg: "#fef9c3",
      border: "#fef08a",
      icon: Coffee,
    },
    PUNCHED_OUT: {
      label: "Shift Concluded (Checked Out)",
      color: "#475569",
      bg: "#f1f5f9",
      border: "#e2e8f0",
      icon: Clock,
    },
    NOT_PUNCHED: {
      label: "Not Checked In Today",
      color: "#991b1b",
      bg: "#fee2e2",
      border: "#fecaca",
      icon: AlertCircle,
    },
  }[attendanceToday.status];

  const StatusIcon = punchStatusConfig.icon;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Welcome Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
        padding: "1.25rem 1.5rem",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Avatar */}
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.25rem",
            overflow: "hidden",
            flexShrink: 0,
            border: "2px solid rgba(255,255,255,0.2)"
          }}>
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              employee.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
                Hi, {employee.displayName}
              </h1>
              <span style={{
                background: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                fontSize: "0.72rem",
                padding: "2px 8px",
                borderRadius: "10px",
                fontWeight: 600
              }}>
                {employee.employeeCode}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "2px" }}>
              {employee.jobTitle || "Operations Staff"} • Personal Workspace
            </div>
          </div>
        </div>

        {/* Action Toggle (If executive is previewing this hub) */}
        {isExecutive && onSwitchToExecutive && (
          <button
            onClick={onSwitchToExecutive}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#e2e8f0",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <Building2 size={16} />
            Switch to Executive Cockpit
          </button>
        )}
      </div>

      {/* Grid: 2 Columns on Desktop, 1 on Mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* Card 1: Attendance & Shift Status */}
        <div className="card" style={{ padding: "1.25rem", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={18} style={{ color: "#3b82f6" }} />
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Today&apos;s Attendance</h2>
            </div>
            <Link
              href={`/attendance/selfie-punch${qs}`}
              style={{
                fontSize: "0.8rem",
                color: "#2563eb",
                fontWeight: 600,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem"
              }}
            >
              <Camera size={14} /> Punch Terminal →
            </Link>
          </div>

          {/* Current Punch Status Box */}
          <div style={{
            padding: "1rem",
            borderRadius: "10px",
            background: punchStatusConfig.bg,
            border: `1px solid ${punchStatusConfig.border}`,
            color: punchStatusConfig.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <StatusIcon size={24} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{punchStatusConfig.label}</div>
                <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>
                  {attendanceToday.firstPunchIn ? `Checked In: ${attendanceToday.firstPunchIn}` : "No punch recorded yet"}
                  {attendanceToday.lastPunchOut ? ` • Checked Out: ${attendanceToday.lastPunchOut}` : ""}
                </div>
              </div>
            </div>

            <Link
              href={`/attendance/selfie-punch${qs}`}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap"
              }}
            >
              Punch Now
            </Link>
          </div>

          {/* Today Punch Log Timeline */}
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 600, marginBottom: "0.5rem" }}>
              Today&apos;s Punch History ({attendanceToday.totalPunchesCount})
            </div>
            {attendanceToday.punches.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic" }}>
                No punches recorded today. Tap &quot;Punch Now&quot; to check in.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {attendanceToday.punches.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#334155"
                    }}
                  >
                    <strong>{p.punchType.replace("_", " ")}:</strong> {p.time}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Leave & Balance Snapshot */}
        <div className="card" style={{ padding: "1.25rem", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={18} style={{ color: "#10b981" }} />
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Leave Balances</h2>
            </div>
            <Link
              href={`/attendance/my-time${qs}`}
              style={{
                fontSize: "0.8rem",
                color: "#2563eb",
                fontWeight: 600,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem"
              }}
            >
              My Time →
            </Link>
          </div>

          {/* Compact Balance Pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.65rem" }}>
            {leaveSummary.map((b, idx) => {
              const isUncapped = b.allowZeroBalance || b.isPaid === false;
              const val = parseFloat(b.closingBalance || "0");
              return (
                <div
                  key={idx}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem"
                  }}
                >
                  <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.leaveTypeName}
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: isUncapped ? "#475569" : "#0f172a" }}>
                    {isUncapped ? "LOP" : `${val.toFixed(1)} d`}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
            <Link
              href={`/attendance/my-time${qs}`}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "0.5rem",
                borderRadius: "8px",
                background: "#f1f5f9",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: "0.82rem",
                textDecoration: "none"
              }}
            >
              Apply Leave
            </Link>
            <Link
              href={`/attendance/my-time${qs}`}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "0.5rem",
                borderRadius: "8px",
                background: "#f1f5f9",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: "0.82rem",
                textDecoration: "none"
              }}
            >
              Missing Punch
            </Link>
          </div>
        </div>

      </div>

      {/* Card 3: Today's Assigned Tasks & Shift Routines */}
      <div className="card" style={{ padding: "1.25rem", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckSquare size={18} style={{ color: "#8b5cf6" }} />
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              My Assigned Tasks & Shift Routines ({assignedTasks.length})
            </h2>
          </div>
          <Link
            href={`/tasks${qs}`}
            style={{
              fontSize: "0.8rem",
              color: "#2563eb",
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem"
            }}
          >
            All Tasks →
          </Link>
        </div>

        {assignedTasks.length === 0 ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#94a3b8" }}>
            <CheckCircle2 size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5, color: "#10b981" }} />
            <div style={{ fontWeight: 600, color: "#334155", fontSize: "0.95rem" }}>All caught up!</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
              You have no pending routine tasks or checklists assigned for today.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {assignedTasks.map((task) => {
              const isOverdue = task.status === "OVERDUE";
              return (
                <div
                  key={task.id}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    border: `1px solid ${isOverdue ? "#fecaca" : "#e2e8f0"}`,
                    background: isOverdue ? "#fff5f5" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: isOverdue ? "#ef4444" : task.priority === "HIGH" ? "#f97316" : "#3b82f6"
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0f172a" }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: isOverdue ? "#dc2626" : "#64748b", marginTop: "2px" }}>
                        {isOverdue ? `Overdue (Due at ${task.dueText || "today"})` : `Due: ${task.dueText || "Today"}`}
                        {task.priority === "HIGH" ? " • High Priority" : ""}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={task.actionUrl || `/tasks${qs}`}
                    style={{
                      background: isOverdue ? "#ef4444" : "#0f172a",
                      color: "#ffffff",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {task.actionLabel || "Start Task"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
