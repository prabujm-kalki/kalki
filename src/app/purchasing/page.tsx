import { DashboardMetrics } from "@/components/purchasing/DashboardMetrics";
import { DashboardCharts } from "@/components/purchasing/DashboardCharts";
import { DashboardActions } from "@/components/purchasing/DashboardActions";
import { RecentActivityFeed } from "@/components/purchasing/RecentActivityFeed";
import { Search } from "lucide-react";
import { getDashboardData } from "@/domains/purchasing/dashboard";

export const dynamic = 'force-dynamic';

export default async function PurchasingDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Purchase Dashboard</h2>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>Kalki BOS / Purchase</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <input 
              type="text" 
              placeholder="Search items, vendors, or POs..." 
              style={{ padding: '0.4rem 1rem 0.4rem 2.25rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', width: '250px', fontSize: '0.875rem' }}
            />
          </div>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
            + Create New Purchase Order
          </button>
        </div>
      </div>

      <DashboardMetrics {...data.metrics} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
