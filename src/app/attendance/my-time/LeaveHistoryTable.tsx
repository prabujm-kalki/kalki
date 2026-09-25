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
    <div className="att-card" style={{ marginTop: "2rem" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", color: "var(--att-primary)" }}>Leave History</h3>
      
      <div style={{ overflowX: "auto" }}>
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
    </div>
  );
}
