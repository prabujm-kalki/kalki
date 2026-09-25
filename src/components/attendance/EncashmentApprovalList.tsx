"use client";

import { useState } from "react";
import { approveEncashment, rejectEncashment, forwardEncashment } from "@/domains/attendance/actions";

type EncashmentRequest = {
  id: string;
  leaveType: string;
  encashmentDays: string;
  reason: string;
  employeeName: string;
  employeeCode: string;
};

type EmployeeOption = {
  id: string;
  name: string;
};

export default function EncashmentApprovalList({ 
  requests, 
  allEmployees 
}: { 
  requests: EncashmentRequest[], 
  allEmployees: EmployeeOption[] 
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const [selectedForwardTo, setSelectedForwardTo] = useState<string>("");

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      const res = await approveEncashment(id);
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

  const handleReject = async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      const reason = window.prompt("Enter a reason for rejection (optional):") || "";
      const res = await rejectEncashment(id, reason);
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

  const handleForward = async (id: string) => {
    if (!selectedForwardTo) {
      setError("Please select a person to forward to.");
      return;
    }
    
    setLoadingId(id);
    setError(null);
    try {
      const res = await forwardEncashment(id, selectedForwardTo);
      if (res.success) {
        window.location.reload();
      } else {
        setError(res.error || "Failed to process request");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoadingId(null);
      setForwardingId(null);
      setSelectedForwardTo("");
    }
  };

  if (requests.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--att-text-muted)" }}>
        No pending encashment approvals at this time.
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
              <strong>Type:</strong> {req.leaveType} Encashment
            </p>
            <p style={{ margin: "0 0 0.25rem 0", color: "var(--att-text-muted)" }}>
              <strong>Encashment Days:</strong> {req.encashmentDays}
            </p>
            <p style={{ margin: 0, color: "var(--att-text-muted)" }}>
              <strong>Reason:</strong> {req.reason}
            </p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => handleApprove(req.id)}
                disabled={loadingId === req.id || forwardingId === req.id}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loadingId === req.id ? "not-allowed" : "pointer"
                }}
              >
                Approve
              </button>
              
              <button
                onClick={() => handleReject(req.id)}
                disabled={loadingId === req.id || forwardingId === req.id}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loadingId === req.id ? "not-allowed" : "pointer"
                }}
              >
                Reject
              </button>

              <button
                onClick={() => setForwardingId(forwardingId === req.id ? null : req.id)}
                disabled={loadingId === req.id}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loadingId === req.id ? "not-allowed" : "pointer"
                }}
              >
                Forward
              </button>
            </div>

            {forwardingId === req.id && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", padding: "0.5rem", background: "#f8f9fa", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
                <select 
                  value={selectedForwardTo} 
                  onChange={e => setSelectedForwardTo(e.target.value)}
                  style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid #ccc" }}
                >
                  <option value="">-- Select Person --</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleForward(req.id)}
                  disabled={loadingId === req.id || !selectedForwardTo}
                  style={{
                    padding: "0.25rem 0.75rem",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: (!selectedForwardTo || loadingId === req.id) ? "not-allowed" : "pointer"
                  }}
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
