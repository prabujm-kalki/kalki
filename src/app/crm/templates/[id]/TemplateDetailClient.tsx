"use client";

import React, { useState } from "react";
import { removeCustomerFromTemplate } from "../actions";

export function TemplateDetailClient({
  templateId,
  audiences
}: {
  templateId: string;
  audiences: Array<{
    customerId: string;
    customerName: string;
    contact: string;
    status: string;
  }>;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRemove = async (customerId: string) => {
    if (!confirm("Are you sure you want to remove this customer from the template?")) return;
    
    setLoadingId(customerId);
    try {
      await removeCustomerFromTemplate(templateId, customerId);
    } catch (err) {
      console.error(err);
      alert("Failed to remove customer.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
        <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <tr>
            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Customer Name</th>
            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Contact</th>
            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Status</th>
            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {audiences.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                No customers enrolled in this template.
              </td>
            </tr>
          ) : (
            audiences.map(a => (
              <tr key={a.customerId} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 500 }}>{a.customerName}</td>
                <td style={{ padding: "12px 16px", color: "#475569" }}>{a.contact}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", backgroundColor: a.status === 'ACTIVE' ? "#dcfce7" : "#f1f5f9", color: a.status === 'ACTIVE' ? "#166534" : "#475569", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 500 }}>
                    {a.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <button
                    onClick={() => handleRemove(a.customerId)}
                    disabled={loadingId === a.customerId}
                    style={{ 
                      padding: "6px 12px", 
                      backgroundColor: "#fee2e2", 
                      color: "#b91c1c", 
                      border: "none", 
                      borderRadius: "6px", 
                      fontSize: "0.75rem", 
                      fontWeight: 600, 
                      cursor: loadingId === a.customerId ? "not-allowed" : "pointer",
                      opacity: loadingId === a.customerId ? 0.7 : 1
                    }}
                  >
                    {loadingId === a.customerId ? "Removing..." : "Remove"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
