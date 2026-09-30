import { TrendingUp, AlertCircle, TrendingDown, Clock, FileCheck } from "lucide-react";

interface DashboardMetricsProps {
  totalSpend: number;
  spendVsLastMonthPercent: number;
  pendingOrdersCount: number;
  urgentOrdersCount: number;
  avgProcessingDays: string;
  expectedOutflow: number;
  outflowVsAvgPercent: number;
  lowStockItemsCount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export function DashboardMetrics({ totalSpend, spendVsLastMonthPercent, pendingOrdersCount, urgentOrdersCount, avgProcessingDays, expectedOutflow, outflowVsAvgPercent, lowStockItemsCount }: DashboardMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
      <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
        <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Total Spend (MTD)</h3>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{formatCurrency(totalSpend)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: spendVsLastMonthPercent <= 0 ? 'var(--success-color, green)' : 'var(--danger-color, red)' }}>
          {spendVsLastMonthPercent <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          <span>{spendVsLastMonthPercent > 0 ? '+' : ''}{spendVsLastMonthPercent.toFixed(1)}% vs last month</span>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
        <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Pending Orders</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{pendingOrdersCount}</div>
          {urgentOrdersCount > 0 && (
            <span style={{ backgroundColor: '#fff3e0', color: '#e65100', padding: '0.125rem 0.375rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 'bold' }}>{urgentOrdersCount} Urgent</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          <span>Avg. processing: {avgProcessingDays} days</span>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
        <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Expected Outflow (7 Days)</h3>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{formatCurrency(expectedOutflow)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: outflowVsAvgPercent <= 0 ? 'var(--success-color, green)' : 'var(--danger-color, red)' }}>
          {outflowVsAvgPercent <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          <span>{outflowVsAvgPercent > 0 ? '+' : ''}{outflowVsAvgPercent.toFixed(1)}% vs avg</span>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
        <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Low-Stock Alerts</h3>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem', color: lowStockItemsCount > 0 ? 'var(--danger-color, red)' : 'var(--text-muted)' }}>{lowStockItemsCount} Items</div>
        {lowStockItemsCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--danger-color, red)' }}>
            <AlertCircle size={12} />
            <span>Action required immediately</span>
          </div>
        )}
        {lowStockItemsCount === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--success-color, green)' }}>
            <FileCheck size={12} />
            <span>Stock levels optimal</span>
          </div>
        )}
      </div>
    </div>
  );
}
