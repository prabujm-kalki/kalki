import { LeaveConfigForm } from "./LeaveConfigForm";
import { getLeaveConfigs } from "@/domains/attendance/actions";
import { db } from "@/db";
import { businessRoles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const organizationId = params.organizationId;
  const locationId = params.locationId;

  if (!organizationId || !locationId) {
    return <div>Missing organization or location context.</div>;
  }

  const configs = await getLeaveConfigs(organizationId, locationId);
  
  // Fetch roles
  const roles = await db
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
    );
  
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

      <div>
        <LeaveConfigForm initialConfigs={serializedConfigs} orgId={organizationId} locId={locationId} roles={roles} />
      </div>
    </div>
  );
}
