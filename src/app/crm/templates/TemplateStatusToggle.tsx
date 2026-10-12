"use client";

import React, { useState, useTransition } from "react";
import { toggleTemplateStatus } from "./actions";
import { ChevronDown } from "lucide-react";

interface TemplateStatusToggleProps {
  templateId: string;
  initialStatus: "ACTIVE" | "INACTIVE";
}

export function TemplateStatusToggle({ templateId, initialStatus }: TemplateStatusToggleProps) {
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(initialStatus);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as "ACTIVE" | "INACTIVE";
    if (newStatus === status || isPending) return;
    setStatus(newStatus);
    startTransition(async () => {
      try {
        await toggleTemplateStatus(templateId, newStatus);
      } catch (err) {
        console.error("Failed to update status", err);
        setStatus(status);
        alert("Failed to update template status");
      }
    });
  };

  const isActive = status === "ACTIVE";

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={status}
        onChange={handleToggle}
        disabled={isPending}
        title={isPending ? "Updating status..." : "Click to change status"}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundColor: isActive ? "#dcfce7" : "#f1f5f9",
          color: isActive ? "#166534" : "#475569",
          border: isActive ? "1px solid #86efac" : "1px solid #cbd5e1",
          borderRadius: "999px",
          padding: "5px 28px 5px 12px",
          fontSize: "0.75rem",
          fontWeight: 700,
          cursor: isPending ? "not-allowed" : "pointer",
          outline: "none",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          opacity: isPending ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
      >
        <option value="ACTIVE" style={{ backgroundColor: "#ffffff", color: "#166534", fontWeight: 600 }}>ACTIVE</option>
        <option value="INACTIVE" style={{ backgroundColor: "#ffffff", color: "#475569", fontWeight: 600 }}>INACTIVE</option>
      </select>
      <div 
        style={{ 
          position: "absolute", 
          right: "9px", 
          pointerEvents: "none", 
          display: "flex", 
          alignItems: "center", 
          color: isActive ? "#166534" : "#475569" 
        }}
      >
        <ChevronDown size={13} strokeWidth={2.5} />
      </div>
    </div>
  );
}
