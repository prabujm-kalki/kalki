"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExecutiveCockpitPulse, TaskPriorityBreakdown } from "@/domains/dashboard/types";
import { buildFilteredUrl } from "@/domains/dashboard/linkBuilder";
import { Calendar, ChevronDown, Check } from "lucide-react";

interface ExecutiveCockpitClientProps {
  pulse: ExecutiveCockpitPulse;
}

export function ExecutiveCockpitClient({ pulse }: ExecutiveCockpitClientProps) {
  const router = useRouter();
  const { scope, tasks, attendance, purchasing, events, branchComparison } = pulse;

  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(scope.fromDate || "");
  const [customTo, setCustomTo] = useState(scope.toDate || "");

  const currentScope = {
    organizationId: scope.organizationId,
    locationId: scope.locationId,
    preset: scope.dateRangePreset,
    fromDate: scope.fromDate,
    toDate: scope.toDate,
  };

  const highPriority = tasks.highPriority;
  const mediumPriority = tasks.mediumPriority;
  const lowPriority = tasks.lowPriority;

  const handleSelectPreset = (preset: string) => {
    setIsDateMenuOpen(false);
    const params = new URLSearchParams();
    if (scope.organizationId) params.set("organizationId", scope.organizationId);
    if (scope.locationId) params.set("locationId", scope.locationId);
    params.set("preset", preset);
    router.push(`/?${params.toString()}`);
  };

  const handleApplyCustomDate = () => {
    if (!customFrom || !customTo) return;
    setIsDateMenuOpen(false);
    const params = new URLSearchParams();
    if (scope.organizationId) params.set("organizationId", scope.organizationId);
    if (scope.locationId) params.set("locationId", scope.locationId);
    params.set("preset", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`/?${params.toString()}`);
  };

  const getPresetLabel = () => {
    switch (scope.dateRangePreset) {
      case "yesterday": return "Yesterday";
      case "this_week": return "This Week";
      case "this_month": return "This Month";
      case "custom": return `${scope.fromDate} to ${scope.toDate}`;
      default: return "Today";
    }
  };

  const renderPriorityRow = (
    label: string,
    color: string,
    priorityKey: "high" | "medium" | "low",
    breakdown: TaskPriorityBreakdown
  ) => {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "100px 1fr 1fr 1fr",
          alignItems: "center",
          gap: "8px",
          padding: "8px 0",
          borderBottom: "1px solid #f1f5f9",
          fontSize: "0.8rem",
        }}
      >
        <div style={{ fontWeight: 700, color, display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{label}</span>
        </div>

        {/* Completed Button */}
        <Link
          href={buildFilteredUrl("/tasks/history", { status: "completed", priority: priorityKey }, currentScope)}
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              background: breakdown.completed > 0 ? "#ecfdf5" : "#f8fafc",
              border: `1px solid ${breakdown.completed > 0 ? "#a7f3d0" : "#e2e8f0"}`,
              borderRadius: "6px",
              padding: "6px 8px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 800, color: breakdown.completed > 0 ? "#059669" : "#64748b" }}>
              {breakdown.completed}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>COMPLETED</div>
          </div>
        </Link>

        {/* In-Progress Button */}
        <Link
          href={buildFilteredUrl("/tasks", { priority: priorityKey, status: "in_progress" }, currentScope)}
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              background: breakdown.inProgress > 0 ? "#fffbeb" : "#f8fafc",
              border: `1px solid ${breakdown.inProgress > 0 ? "#fde68a" : "#e2e8f0"}`,
              borderRadius: "6px",
              padding: "6px 8px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 800, color: breakdown.inProgress > 0 ? "#d97706" : "#64748b" }}>
              {breakdown.inProgress}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>IN-PROGRESS</div>
          </div>
        </Link>

        {/* Pending / Overdue Button */}
        <Link
          href={buildFilteredUrl("/tasks", { priority: priorityKey, status: "pending" }, currentScope)}
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              background: breakdown.overdue > 0 ? "#fef2f2" : breakdown.pending > 0 ? "#eff6ff" : "#f8fafc",
              border: `1px solid ${breakdown.overdue > 0 ? "#fecaca" : breakdown.pending > 0 ? "#bfdbfe" : "#e2e8f0"}`,
              borderRadius: "6px",
              padding: "6px 8px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 800, color: breakdown.overdue > 0 ? "#dc2626" : breakdown.pending > 0 ? "#2563eb" : "#64748b" }}>
              {breakdown.pending} {breakdown.overdue > 0 && <span style={{ fontSize: "0.7rem", color: "#dc2626" }}>({breakdown.overdue} Late)</span>}
            </div>
            <div style={{ fontSize: "0.65rem", color: breakdown.overdue > 0 ? "#dc2626" : "#64748b", fontWeight: 600 }}>
              {breakdown.overdue > 0 ? "OVERDUE" : "PENDING"}
            </div>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Header Context Indicator + Date Range Hub */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--kalki-text-primary, #0f172a)", margin: 0 }}>
              Executive Operational Cockpit
            </h1>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "999px",
                background: scope.isAllLocations ? "#eff6ff" : "#fef3c7",
                color: scope.isAllLocations ? "#1d4ed8" : "#92400e",
                border: `1px solid ${scope.isAllLocations ? "#bfdbfe" : "#fde68a"}`,
              }}
            >
              {scope.isAllLocations ? "🏢 All Locations (HQ Rollup)" : `📍 ${scope.locationName || "Single Branch"}`}
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "var(--kalki-text-secondary, #64748b)" }}>
            Real-time multi-departmental bottlenecks, priority task tracking, and floor attendance.
          </p>
        </div>

        {/* Date Range Hub Picker Menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#334155",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <Calendar size={16} color="#d97706" />
            <span>Range: {getPresetLabel()}</span>
            <ChevronDown size={14} color="#64748b" />
          </button>

          {isDateMenuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: "6px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                zIndex: 50,
                width: "260px",
                padding: "8px",
              }}
            >
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "6px 8px" }}>
                Select Time Horizon
              </div>

              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "this_week", label: "This Week (Mon - Sun)" },
                { id: "this_month", label: "This Month (Month-to-Date)" },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    background: scope.dateRangePreset === p.id ? "#fef3c7" : "transparent",
                    color: scope.dateRangePreset === p.id ? "#92400e" : "#1e293b",
                    fontWeight: scope.dateRangePreset === p.id ? 700 : 500,
                  }}
                >
                  <span>{p.label}</span>
                  {scope.dateRangePreset === p.id && <Check size={14} color="#d97706" />}
                </div>
              ))}

              <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "8px", paddingTop: "8px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "6px", padding: "0 8px" }}>
                  Custom Range:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 8px" }}>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    style={{ fontSize: "0.75rem", padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    style={{ fontSize: "0.75rem", padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                  <button
                    onClick={handleApplyCustomDate}
                    style={{
                      background: "#b45309",
                      color: "#fff",
                      border: "none",
                      padding: "6px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginTop: "2px",
                    }}
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top High-Impact Metric Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {/* On-Duty Attendance Card */}
        <Link
          href={buildFilteredUrl("/attendance/reports", { status: "PRESENT" }, currentScope)}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card" style={{ padding: "16px", borderTop: "3px solid #10b981", transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Live Attendance
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "6px 0" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
                {attendance.clockedIn} / {attendance.totalScheduled}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: "#ecfdf5", color: "#047857" }}>
                {attendance.presentRate}%
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {attendance.lateArrivals} Late · {attendance.absentCount} Absent
            </div>
          </div>
        </Link>

        {/* High Priority Overdue Card */}
        <Link
          href={buildFilteredUrl("/tasks", { priority: "high", status: "overdue" }, currentScope)}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card" style={{ padding: "16px", borderTop: "3px solid #ef4444", transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              High Priority Overdue
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "6px 0" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: 800, color: highPriority.overdue > 0 ? "#dc2626" : "#0f172a" }}>
                {highPriority.overdue}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: highPriority.overdue > 0 ? "#fef2f2" : "#f1f5f9", color: highPriority.overdue > 0 ? "#dc2626" : "#475569" }}>
                {highPriority.inProgress} In-Progress
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {highPriority.completed} of {highPriority.total} Completed
            </div>
          </div>
        </Link>

        {/* Pending POs Count Card */}
        <Link
          href={buildFilteredUrl("/purchasing/purchase-orders", { status: "PENDING" }, currentScope)}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card" style={{ padding: "16px", borderTop: "3px solid #f59e0b", transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Pending PO Approvals
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "6px 0" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#b45309" }}>
                {purchasing.pendingPoCount}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: "#fffbeb", color: "#b45309" }}>
                Requires Auth
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {purchasing.pendingSpotPurchasesCount} Spot Audits Pending
            </div>
          </div>
        </Link>

        {/* 48h Catering Orders Card */}
        <div className="card" style={{ padding: "16px", borderTop: "3px solid #8b5cf6", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                href={buildFilteredUrl("/events", { timeframe: "48h" }, currentScope)}
                style={{ textDecoration: "none", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}
              >
                Events (Next 48 Hours)
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "6px 0", flexWrap: "wrap" }}>
              <Link
                href={buildFilteredUrl("/events", { timeframe: "48h" }, currentScope)}
                style={{ textDecoration: "none", fontSize: "1.6rem", fontWeight: 800, color: "#6b21a8" }}
              >
                {events.upcoming48hCount}
              </Link>
              <Link
                href={buildFilteredUrl("/crm/leads", { stage: "NEW_ENQUIRY" }, currentScope)}
                style={{
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "#f3e8ff",
                  color: "#6b21a8",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px"
                }}
                title="View Open Enquiries in CRM Leads"
              >
                {events.openEnquiriesCount} Open Enquiries →
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
            <Link
              href={buildFilteredUrl("/events", { timeframe: "48h" }, currentScope)}
              style={{ textDecoration: "none", color: "#64748b" }}
            >
              Upcoming Banquets & Catering
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Main 2x2 Segment Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
          gap: "20px",
        }}
      >
        {/* SEGMENT 1: 3-Tier Priority Tasks Matrix (High, Medium, Low) */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📋</span> Tasks & Shift Routines by Priority
            </div>
            <Link
              href={buildFilteredUrl("/tasks", {}, currentScope)}
              style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: 700, textDecoration: "none" }}
            >
              Task Board →
            </Link>
          </div>

          {/* 3-Row Priority Grid */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
            {renderPriorityRow("🔴 High", "#dc2626", "high", highPriority)}
            {renderPriorityRow("🟡 Medium", "#d97706", "medium", mediumPriority)}
            {renderPriorityRow("🟢 Low", "#059669", "low", lowPriority)}
          </div>

          {/* Overdue Items List */}
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
            Critical Overdue Bottlenecks ({tasks.topOverdueList.length})
          </div>

          {tasks.topOverdueList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tasks.topOverdueList.map((t) => (
                <Link
                  key={t.id}
                  href={buildFilteredUrl(`/tasks/${t.id}`, {}, currentScope)}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "#fff5f5",
                      border: "1px solid #fed7d7",
                      fontSize: "0.825rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#742a2a" }}>{t.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "#9b2c2c", marginTop: "2px" }}>
                        Role: {t.assignedRoleName || "Unassigned"} · Overdue by {t.overdueMinutes} mins
                      </div>
                    </div>
                    {t.locationName && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#feebc8", color: "#7b341e", padding: "2px 6px", borderRadius: "4px" }}>
                        {t.locationName}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: "16px", textAlign: "center", background: "#f8fafc", borderRadius: "6px", color: "#64748b", fontSize: "0.825rem" }}>
              🎉 Zero high priority tasks overdue for this date range!
            </div>
          )}
        </div>

        {/* SEGMENT 2: People & Live Floor Attendance */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>👥</span> People & Live Floor Attendance
            </div>
            <Link
              href={buildFilteredUrl("/attendance/reports", {}, currentScope)}
              style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: 700, textDecoration: "none" }}
            >
              Attendance Terminal →
            </Link>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <Link
              href={buildFilteredUrl("/attendance/reports", { status: "PRESENT" }, currentScope)}
              style={{ flex: 1, textDecoration: "none" }}
            >
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#047857" }}>{attendance.clockedIn}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#065f46" }}>ON DUTY NOW</div>
              </div>
            </Link>

            <Link
              href={buildFilteredUrl("/attendance/reports", { status: "LATE" }, currentScope)}
              style={{ flex: 1, textDecoration: "none" }}
            >
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#b45309" }}>{attendance.lateArrivals}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#92400e" }}>LATE ARRIVALS</div>
              </div>
            </Link>

            <Link
              href={buildFilteredUrl("/attendance/reports", { status: "ABSENT" }, currentScope)}
              style={{ flex: 1, textDecoration: "none" }}
            >
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#dc2626" }}>{attendance.absentCount}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#991b1b" }}>UNEXCUSED</div>
              </div>
            </Link>
          </div>

          {/* Pending Leave Approvals */}
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
            Pending Leave Approvals ({attendance.pendingLeaves.length})
          </div>

          {attendance.pendingLeaves.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {attendance.pendingLeaves.map((l) => (
                <Link
                  key={l.id}
                  href={buildFilteredUrl(`/attendance/leave-approvals`, { id: l.id }, currentScope)}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.825rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {l.employeeName} ({l.employeeCode}) · {l.leaveType}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                        {l.startDate} to {l.endDate} ({l.totalDays} days) · {l.reason || "No reason specified"}
                      </div>
                    </div>
                    {l.locationName && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px" }}>
                        {l.locationName}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: "16px", textAlign: "center", background: "#f8fafc", borderRadius: "6px", color: "#64748b", fontSize: "0.825rem" }}>
              No pending leave applications.
            </div>
          )}
        </div>

        {/* SEGMENT 3: Purchasing & Requisitions Queue */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛒</span> Purchasing & Procurement Queue
            </div>
            <Link
              href={buildFilteredUrl("/purchasing/dashboard", {}, currentScope)}
              style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: 700, textDecoration: "none" }}
            >
              Purchasing Center →
            </Link>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <Link
              href={buildFilteredUrl("/purchasing/purchase-orders", { status: "PENDING" }, currentScope)}
              style={{ flex: 1, textDecoration: "none" }}
            >
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#b45309" }}>{purchasing.pendingPoCount}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e" }}>PENDING POS</div>
                <div style={{ fontSize: "0.7rem", color: "#78350f", marginTop: "4px" }}>Review & Authorize →</div>
              </div>
            </Link>

            <Link
              href={buildFilteredUrl("/purchasing/cashier", { status: "PENDING_AUDIT" }, currentScope)}
              style={{ flex: 1, textDecoration: "none" }}
            >
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#334155" }}>{purchasing.pendingSpotPurchasesCount}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>SPOT AUDITS</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px" }}>Verify Cash Receipts →</div>
              </div>
            </Link>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", fontSize: "0.825rem", color: "#475569" }}>
            💡 <strong>Procurement Rule:</strong> Authorized POs release stock into local inventory and dispatch supplier confirmation notes.
          </div>
        </div>

        {/* SEGMENT 4: Catering Orders & Upcoming Events (48h) */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🎉</span> Catering Orders & Banquets (Next 48 Hours)
            </div>
            <Link
              href={buildFilteredUrl("/events", {}, currentScope)}
              style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: 700, textDecoration: "none" }}
            >
              Events Calendar →
            </Link>
          </div>

          {events.upcoming48hOrders.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {events.upcoming48hOrders.map((e) => (
                <Link
                  key={e.id}
                  href={buildFilteredUrl(`/events/${e.id}`, {}, currentScope)}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "#faf5ff",
                      border: "1px solid #f3e8ff",
                      fontSize: "0.825rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#581c87" }}>
                        {e.title} · {e.expectedPax} Pax
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#7e22ce", marginTop: "2px" }}>
                        Slot: {e.timeSlot} · Contact: {e.contactName} ({e.contactPhone})
                      </div>
                    </div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#ede9fe", color: "#6b21a8", padding: "3px 8px", borderRadius: "4px" }}>
                      {e.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: "16px", textAlign: "center", background: "#f8fafc", borderRadius: "6px", color: "#64748b", fontSize: "0.825rem" }}>
              No catering orders scheduled within the next 48 hours.
            </div>
          )}

          {/* Unquoted Enquiries Link */}
          <Link
            href={buildFilteredUrl("/crm/leads", { status: "NEW" }, currentScope)}
            style={{ textDecoration: "none", marginTop: "12px" }}
          >
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
              <span style={{ color: "#166534", fontWeight: 600 }}>
                📢 <strong>{events.openEnquiriesCount} New Inquiries</strong> awaiting quote
              </span>
              <span style={{ color: "#15803d", fontWeight: 700 }}>Open Lead Board →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. Branch Comparison Matrix (Visible when All Locations is Active) */}
      {scope.isAllLocations && branchComparison.length > 0 && (
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                🏢 Multi-Branch Operational Comparison (HQ View)
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.775rem", color: "#64748b" }}>
                Click any branch row to filter the entire dashboard to that location.
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#b45309", fontWeight: 600 }}>
              Live Store Rollup
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Branch Name</th>
                  <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>On-Duty Staff</th>
                  <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>High Priority Overdue</th>
                  <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Pending POs</th>
                  <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {branchComparison.map((b) => (
                  <tr
                    key={b.locationId}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" }}
                  >
                    <td style={{ padding: "12px" }}>
                      <Link
                        href={`/?organizationId=${scope.organizationId}&locationId=${b.locationId}&preset=${scope.dateRangePreset}`}
                        style={{ textDecoration: "none", fontWeight: 700, color: "#0f172a" }}
                      >
                        {b.locationName}
                      </Link>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontWeight: 700, color: b.attendancePercent < 80 ? "#dc2626" : "#047857" }}>
                        {b.onDutyStaff} / {b.scheduledStaff}
                      </span>{" "}
                      ({b.attendancePercent}%)
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontWeight: 700, color: b.highPriorityOverdue > 0 ? "#dc2626" : "#059669" }}>
                        {b.highPriorityOverdue} Overdue
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontWeight: 600, color: b.pendingPoCount > 0 ? "#b45309" : "#64748b" }}>
                        {b.pendingPoCount} POs
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <Link
                        href={`/?organizationId=${scope.organizationId}&locationId=${b.locationId}&preset=${scope.dateRangePreset}`}
                        style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b45309", textDecoration: "none" }}
                      >
                        Switch to Branch View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
