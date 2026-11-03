import React from "react";
import { AppShell } from "@/components/AppShell";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ActionRequiredBanner } from "@/components/ui/ActionRequiredBanner";
import { fetchGlobalPendingTasks } from "@/app/actions/pending-tasks";
import { fetchExecutiveCockpitPulse } from "@/app/actions/dashboard-pulse";
import { ExecutiveCockpitClient } from "@/components/dashboard/ExecutiveCockpitClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;
  
  const organizationId = params?.organizationId;
  const locationId = params?.locationId;
  const preset = params?.preset;
  const from = params?.from;
  const to = params?.to;

  // 1. Fetch urgent action tasks banner
  const pendingTasksRes = await fetchGlobalPendingTasks({ organizationId, locationId });
  const pendingTasks = pendingTasksRes.success ? pendingTasksRes.tasks : [];

  // 2. Fetch Executive Cockpit Pulse Data (with Date Presets)
  const pulseRes = await fetchExecutiveCockpitPulse({
    organizationId,
    locationId,
    preset,
    from,
    to,
  });
  const pulseData = pulseRes.success ? pulseRes.data : null;

  return (
    <AppShell>
      <div className="kalki-page" style={{ padding: "1.5rem" }}>
        {/* Urgent Operations & Approvals (Banner if present) */}
        {pendingTasks.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <ActionRequiredBanner initialTasks={pendingTasks} />
          </div>
        )}

        {/* Executive Cockpit Replacement */}
        {pulseData ? (
          <ExecutiveCockpitClient pulse={pulseData} />
        ) : (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            Unable to load dashboard metrics. Please select an active organization or branch.
          </div>
        )}
      </div>
    </AppShell>
  );
}
