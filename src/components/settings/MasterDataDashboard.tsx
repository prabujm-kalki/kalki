"use client";

import { useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { DepartmentsDashboard } from "./DepartmentsDashboard";
import { ShiftDefinitionsDashboard } from "./ShiftDefinitionsDashboard";
import { Database, MapPin, Users, Clock } from "lucide-react";

export function MasterDataDashboard() {
  const { selected } = useSessionView();
  const [activeTab, setActiveTab] = useState<"locations" | "departments" | "roles" | "shifts">("departments");

  if (!selected) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Please select an organization.</div>;
  }

  return (
    <div className="kalki-main-wrapper">
      <div className="kalki-main-content">
        <div className="kalki-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--kalki-primary)', padding: '12px', borderRadius: 'var(--radius-lg)', color: 'white' }}>
              <Database size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="kalki-page-title">Master Data</h1>
              <p className="kalki-page-description">Configure structure and rules for {selected.organizationName}</p>
            </div>
          </div>
        </div>

        {/* Custom Nav Tabs */}
        <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--kalki-border)", marginBottom: "2rem" }}>
          <button 
            onClick={() => setActiveTab("locations")}
            style={{ 
              padding: "1rem 0", 
              background: "none", 
              border: "none",
              borderBottom: activeTab === "locations" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
              color: activeTab === "locations" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
              fontWeight: activeTab === "locations" ? 600 : 500,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.5rem"
            }}
          >
            <MapPin size={16} /> Locations (Coming Soon)
          </button>
          <button 
            onClick={() => setActiveTab("departments")}
            style={{ 
              padding: "1rem 0", 
              background: "none", 
              border: "none",
              borderBottom: activeTab === "departments" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
              color: activeTab === "departments" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
              fontWeight: activeTab === "departments" ? 600 : 500,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.5rem"
            }}
          >
            <Users size={16} /> Departments
          </button>
          <button 
            onClick={() => setActiveTab("shifts")}
            style={{ 
              padding: "1rem 0", 
              background: "none", 
              border: "none",
              borderBottom: activeTab === "shifts" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
              color: activeTab === "shifts" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
              fontWeight: activeTab === "shifts" ? 600 : 500,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.5rem"
            }}
          >
            <Clock size={16} /> Shifts
          </button>
        </div>

        <div>
          {activeTab === "departments" && <DepartmentsDashboard />}
          {activeTab === "shifts" && <ShiftDefinitionsDashboard />}
          {activeTab === "locations" && <div style={{ padding: "3rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>Locations management module under development.</div>}
        </div>
      </div>
    </div>
  );
}
