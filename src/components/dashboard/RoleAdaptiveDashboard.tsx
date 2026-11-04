"use client";

import React, { useState } from "react";
import { ExecutiveCockpitPulse } from "@/domains/dashboard/types";
import { EmployeeDashboardPulse } from "@/app/actions/employee-personal-pulse";
import { ExecutiveCockpitClient } from "@/components/dashboard/ExecutiveCockpitClient";
import { EmployeeDailyHubClient } from "@/components/dashboard/EmployeeDailyHubClient";
import { Building2, User } from "lucide-react";

interface RoleAdaptiveDashboardProps {
  initialMode: "executive" | "personal";
  canSwitchMode: boolean;
  executivePulse?: ExecutiveCockpitPulse | null;
  personalPulse?: EmployeeDashboardPulse | null;
  organizationId: string;
  locationId: string;
}

export function RoleAdaptiveDashboard({
  initialMode,
  canSwitchMode,
  executivePulse,
  personalPulse,
  organizationId,
  locationId,
}: RoleAdaptiveDashboardProps) {
  const [viewMode, setViewMode] = useState<"executive" | "personal">(initialMode);

  return (
    <div>
      {/* View Switcher Header Bar for Owners & Managers */}
      {canSwitchMode && personalPulse && executivePulse && (
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: "1rem"
        }}>
          <div style={{
            background: "#ffffff",
            padding: "3px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            display: "inline-flex",
            gap: "2px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
          }}>
            <button
              onClick={() => setViewMode("executive")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                background: viewMode === "executive" ? "#0f172a" : "transparent",
                color: viewMode === "executive" ? "#ffffff" : "#64748b",
                transition: "all 0.15s ease"
              }}
            >
              <Building2 size={14} /> Executive Cockpit
            </button>

            <button
              onClick={() => setViewMode("personal")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                background: viewMode === "personal" ? "#0f172a" : "transparent",
                color: viewMode === "personal" ? "#ffffff" : "#64748b",
                transition: "all 0.15s ease"
              }}
            >
              <User size={14} /> My Workspace
            </button>
          </div>
        </div>
      )}

      {/* Render View Mode */}
      {viewMode === "personal" && personalPulse ? (
        <EmployeeDailyHubClient
          pulse={personalPulse}
          organizationId={organizationId}
          locationId={locationId}
          isExecutive={canSwitchMode}
          onSwitchToExecutive={() => setViewMode("executive")}
        />
      ) : executivePulse ? (
        <ExecutiveCockpitClient pulse={executivePulse} />
      ) : personalPulse ? (
        <EmployeeDailyHubClient
          pulse={personalPulse}
          organizationId={organizationId}
          locationId={locationId}
        />
      ) : (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
          Unable to load dashboard metrics. Please select an active organization or branch.
        </div>
      )}
    </div>
  );
}
