import React from "react";
import { AppShell } from "@/components/AppShell";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ActionRequiredBanner } from "@/components/ui/ActionRequiredBanner";
import { fetchGlobalPendingTasks } from "@/app/actions/pending-tasks";
import { fetchExecutiveCockpitPulse } from "@/app/actions/dashboard-pulse";
import { fetchEmployeePersonalPulse } from "@/app/actions/employee-personal-pulse";
import { RoleAdaptiveDashboard } from "@/components/dashboard/RoleAdaptiveDashboard";

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

  // 1. Fetch personal employee pulse & role perimeter
  const personalRes = await fetchEmployeePersonalPulse({ organizationId, locationId });
  const isExecutive = personalRes.isExecutive;
  const personalData = personalRes.data || null;

  // 2. Fetch urgent action tasks banner (Only for executives or supervisors)
  let pendingTasks: any[] = [];
  if (isExecutive) {
    const pendingTasksRes = await fetchGlobalPendingTasks({ organizationId, locationId });
    pendingTasks = pendingTasksRes.success ? pendingTasksRes.tasks : [];
  }

  // 3. Fetch Executive Cockpit Pulse Data (Only when user has executive privileges)
  let pulseData = null;
  if (isExecutive) {
    const pulseRes = await fetchExecutiveCockpitPulse({
      organizationId,
      locationId,
      preset,
      from,
      to,
    });
    pulseData = pulseRes.success ? pulseRes.data : null;
  }

  // Initial mode: If user is executive, default to "executive" (unless they don't have executive data)
  // If user is field employee (like Papu Kumar), default to "personal"
  const initialMode = isExecutive && pulseData ? "executive" : "personal";

  return (
    <AppShell>
      <div className="kalki-page" style={{ padding: "1.5rem" }}>
        {/* Urgent Operations & Approvals (Banner if present for executives) */}
        {pendingTasks.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <ActionRequiredBanner initialTasks={pendingTasks} />
          </div>
        )}

        {/* Role & Perimeter Adaptive Dashboard */}
        <RoleAdaptiveDashboard
          initialMode={initialMode}
          canSwitchMode={isExecutive && Boolean(pulseData && personalData)}
          executivePulse={pulseData}
          personalPulse={personalData}
          organizationId={organizationId || ""}
          locationId={locationId || ""}
        />
      </div>
    </AppShell>
  );
}
