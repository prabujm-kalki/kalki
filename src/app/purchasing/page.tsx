import { DashboardMetrics } from "@/components/purchasing/DashboardMetrics";
import { DashboardCharts } from "@/components/purchasing/DashboardCharts";
import { DashboardActions } from "@/components/purchasing/DashboardActions";
import { RecentActivityFeed } from "@/components/purchasing/RecentActivityFeed";
import { Search } from "lucide-react";
import { getDashboardData } from "@/domains/purchasing/dashboard";
import { requireAuthenticatedUser, loadAuthorizationGrants } from "@/lib/authorization";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function PurchasingDashboardPage(props: any) {
  const actor = await requireAuthenticatedUser(new Request("https://localhost", { headers: await headers() }));
  let isOwner = false;
  let userRoleIds: string[] = [];
  
  if (actor) {
    const grants = await loadAuthorizationGrants(actor.id);
    isOwner = grants.isOwner;
    
    // Quick load of user role IDs to see their queues
    const { db } = await import("@/db");
    const { locationRoleAssignments, organizationRoleAssignments } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const locRoles = await db.select({ roleId: locationRoleAssignments.roleId }).from(locationRoleAssignments).where(eq(locationRoleAssignments.userId, actor.id));
    const orgRoles = await db.select({ roleId: organizationRoleAssignments.roleId }).from(organizationRoleAssignments).where(eq(organizationRoleAssignments.userId, actor.id));
    userRoleIds = [...new Set([...locRoles.map(r => r.roleId), ...orgRoles.map(r => r.roleId)])];
  }

  const data = await getDashboardData(isOwner, actor?.id, userRoleIds);

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.15rem', marginBottom: '0.15rem' }}>Purchase Dashboard</h2>
          <p className="text-muted" style={{ fontSize: '0.7rem' }}>Kalki BOS / Purchase</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <input 
              type="text" 
              placeholder="Search items, vendors, or POs..." 
              style={{ padding: '0.35rem 1rem 0.35rem 2rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', width: '220px', fontSize: '0.8rem' }}
            />
          </div>
        </div>
      </div>

      <DashboardMetrics {...data.metrics} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <DashboardCharts {...data.charts} />
          <RecentActivityFeed activities={data.activities} />
        </div>
        <div>
          <DashboardActions pendingApprovals={data.pendingApprovals} />
        </div>
      </div>
    </div>
  );
}
