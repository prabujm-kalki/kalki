"use client";

import { useState } from "react";
import { LeaveApplicationForm } from "./LeaveApplicationForm";
import { EncashmentApplicationForm } from "./EncashmentApplicationForm";
import { RegularizationRequestForm } from "./RegularizationRequestForm";
import { Calendar, DollarSign, Clock, ChevronDown, ChevronUp } from "lucide-react";

type MyTimeTabsProps = {
  leaveTypes: any[];
  balances: any[];
  employeeId: string;
  organizationId: string;
  locationId: string;
};

export function MyTimeTabs(props: MyTimeTabsProps) {
  const [activeTab, setActiveTab] = useState<"leave" | "encashment" | "regularization" | null>(null);

  const toggleTab = (tab: "leave" | "encashment" | "regularization") => {
    setActiveTab(prev => prev === tab ? null : tab);
  };

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      {/* 3 Action Buttons in Single View */}
      <div className="mytime-action-bar">
        <button
          onClick={() => toggleTab("leave")}
          className="mytime-action-btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            padding: "0.75rem 0.6rem",
            borderRadius: "10px",
            border: activeTab === "leave" ? "2px solid #3b82f6" : "1px solid var(--att-border)",
            background: activeTab === "leave" ? "#eff6ff" : "var(--att-bg)",
            color: activeTab === "leave" ? "#1d4ed8" : "var(--att-primary)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            transition: "all 0.15s ease"
          }}
        >
          <Calendar size={18} style={{ color: activeTab === "leave" ? "#2563eb" : "#3b82f6" }} />
          <span>Apply Leave</span>
        </button>

        <button
          onClick={() => toggleTab("encashment")}
          className="mytime-action-btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            padding: "0.75rem 0.6rem",
            borderRadius: "10px",
            border: activeTab === "encashment" ? "2px solid #10b981" : "1px solid var(--att-border)",
            background: activeTab === "encashment" ? "#ecfdf5" : "var(--att-bg)",
            color: activeTab === "encashment" ? "#047857" : "var(--att-primary)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            transition: "all 0.15s ease"
          }}
        >
          <DollarSign size={18} style={{ color: activeTab === "encashment" ? "#059669" : "#10b981" }} />
          <span>Encashment</span>
        </button>

        <button
          onClick={() => toggleTab("regularization")}
          className="mytime-action-btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            padding: "0.75rem 0.6rem",
            borderRadius: "10px",
            border: activeTab === "regularization" ? "2px solid #8b5cf6" : "1px solid var(--att-border)",
            background: activeTab === "regularization" ? "#f5f3ff" : "var(--att-bg)",
            color: activeTab === "regularization" ? "#6d28d9" : "var(--att-primary)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            transition: "all 0.15s ease"
          }}
        >
          <Clock size={18} style={{ color: activeTab === "regularization" ? "#7c3aed" : "#8b5cf6" }} />
          <span>Regularize</span>
        </button>
      </div>

      {/* Expandable Form Card */}
      {activeTab && (
        <div className="att-card" style={{ padding: "1.25rem", borderRadius: "12px", border: "1px solid #cbd5e1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--att-border)" }}>
            <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--att-primary)" }}>
              {activeTab === "leave" && "Apply for Time Off"}
              {activeTab === "encashment" && "Request Leave Encashment"}
              {activeTab === "regularization" && "Request Missing Punch Regularization"}
            </h4>
            <button
              onClick={() => setActiveTab(null)}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "2px 8px"
              }}
            >
              Close ✕
            </button>
          </div>

          <div>
            {activeTab === "leave" && <LeaveApplicationForm {...props} />}
            {activeTab === "encashment" && <EncashmentApplicationForm {...props} />}
            {activeTab === "regularization" && <RegularizationRequestForm />}
          </div>
        </div>
      )}
    </div>
  );
}

