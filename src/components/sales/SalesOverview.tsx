"use client";

import {
  ShoppingCart,
  FileText,
  Users,
  Clock,
  TrendingUp,
  IndianRupee,
  Undo2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useEffect, useState } from "react";
import { fetchSalesDashboardMetrics } from "@/app/sales/dashboard-actions";
import { useSessionView } from "@/components/AppShell";
import Link from "next/link";



import { useRouter } from 'next/navigation';

export function SalesOverview({ onNavigate }: { onNavigate?: (tab: 'dashboard' | 'billing' | 'config') => void }) {
  const router = useRouter();
  const { session, selected } = useSessionView();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'Last 7 Days' | 'Last 30 Days' | 'This Month' | 'Last Month' | 'Last 3 Months' | 'Last 6 Months' | 'Last 12 Months' | 'This Year'>('Last 30 Days');
  const [grouping, setGrouping] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalInvoices: 0,
    receivables: 0,
    overdue: 0,
    avgOrderValue: 0,
    recentSales: [] as any[],
    topCustomers: [] as any[],
    trendData: [] as any[],
    categoryData: [] as any[],
    deltas: { totalSales: 0, totalInvoices: 0, receivables: 0, overdue: 0, avgOrderValue: 0 }
  });

  useEffect(() => {
    if (!selected) return;
    setLoading(true);

    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    const setRanges = (daysOffset: number) => {
      startDate.setDate(today.getDate() - daysOffset);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysOffset);
    };

    if (dateRange === 'Last 7 Days') {
      setRanges(7);
      if(grouping === 'Monthly') setGrouping('Daily');
    } else if (dateRange === 'Last 30 Days') {
      setRanges(30);
    } else if (dateRange === 'Last 3 Months') {
      setRanges(90);
    } else if (dateRange === 'Last 6 Months') {
      setRanges(180);
    } else if (dateRange === 'Last 12 Months') {
      setRanges(365);
      if(grouping === 'Daily') setGrouping('Monthly');
    } else if (dateRange === 'This Month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(0);
      prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
    } else if (dateRange === 'Last Month') {
      endDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of prev month
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(0);
      prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
    } else if (dateRange === 'This Year') {
      startDate = new Date(today.getFullYear(), 0, 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(0);
      prevStartDate = new Date(prevEndDate.getFullYear(), 0, 1);
      if(grouping === 'Daily') setGrouping('Monthly');
    }

    fetchSalesDashboardMetrics(selected.organizationId, selected.locationId, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      prevStartDate: prevStartDate.toISOString().split('T')[0],
      prevEndDate: prevEndDate.toISOString().split('T')[0],
      viewType: grouping
    }).then((res) => {
      if (res.success && res.data) {
        setMetrics({ ...metrics, ...res.data });
      }
      setLoading(false);
    });
  }, [selected, dateRange, grouping]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const DeltaBadge = ({ delta }: { delta: number }) => {
    if (delta === 0) return null;
    const isPositive = delta > 0;
    const color = isPositive ? "#16a34a" : "#dc2626";
    const bg = isPositive ? "#dcfce7" : "#fee2e2";
    return (
      <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "10px", backgroundColor: bg, color: color, fontWeight: "600", marginLeft: "8px" }}>
        {isPositive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "64px", color: "#64748b" }}>
        <RefreshCw className="lucide-spin" size={32} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "100%", padding: "1.5rem", boxSizing: "border-box", margin: "0 auto" }}>
      {/* Dashboard Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "-0.5rem" }}>
        <select 
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          style={{ padding: "0.4rem 0.8rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", fontSize: "0.875rem", fontWeight: "500", color: "#374151", cursor: "pointer", outline: "none", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
        >
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>This Month</option>
          <option>Last Month</option>
          <option>Last 3 Months</option>
          <option>Last 6 Months</option>
          <option>Last 12 Months</option>
          <option>This Year</option>
        </select>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", width: "100%" }}>
        {/* Card 1 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
            <ShoppingCart size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Sales</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold", display: "flex", alignItems: "center" }}>
              {formatCurrency(metrics.totalSales)}
              {metrics.deltas && <DeltaBadge delta={metrics.deltas.totalSales} />}
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Invoices</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold", display: "flex", alignItems: "center" }}>
              {metrics.totalInvoices}
              {metrics.deltas && <DeltaBadge delta={metrics.deltas.totalInvoices} />}
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div 
          className="card" 
          style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", transition: "all 0.2s" }}
          onClick={() => router.push(`/finance/sales-receivables/summary?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#ffedd5", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Receivables</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold", display: "flex", alignItems: "center" }}>
              {formatCurrency(metrics.receivables)}
              {metrics.deltas && <DeltaBadge delta={metrics.deltas.receivables} />}
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div 
          className="card" 
          style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", transition: "all 0.2s" }}
          onClick={() => router.push(`/finance/sales-receivables/summary?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Overdue</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#dc2626", display: "flex", alignItems: "center" }}>
              {formatCurrency(metrics.overdue)}
              {metrics.deltas && <DeltaBadge delta={metrics.deltas.overdue} />}
            </div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#f3e8fd", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea" }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Avg Order Value</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold", display: "flex", alignItems: "center" }}>
              {formatCurrency(metrics.avgOrderValue)}
              {metrics.deltas && <DeltaBadge delta={metrics.deltas.avgOrderValue} />}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", width: "100%" }}>
        {/* Trend Chart */}
        <div className="card" style={{ flex: "2 1 500px", padding: "1.5rem", borderRadius: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Sales Trend</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(['Daily', 'Weekly', 'Monthly'] as const).map(type => (
                <button 
                  key={type}
                  onClick={() => setGrouping(type)}
                  style={{ 
                    backgroundColor: 'transparent', border: 'none',
                    fontSize: "0.75rem", padding: "0.2rem 0.5rem", 
                    borderRadius: "0.375rem", cursor: "pointer",
                    ...(grouping === type 
                      ? { backgroundColor: "#eff6ff", color: "#2563eb", fontWeight: "bold" }
                      : { border: "1px solid #e5e7eb", color: "#6b7280" })
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: "220px", width: "100%" }}>
            {metrics.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={metrics.trendData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(val) => val === 0 ? "0" : `${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [name === "sales" ? formatCurrency(value) : value, name === "sales" ? "Sales" : "Orders"]}
                    labelStyle={{ color: "#374151", fontWeight: "bold", marginBottom: "0.25rem", fontSize: "11px" }}
                    contentStyle={{ borderRadius: "0.5rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "11px" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} formatter={(value) => <span style={{ color: "#374151" }}>{value === "sales" ? "Sales" : "No. of Orders"}</span>}/>
                  <Bar yAxisId="left" dataKey="sales" barSize={24} fill="#7cb3ff" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>
                No trend data for this period
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card" style={{ flex: "1 1 300px", padding: "1.5rem", borderRadius: "0.5rem", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>Sales by Category</h3>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ height: "150px", width: "100%", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.totalSales === 0 ? [{ value: 1, color: "#f3f4f6" }] : metrics.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {(metrics.totalSales === 0 ? [{ value: 1, color: "#f3f4f6" }] : metrics.categoryData).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  {metrics.totalSales > 0 && <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: "0.5rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "11px" }} />}
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#1f2937" }}>
                  {metrics.totalSales > 0 ? formatCurrency(metrics.totalSales) : "0"}
                </div>
                <div style={{ fontSize: "0.65rem", color: "#6b7280" }}>Total Sales</div>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {metrics.totalSales > 0 && metrics.categoryData.map((cat: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: cat.color }}></div>
                    <span style={{ color: "#374151" }}>{cat.name}</span>
                  </div>
                  <span style={{ fontWeight: "500", color: "#1f2937" }}>
                    {Math.round((cat.value / metrics.totalSales) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", width: "100%" }}>
        <Link 
          href={`/sales/orders?organizationId=${selected?.organizationId}&locationId=${selected?.locationId}`}
          className="card hover:shadow-md transition-shadow" 
          style={{ textDecoration: "none", padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#f0fdf4", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <ShoppingCart size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#166534", fontSize: "0.875rem" }}>New POS Sale</div>
            <div style={{ fontSize: "0.65rem", color: "#166534", opacity: 0.8 }}>Open Cashier</div>
          </div>
        </Link>

        <Link 
          href={`/sales/invoices?organizationId=${selected?.organizationId}&locationId=${selected?.locationId}`}
          className="card hover:shadow-md transition-shadow" 
          style={{ textDecoration: "none", padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#eff6ff", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <FileText size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#1e40af", fontSize: "0.875rem" }}>Create Invoice</div>
            <div style={{ fontSize: "0.65rem", color: "#1e40af", opacity: 0.8 }}>Customer Invoice</div>
          </div>
        </Link>

        <Link 
          href={`/sales/invoices?organizationId=${selected?.organizationId}&locationId=${selected?.locationId}`}
          className="card hover:shadow-md transition-shadow" 
          style={{ textDecoration: "none", padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#f5f3ff", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <IndianRupee size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#5b21b6", fontSize: "0.875rem" }}>Record Receipt</div>
            <div style={{ fontSize: "0.65rem", color: "#5b21b6", opacity: 0.8 }}>Customer Payment</div>
          </div>
        </Link>

        <Link 
          href={`/sales/returns/credit-notes?organizationId=${selected?.organizationId}&locationId=${selected?.locationId}`}
          className="card hover:shadow-md transition-shadow" 
          style={{ textDecoration: "none", padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#faf5ff", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <Undo2 size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#6b21a8", fontSize: "0.875rem" }}>Credit Note</div>
            <div style={{ fontSize: "0.65rem", color: "#6b21a8", opacity: 0.8 }}>Refund / Return</div>
          </div>
        </Link>
      </div>

      {/* Tables Row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", width: "100%" }}>
        {/* Recent Sales Table */}
        <div className="card" style={{ flex: "1.5 1 400px", padding: "1.5rem", borderRadius: "0.5rem", overflowY: 'auto' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Recent Sales</h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", color: "#6b7280", textAlign: "left" }}>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>#</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Date</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Customer</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Type</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Amount</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentSales.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                    No recent sales data found.
                  </td>
                </tr>
              )}
              {metrics.recentSales.map((sale: any, i: number) => (
                <tr key={i} style={{ borderBottom: i !== metrics.recentSales.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <td style={{ padding: "0.75rem 0", color: "#2563eb" }}>{sale.id}</td>
                  <td style={{ padding: "0.75rem 0", color: "#374151" }}>{sale.date}</td>
                  <td style={{ padding: "0.75rem 0", color: "#374151" }}>{sale.customer}</td>
                  <td style={{ padding: "0.75rem 0", color: "#6b7280" }}>{sale.type}</td>
                  <td style={{ padding: "0.75rem 0", color: "#374151" }}>₹ {sale.amount}</td>
                  <td style={{ padding: "0.75rem 0" }}>
                    <span style={{
                      padding: "0.2rem 0.4rem",
                      borderRadius: "9999px",
                      fontSize: "0.65rem",
                      fontWeight: "500",
                      backgroundColor: sale.status === "Paid" ? "#dcfce7" : sale.status === "Unpaid" ? "#fee2e2" : "#ffedd5",
                      color: sale.status === "Paid" ? "#166534" : sale.status === "Unpaid" ? "#991b1b" : "#9a3412"
                    }}>
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Customers Table */}
        <div className="card" style={{ flex: "1 1 300px", padding: "1.5rem", borderRadius: "0.5rem", overflowY: 'auto' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Top Customers</h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", color: "#6b7280", textAlign: "left" }}>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Customer</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500", textAlign: "right" }}>Sales Amount</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500", textAlign: "right" }}>Orders</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topCustomers.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                    No customer data found.
                  </td>
                </tr>
              )}
              {metrics.topCustomers.map((cust: any, i: number) => (
                <tr key={i} style={{ borderBottom: i !== metrics.topCustomers.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <td style={{ padding: "0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: cust.bg, color: cust.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "600" }}>
                      {cust.initials}
                    </div>
                    <span style={{ color: "#374151", maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cust.name}</span>
                  </td>
                  <td style={{ padding: "0.5rem 0", color: "#374151", textAlign: "right" }}>₹ {cust.amount}</td>
                  <td style={{ padding: "0.5rem 0", color: "#6b7280", textAlign: "right" }}>{cust.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
