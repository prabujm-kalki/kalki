"use client";

import React, { useState, useTransition } from "react";
import { upsertSalesAlertConfig } from "./actions";
import type { SalesAlertConfigPayload } from "./types";
import { ShieldAlert, TrendingUp, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useSessionView } from "@/components/AppShell";

interface SalesAlertConfigClientProps {
  initialConfig: {
    id?: string;
    organizationId: string;
    locationId?: string | null;
    debtorDaysOverdue: number;
    newVipMinSpend: number;
    anomalyAovMultiplier: number;
    dormantVipDays: number;
    upsellDeficitDropPercentage: number;
    concentrationTopCustomersCount: number;
  };
}

export function SalesAlertConfigClient({ initialConfig }: SalesAlertConfigClientProps) {
  const { selected } = useSessionView();
  const effectiveOrgId = initialConfig.organizationId || selected?.organizationId || "";
  const effectiveLocId = initialConfig.locationId || selected?.locationId || null;

  const [formData, setFormData] = useState({
    debtorDaysOverdue: initialConfig.debtorDaysOverdue,
    newVipMinSpend: initialConfig.newVipMinSpend,
    anomalyAovMultiplier: initialConfig.anomalyAovMultiplier,
    dormantVipDays: initialConfig.dormantVipDays,
    upsellDeficitDropPercentage: initialConfig.upsellDeficitDropPercentage,
    concentrationTopCustomersCount: initialConfig.concentrationTopCustomersCount,
  });

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!effectiveOrgId) {
      setFeedback({ type: "error", message: "Please select an organization from the top bar before saving." });
      return;
    }

    startTransition(async () => {
      try {
        const payload: SalesAlertConfigPayload = {
          organizationId: effectiveOrgId,
          locationId: effectiveLocId,
          debtorDaysOverdue: Number(formData.debtorDaysOverdue),
          newVipMinSpend: Number(formData.newVipMinSpend),
          anomalyAovMultiplier: Number(formData.anomalyAovMultiplier),
          dormantVipDays: Number(formData.dormantVipDays),
          upsellDeficitDropPercentage: Number(formData.upsellDeficitDropPercentage),
          concentrationTopCustomersCount: Number(formData.concentrationTopCustomersCount),
        };

        const result = await upsertSalesAlertConfig(payload);
        if (result.success) {
          setFeedback({ type: "success", message: "Intelligence rules successfully saved and active!" });
        }
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message || "Failed to update configuration." });
      }
    });
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === "" ? "" : Number(value),
    }));
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {feedback && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 500,
            backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: feedback.type === "success" ? "#065f46" : "#991b1b",
          }}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={18} color="#059669" />
          ) : (
            <AlertCircle size={18} color="#dc2626" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: Credit Risk Rules */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <ShieldAlert size={18} color="#dc2626" />
          <div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
              Credit Risk & Debtor Rules
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Controls thresholds for credit exposure warnings and delinquent customer notifications.
            </p>
          </div>
        </div>

        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div>
            <label
              htmlFor="debtorDaysOverdue"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
            >
              Debtor Days Overdue Threshold (Days)
            </label>
            <input
              id="debtorDaysOverdue"
              type="number"
              min={1}
              max={365}
              required
              value={formData.debtorDaysOverdue}
              onChange={(e) => handleChange("debtorDaysOverdue", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Customers with unpaid balances past this number of days will be flagged as Critical Debtors.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Growth & VIP Rules */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <TrendingUp size={18} color="#0284c7" />
          <div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
              Growth & VIP Acquisition Rules
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Thresholds for identifying high-value first-time spenders and volume spend anomalies.
            </p>
          </div>
        </div>

        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div>
            <label
              htmlFor="newVipMinSpend"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
            >
              New VIP Minimum Spend Requirement (₹)
            </label>
            <input
              id="newVipMinSpend"
              type="number"
              min={100}
              step={100}
              required
              value={formData.newVipMinSpend}
              onChange={(e) => handleChange("newVipMinSpend", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              First-time buyers spending at or above this amount in the cycle are classified as New VIP acquisitions.
            </p>
          </div>

          <div>
            <label
              htmlFor="anomalyAovMultiplier"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
            >
              Spend Anomaly AOV Multiplier (x)
            </label>
            <input
              id="anomalyAovMultiplier"
              type="number"
              min={1.1}
              max={20.0}
              step={0.1}
              required
              value={formData.anomalyAovMultiplier}
              onChange={(e) => handleChange("anomalyAovMultiplier", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Orders with an AOV higher than this multiplier times the store average trigger spend anomaly alerts.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Retention & Revenue Concentration */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Users size={18} color="#7c3aed" />
          <div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
              Retention & Concentration Rules
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Define criteria for dormant account re-engagement, upsell drop alerts, and top revenue concentration.
            </p>
          </div>
        </div>

        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div>
            <label
              htmlFor="dormantVipDays"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
            >
              Dormant VIP Inactivity Cutoff (Days)
            </label>
            <input
              id="dormantVipDays"
              type="number"
              min={7}
              max={730}
              required
              value={formData.dormantVipDays}
              onChange={(e) => handleChange("dormantVipDays", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              High-value customers with no orders in this many days will appear in the Retention Risk re-engagement alert.
            </p>
          </div>

          <div>
            <label
              htmlFor="upsellDeficitDropPercentage"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
            >
              Upsell Deficit Drop Cutoff (%)
            </label>
            <input
              id="upsellDeficitDropPercentage"
              type="number"
              min={0.1}
              max={100}
              step={0.5}
              required
              value={formData.upsellDeficitDropPercentage}
              onChange={(e) => handleChange("upsellDeficitDropPercentage", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Identifies repeat buyers whose individual basket size dropped below this percentage of their historical AOV.
            </p>
          </div>

          <div>
            <label
              htmlFor="concentrationTopCustomersCount"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
            >
              Top Customers Count for Concentration Risk
            </label>
            <input
              id="concentrationTopCustomersCount"
              type="number"
              min={1}
              max={100}
              required
              value={formData.concentrationTopCustomersCount}
              onChange={(e) => handleChange("concentrationTopCustomersCount", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "320px",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Number of top spending accounts evaluated to measure enterprise revenue dependency risk.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: isPending ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            padding: "10px 24px",
            fontSize: "0.875rem",
            fontWeight: 600,
            borderRadius: "6px",
            border: "none",
            cursor: isPending ? "not-allowed" : "pointer",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            transition: "all 0.15s ease-in-out",
          }}
        >
          {isPending ? "Saving..." : "Save Intelligence Rules"}
        </button>
      </div>
    </form>
  );
}
