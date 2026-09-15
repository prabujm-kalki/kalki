import { Edit, Package } from "lucide-react";

export interface Activity {
  id: string;
  type: string;
  entity: string;
  date: string;
  status: string;
  value: number;
}

interface RecentActivityFeedProps {
  activities: Activity[];
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved": return <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Approved</span>;
    case "pending":
    case "pending approval": return <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Pending</span>;
    case "received": return <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Received</span>;
    case "discrepancy": return <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>Discrepancy</span>;
    default: return <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: '500' }}>{status}</span>;
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Recent Activity Feed</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
            <option>Status: All</option>
          </select>
          <select style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
            <option>Last 7 Days</option>
          </select>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>ID / Ref</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Type</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Entity</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Date</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Value</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity, index) => (
            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '0.5rem 0.75rem' }}>{activity.id}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{activity.type}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{activity.entity}</td>
              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{activity.date}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{getStatusBadge(activity.status)}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>{formatCurrency(activity.value)}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button style={{ padding: '0.2rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', fontSize: '0.65rem', cursor: 'pointer' }}>View</button>
                  {activity.type === 'Purchase Order' ? (
                    <button style={{ padding: '0.2rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><Edit size={12}/></button>
                  ) : (
                    <button style={{ padding: '0.2rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', fontSize: '0.65rem', cursor: 'pointer' }}>Receive</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {activities.length === 0 && (
             <tr>
               <td colSpan={7} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No recent activity found.</td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
