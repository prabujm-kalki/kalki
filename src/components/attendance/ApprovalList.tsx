"use client";

import { useState, useEffect } from "react";
import { actionLeaveRequest } from "@/domains/attendance/actions";

type LeaveRequest = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  totalDays: string;
  reason: string;
  leaveType: string;
  employeeName: string;
  employeeCode: string;
  evidenceUrl?: string | null;
};

export default function ApprovalList({ requests }: { requests: LeaveRequest[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    setLoadingId(id);
    setError(null);
    try {
      let rejectionReason = undefined;
      if (status === "REJECTED") {
        rejectionReason = window.prompt("Enter a reason for rejection (optional):") || undefined;
      }
      
      const res = await actionLeaveRequest(id, status, rejectionReason);
      if (res.success) {
        window.location.reload();
      } else {
        setError(res.error || "Failed to process request");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--att-text-muted)" }}>
        No pending approvals at this time.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <div style={{ color: "red", padding: "1rem", background: "#fee" }}>{error}</div>}
      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid var(--att-border)",
            borderRadius: "8px",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            background: "white"
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
              {req.employeeName} ({req.employeeCode})
            </h3>
            <p style={{ margin: "0 0 0.25rem 0", color: "var(--att-text-muted)" }}>
              <strong>Type:</strong> {req.leaveType}
            </p>
            <p style={{ margin: "0 0 0.25rem 0", color: "var(--att-text-muted)" }}>
              <strong>Dates:</strong> {isMounted ? `${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}` : "..."}
            </p>
            <p style={{ margin: "0 0 0.25rem 0", color: "var(--att-text-muted)" }}>
              <strong>Total Days:</strong> {req.totalDays}
            </p>
            <p style={{ margin: 0, color: "var(--att-text-muted)" }}>
              <strong>Reason:</strong> {req.reason}
            </p>
            {req.evidenceUrl && (
              <p style={{ margin: "0.25rem 0 0 0", color: "var(--att-primary)" }}>
                <a href={req.evidenceUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "inherit", textDecoration: "underline" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  View Attachment
                </a>
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => handleAction(req.id, "APPROVED")}
              disabled={loadingId === req.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 14px",
                backgroundColor: "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loadingId === req.id ? "not-allowed" : "pointer",
                opacity: loadingId === req.id ? 0.7 : 1,
                boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)",
                transition: "background-color 0.15s ease",
                minWidth: "72px"
              }}
            >
              {loadingId === req.id ? "..." : "Approve"}
            </button>
            <button
              onClick={() => handleAction(req.id, "REJECTED")}
              disabled={loadingId === req.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 14px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loadingId === req.id ? "not-allowed" : "pointer",
                opacity: loadingId === req.id ? 0.7 : 1,
                boxShadow: "0 1px 2px rgba(239, 68, 68, 0.2)",
                transition: "background-color 0.15s ease",
                minWidth: "72px"
              }}
            >
              {loadingId === req.id ? "..." : "Reject"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
