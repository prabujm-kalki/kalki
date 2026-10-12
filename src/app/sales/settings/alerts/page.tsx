import React, { Suspense } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { getSalesAlertConfig } from "./actions";
import { SalesAlertConfigClient } from "./SalesAlertConfigClient";

export const dynamic = "force-dynamic";

export default async function SalesAlertSettingsPage(props: {
  searchParams?: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const organizationId = searchParams?.organizationId || "";
  const locationId = searchParams?.locationId || null;

  const config = await getSalesAlertConfig(organizationId, locationId);

  return (
    <Suspense
      fallback={
        <div style={{ padding: "2rem" }}>
          <StatusMessage tone="loading">Loading configurations...</StatusMessage>
        </div>
      }
    >
      <div style={{ padding: "1.5rem 2rem", maxWidth: "1100px", width: "100%" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              margin: 0,
              color: "#1e293b",
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Sales Alert Configurations
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Configure organization and location-level thresholds that trigger real-time sales anomalies,
            VIP acquisitions, credit risks, and automated CRM marketing recommendations.
          </p>
        </div>

        <SalesAlertConfigClient
          initialConfig={{
            id: (config as any)?.id,
            organizationId,
            locationId,
            debtorDaysOverdue: config.debtorDaysOverdue,
            newVipMinSpend: config.newVipMinSpend,
            anomalyAovMultiplier: config.anomalyAovMultiplier,
            dormantVipDays: config.dormantVipDays,
            upsellDeficitDropPercentage: config.upsellDeficitDropPercentage,
            concentrationTopCustomersCount: config.concentrationTopCustomersCount,
          }}
        />
      </div>
    </Suspense>
  );
}
