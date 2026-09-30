"use client";

import { useState, useEffect } from "react";
import { approveOrRejectAdvanceAction } from "@/app/payroll/advances/actions";

type AdvanceRequest = {
  id: string;
  requestedAmount: string;
  advanceTypeName: string;
  employeeName: string;
  employeeCode: string;
  repaymentMonths: number | null;
};

export default function AdvanceApprovalList({ requests }: { requests: AdvanceRequest[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", requestedAmt: string, requestedMonths: number | null) => {
    setLoadingId(id);
    setError(null);
    try {
      let approvedAmount = undefined;
      let repaymentMonths = undefined;
      
      if (status === "APPROVED") {
        const amtInput = window.prompt("Enter the approved amount:", requestedAmt);
        if (amtInput === null) { setLoadingId(null); return; } // Cancelled
        approvedAmount = parseFloat(amtInput);
        
        if (requestedMonths !== null) {
            const monthsInput = window.prompt("Enter the approved repayment months:", requestedMonths.toString());
            if (monthsInput !== null) {
                repaymentMonths = parseInt(monthsInput);
            }
        }
      }
      
      const res = await approveOrRejectAdvanceAction(id, status, approvedAmount, repaymentMonths);
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
        No pending advance requests.
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
              <strong>Type:</strong> {req.advanceTypeName}
            </p>
            <p style={{ margin: "0 0 0.25rem 0", color: "var(--att-text-muted)" }}>
              <strong>Requested Amount:</strong> ₹{req.requestedAmount}
            </p>
            {req.repaymentMonths && (
                <p style={{ margin: "0 0 0.25rem 0", color: "var(--att-text-muted)" }}>
                <strong>Requested Repayment Months:</strong> {req.repaymentMonths}
                </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => handleAction(req.id, "APPROVED", req.requestedAmount, req.repaymentMonths)}
              disabled={loadingId === req.id}
              className="att-button"
              style={{
                padding: "0.5rem 1rem",
                background: "var(--att-success)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              {loadingId === req.id ? "..." : "Approve"}
            </button>
            <button
              onClick={() => handleAction(req.id, "REJECTED", req.requestedAmount, req.repaymentMonths)}
              disabled={loadingId === req.id}
              className="att-button"
              style={{
                padding: "0.5rem 1rem",
                background: "var(--att-destructive)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
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
