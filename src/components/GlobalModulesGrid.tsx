"use client";

import React from "react";
import Link from "next/link";
import { useSessionView } from "@/components/AppShell";
import { useToast } from "@/components/ui/Toast";

interface ModuleConfig {
  name: string;
  path: string;
  description?: string;
}

const MODULES: ModuleConfig[] = [
  { name: "People", path: "/people" },
  { name: "Attendance", path: "/attendance" },
  { name: "Payroll", path: "/payroll" },
  { name: "Purchasing", path: "/purchasing" },
  { name: "Inventory", path: "/inventory" },
  { name: "CRM", path: "/crm" },
  { name: "Accounts", path: "/accounts" },
  { name: "Task Engine", path: "/tasks" },
  { name: "Settings", path: "/settings" },
];

export function GlobalModulesGrid() {
  const { selected } = useSessionView();
  const { addToast } = useToast();

  const handleDisabledClick = (e: React.MouseEvent, moduleName: string) => {
    if (!selected) {
      e.preventDefault();
      addToast({
        type: "warning",
        message: "Location Required",
        description: `Please select a location from the top navigation to access the ${moduleName} module.`
      });
    }
  };

  return (
    <div className="kalki-dashboard-grid" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {MODULES.map((mod) => {
        const hasLocation = Boolean(selected?.organizationId && selected?.locationId);
        const href = hasLocation
          ? `${mod.path}?organizationId=${selected!.organizationId}&locationId=${selected!.locationId}`
          : "#";

        return (
          <Link
            key={mod.path}
            href={href}
            onClick={(e) => handleDisabledClick(e, mod.name)}
            className="panel"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textDecoration: "none",
              color: hasLocation ? "inherit" : "#94a3b8",
              backgroundColor: hasLocation ? "var(--color-surface, #ffffff)" : "#f8fafc",
              border: hasLocation ? "1px solid var(--color-border, #e2e8f0)" : "1px dashed #cbd5e1",
              padding: "1rem",
              borderRadius: "8px",
              cursor: hasLocation ? "pointer" : "not-allowed",
              transition: "all 0.15s ease-in-out",
              opacity: hasLocation ? 1 : 0.75,
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
                {mod.name}
              </h2>
              {!hasLocation && (
                <span style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: 500 }}>
                  Select location in top bar
                </span>
              )}
            </div>
            <span style={{ color: hasLocation ? "var(--color-text-muted)" : "#cbd5e1" }}>
              {hasLocation ? "→" : "🔒"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
