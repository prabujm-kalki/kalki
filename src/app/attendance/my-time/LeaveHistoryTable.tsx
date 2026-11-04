"use client";

type LeaveRequest = {
  id: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  totalDays: string;
  status: string;
  createdAt: Date;
};

import { useState, useEffect } from "react";

export function LeaveHistoryTable({ requests }: { requests: LeaveRequest[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (requests.length === 0) {
    return (
      <div className="att-card" style={{ marginTop: "2rem" }}>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", color: "var(--att-primary)" }}>Leave History</h3>
        <p className="muted" style={{ textAlign: "center", padding: "2rem 0" }}>No leave requests found.</p>
      </div>
    );
  }

  return (
    <div className="att-card" style={{ marginTop: "1rem" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "var(--att-primary)" }}>Leave & Regularization History</h3>
      
      {/* Desktop Table View */}
      <div className="leave-history-desktop-table" style={{ overflowX: "auto" }}>
        <table className="att-table">
          <thead>
            <tr>
              <th>Applied On</th>
              <th>Leave Type</th>
              <th>Duration</th>
              <th>Total Days</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{isMounted ? new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "..."}</td>
                <td style={{ fontWeight: "500" }}>{req.leaveTypeName}</td>
                <td>
                  {isMounted ? (
                    <>
                      {new Date(req.startDate).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} 
                      {new Date(req.startDate).getTime() !== new Date(req.endDate).getTime() && ` - ${new Date(req.endDate).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`}
                    </>
                  ) : "..."}
                </td>
                <td>{req.totalDays}</td>
                <td>
                  <span className={`att-status ${req.status.toLowerCase()}`}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Zero horizontal scrolling) */}
      <div className="leave-history-mobile-cards">
        {requests.map((req) => (
          <div
            key={req.id}
            style={{
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--att-border)",
              background: "var(--att-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--att-primary)" }}>
                {req.leaveTypeName}
              </span>
              <span className={`att-status ${req.status.toLowerCase()}`} style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                {req.status}
              </span>
            </div>
            
            <div style={{ fontSize: "0.8rem", color: "var(--att-text)" }}>
              {isMounted ? (
                <>
                  {new Date(req.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} 
                  {new Date(req.startDate).getTime() !== new Date(req.endDate).getTime() && ` - ${new Date(req.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  {" "}(<strong>{req.totalDays} {parseFloat(req.totalDays) === 1 ? "day" : "days"}</strong>)
                </>
              ) : "..."}
            </div>

            <div style={{ fontSize: "0.72rem", color: "var(--att-text-muted)" }}>
              Applied on {isMounted ? new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "..."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
