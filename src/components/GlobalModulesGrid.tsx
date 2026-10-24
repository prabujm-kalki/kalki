"use client";

import React from "react";
import Link from "next/link";
import { useSessionView } from "@/components/AppShell";
import { useToast } from "@/components/ui/Toast";
import { APP_MODULES } from "@/lib/modules";
import {
  Users,
  CalendarCheck,
  CreditCard,
  ShoppingCart,
  Boxes,
  TrendingUp,
  Megaphone,
  UserCheck,
  Sparkles,
  Landmark,
  ListTodo,
  Settings,
  HelpCircle,
} from "lucide-react";

interface ModuleVisual {
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const MODULE_VISUALS: Record<string, ModuleVisual> = {
  employee: {
    icon: <Users size={22} />,
    color: "#2563eb",
    bg: "#eff6ff",
  },
  attendance: {
    icon: <CalendarCheck size={22} />,
    color: "#059669",
    bg: "#ecfdf5",
  },
  payroll: {
    icon: <CreditCard size={22} />,
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  purchasing: {
    icon: <ShoppingCart size={22} />,
    color: "#c2410c",
    bg: "#fff7ed",
  },
  inventory: {
    icon: <Boxes size={22} />,
    color: "#d97706",
    bg: "#fffbeb",
  },
  sales: {
    icon: <TrendingUp size={22} />,
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  marketing: {
    icon: <Megaphone size={22} />,
    color: "#db2777",
    bg: "#fdf2f8",
  },
  crm: {
    icon: <UserCheck size={22} />,
    color: "#0891b2",
    bg: "#ecfeff",
  },
  events: {
    icon: <Sparkles size={22} />,
    color: "#e11d48",
    bg: "#fff1f2",
  },
  finance: {
    icon: <Landmark size={22} />,
    color: "#4f46e5",
    bg: "#eef2ff",
  },
  tasks: {
    icon: <ListTodo size={22} />,
    color: "#0284c7",
    bg: "#f0f9ff",
  },
  settings: {
    icon: <Settings size={22} />,
    color: "#475569",
    bg: "#f1f5f9",
  },
};

export function GlobalModulesGrid() {
  const { session, selected } = useSessionView();
  const { addToast } = useToast();

  // Filter modules strictly based on user's authorized permissions for current scope
  // Exclude Dashboard (since we're already on it)
  const accessibleModules = APP_MODULES.filter((m) => {
    if (m.path === "/") return false;
    if (session.isOwner) return true;
    if (!selected) return false;
    return selected.permissions.some(
      (p) => p.startsWith(`${m.module}.`) || p.startsWith(`${m.module}:`)
    );
  });

  const handleDisabledClick = (e: React.MouseEvent, moduleName: string) => {
    if (!selected) {
      e.preventDefault();
      addToast({
        type: "warning",
        message: "Location Required",
        description: `Please select an organization location from the top navigation to access ${moduleName}.`,
      });
    }
  };

  if (accessibleModules.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px dashed #cbd5e1",
          color: "#64748b",
        }}
      >
        <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#334155" }}>
          No Authorized Modules
        </p>
        <p style={{ margin: 0, fontSize: "0.85rem" }}>
          You do not have access permissions assigned for this location.
        </p>
      </div>
    );
  }

  return (
    <div className="kalki-modules-app-grid">
      {accessibleModules.map((mod) => {
        const visual = MODULE_VISUALS[mod.module] || {
          icon: <HelpCircle size={22} />,
          color: "#475569",
          bg: "#f1f5f9",
        };

        const hasLocation = Boolean(selected?.organizationId && selected?.locationId);
        const href = hasLocation
          ? `${mod.path}?organizationId=${selected!.organizationId}&locationId=${selected!.locationId}`
          : "#";

        return (
          <Link
            key={mod.path}
            href={href}
            onClick={(e) => handleDisabledClick(e, mod.label)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "1rem 0.75rem",
              textAlign: "center",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              cursor: hasLocation ? "pointer" : "not-allowed",
              position: "relative",
            }}
            onMouseOver={(e) => {
              if (hasLocation) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              }
            }}
            onMouseOut={(e) => {
              if (hasLocation) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
              }
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: visual.bg,
                color: visual.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.5rem",
              }}
            >
              {visual.icon}
            </div>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#1e293b",
                lineHeight: 1.2,
              }}
            >
              {mod.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
