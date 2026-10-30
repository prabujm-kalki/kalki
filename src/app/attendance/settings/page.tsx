import { LeaveConfigForm } from "./LeaveConfigForm";
import { AttendanceKioskConfig } from "./AttendanceKioskConfig";
import { getLeaveConfigs, getAttendanceSettings } from "@/domains/attendance/actions";
import { db } from "@/db";
import { businessRoles, departments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/domains/session/service";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return redirect("/login");

  const context = await getSessionContext(session.user);
  if (!context.scopes.length) return redirect("/settings");

  const params = await searchParams;
  let scope = context.scopes.find(
    s => s.organizationId === params.organizationId && s.locationId === params.locationId
  );
  if (!scope) {
    scope = context.scopes[0];
  }

  const organizationId = params.organizationId || scope.organizationId;
  const locationId = params.locationId || scope.locationId;

  if (!organizationId || !locationId) {
    return <div>Missing organization or location context.</div>;
  }

  const [configs, kioskSettings] = await Promise.all([
    getLeaveConfigs(organizationId, locationId),
    getAttendanceSettings(organizationId, locationId),
  ]);
  
  // Fetch active business roles and departments in parallel
  const [roles, depts] = await Promise.all([
    db
      .select({
        id: businessRoles.id,
        name: businessRoles.name,
      })
      .from(businessRoles)
      .where(
        and(
          eq(businessRoles.organizationId, organizationId),
          eq(businessRoles.isActive, true)
        )
      ),
    db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
      })
      .from(departments)
      .where(
        and(
          eq(departments.organizationId, organizationId),
          eq(departments.isActive, true)
        )
      )
  ]);
  
  // Serialize complex dates to pass to Client Component safely
  const serializedConfigs = configs.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString()
  }));

  return (
    <div className="space-y-8">
      <header className="att-header">
        <h1 className="att-title">Configuration</h1>
        <p className="att-subtitle">Define shift policies and dynamic leave types.</p>
      </header>

      <AttendanceKioskConfig
        organizationId={organizationId}
        locationId={locationId}
        initialRequireWallMarker={kioskSettings.requireWallMarker}
      />

      <div>
        <LeaveConfigForm initialConfigs={serializedConfigs} orgId={organizationId} locId={locationId} roles={roles} initialDepartments={depts} />
      </div>
    </div>
  );
}
