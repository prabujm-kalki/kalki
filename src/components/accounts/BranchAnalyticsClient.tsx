"use client";

import React from "react";
import { useSessionView } from "@/components/AppShell";
import { BranchComparisonCockpit } from "@/components/purchasing/BranchComparisonCockpit";
import { SlidersHorizontal, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BranchAnalyticsClientProps {
  initialOrgId?: string;
}

export function BranchAnalyticsClient({ initialOrgId }: BranchAnalyticsClientProps) {
  const { selected } = useSessionView();
  const organizationId = initialOrgId || selected?.organizationId;

  if (!organizationId) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
        Loading Organization Scope...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href="/finance"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "#64748b",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} /> Finance
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700 }}>Branch Intelligence</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: "4px 0 0 0" }}>
            Multi-Branch Comparison & Unit Economics
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
            Executive cross-branch analysis across Sales, Food Cost %, Labor %, and Operational Margins.
          </p>
        </div>
      </div>

      <BranchComparisonCockpit organizationId={organizationId} />
    </div>
  );
}
