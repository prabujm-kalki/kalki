"use client";

import { useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { DepartmentsDashboard } from "./DepartmentsDashboard";
import { ShiftDefinitionsDashboard } from "./ShiftDefinitionsDashboard";
import { SalaryComponentsDashboard } from "./SalaryComponentsDashboard";
import { LocationsDashboard } from "./LocationsDashboard";
import { PricingTiersDashboard } from "./PricingTiersDashboard";
import { Database, MapPin, Users, Clock, Banknote, Tag } from "lucide-react";

export function MasterDataDashboard() {
  const { selected } = useSessionView();
  const [activeTab, setActiveTab] = useState<"locations" | "departments" | "shifts" | "salary" | "pricing">("departments");

  if (!selected) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Please select an organization.</div>;
  }

  return (
    <>
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

        {/* Kalki Standard Sub-Navigation Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.75rem", paddingBottom: "2px" }}>
          {[
            { id: "departments", label: "Departments", icon: <Users size={16} /> },
            { id: "shifts", label: "Shifts", icon: <Clock size={16} /> },
            { id: "salary", label: "Salary Components", icon: <Banknote size={16} /> },
            { id: "pricing", label: "Pricing Tiers", icon: <Tag size={16} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{ 
                  padding: "0.625rem 1.125rem", 
                  background: isActive ? "#eff6ff" : "none", 
                  border: "none",
                  borderRadius: "8px 8px 0 0",
                  borderBottom: isActive ? "2px solid var(--kalki-primary, #2563eb)" : "2px solid transparent",
                  color: isActive ? "var(--kalki-primary, #2563eb)" : "#64748b",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.5rem",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === "departments" && <DepartmentsDashboard />}
          {activeTab === "shifts" && <ShiftDefinitionsDashboard />}
          {activeTab === "salary" && <SalaryComponentsDashboard />}
          {activeTab === "pricing" && <PricingTiersDashboard orgId={selected.organizationId} />}
        </div>
    </>
  );
}
