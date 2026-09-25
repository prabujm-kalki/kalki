"use client";

import { useState, useEffect } from "react";
import { Check, X, Clock } from "lucide-react";
import { processRegularizationRequest } from "@/domains/attendance/regularizationActions";
import { useRouter } from "next/navigation";

export default function RegularizationApprovalList({ requests }: { requests: any[] }) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!requests.length) {
    return (
      <div className="att-card" style={{ padding: "3rem", textAlign: "center", color: "var(--att-text-muted)" }}>
        No pending regularization requests.
      </div>
    );
  }

  async function handleAction(id: string, action: "APPROVE" | "REJECT") {
    setProcessingId(id);
    try {
      const res = await processRegularizationRequest(id, action);
      if (res.success) {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to process request");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="att-card">
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--att-border)" }}>
        <h3 style={{ margin: 0, fontSize: "1.125rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Clock size={20} color="var(--att-accent)" /> Pending Regularizations
        </h3>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--att-border)", textAlign: "left" }}>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Employee</th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Date & Time</th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Punch Type</th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Reason</th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 500, color: "var(--att-text-muted)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} style={{ borderBottom: "1px solid var(--att-border)", opacity: processingId === req.id ? 0.5 : 1 }}>
                <td style={{ padding: "1rem 1.5rem" }}>
                  <div style={{ fontWeight: 500 }}>{req.employeeName}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--att-text-muted)" }}>{req.employeeCode}</div>
                </td>
                <td style={{ padding: "1rem 1.5rem" }}>
                  <div>{req.date}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--att-text-muted)" }}>
                    {isMounted ? new Date(req.requestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                  </div>
                </td>
                <td style={{ padding: "1rem 1.5rem" }}>
                  <span className="kalki-badge kalki-badge--warning">
                    {req.requestedPunchType.replace("_", " ")}
                  </span>
                </td>
                <td style={{ padding: "1rem 1.5rem", maxWidth: "250px" }}>
                  {req.reason}
                </td>
                <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button 
                      onClick={() => handleAction(req.id, "APPROVE")}
                      disabled={processingId === req.id}
                      className="att-button" 
                      style={{ padding: "0.5rem 1rem", background: "var(--att-success)", color: "#fff", display: "flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <Check size={16} /> Accept
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, "REJECT")}
                      disabled={processingId === req.id}
                      className="att-button" 
                      style={{ padding: "0.5rem 1rem", background: "var(--att-destructive)", color: "#fff", display: "flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
