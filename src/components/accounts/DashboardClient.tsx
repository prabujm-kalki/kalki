"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, Landmark, TrendingUp, AlertCircle, FileText, 
  ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle2,
  Plus, Calendar, Clock, CreditCard, PieChart, Activity
} from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchAccountsDashboardMetrics } from "@/app/finance/dashboard-actions";
import { fetchLocations } from "@/app/finance/actions";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart as RePieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SubledgerReport } from "./SubledgerReport";

export function AccountsDashboardClient() {
  const { session, selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL");
  const [period, setPeriod] = useState<string>("THIS_MONTH");
  const [financialYear, setFinancialYear] = useState<string>("2026-27");
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [activeTrend, setActiveTrend] = useState<"OPERATING" | "GROSS">("OPERATING");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const activeSubledgerParam = searchParams.get('subledger');
  let activeSubledger = null;
  if (activeSubledgerParam === 'CUSTOMER_RECEIVABLE') {
    activeSubledger = { type: 'CUSTOMER_RECEIVABLE', title: 'Accounts Receivable' };
  } else if (activeSubledgerParam === 'VENDOR_PAYABLE') {
    activeSubledger = { type: 'VENDOR_PAYABLE', title: 'Accounts Payable' };
  }

  // Sync with global location selection
  useEffect(() => {
    if (selected?.locationId) {
      setSelectedLocationId(selected.locationId);
    } else {
      setSelectedLocationId("ALL");
    }
  }, [selected?.locationId]);

  useEffect(() => {
    if (!selected) return;
    fetchLocations(selected.organizationId).then(res => {
      if (res.success) setLocations(res.data as any[]);
    });
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    
    // Calculate dates based on period selection
    const today = new Date();
    let startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    let endDate = today.toISOString().split('T')[0];

    if (period === "LAST_MONTH") {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    } else if (period === "THIS_YEAR") {
      // Assuming April to March financial year for India context (Kalki BOS)
      const startYear = parseInt(financialYear.substring(0, 4));
      startDate = new Date(startYear, 3, 1).toISOString().split('T')[0];
      endDate = new Date(startYear + 1, 2, 31).toISOString().split('T')[0];
      // Limit to today if it's the current year
      if (endDate > today.toISOString().split('T')[0]) {
        endDate = today.toISOString().split('T')[0];
      }
    }

    fetchAccountsDashboardMetrics(selected.organizationId, selectedLocationId, { startDate, endDate })
      .then(res => {
        if (res.success) {
          setMetrics(res.data);
          setError(null);
        } else {
          setError(res.error || "Failed to load dashboard metrics.");
        }
        setLoading(false);
      });
  }, [selected, selectedLocationId, period, financialYear]);

  if (!selected) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Authentication or Context missing.
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Real trend data provided by backend aggregation
  const trendData = metrics?.trendData || [];

  const MetricCard = ({ title, value, type, isAsOf, link, comparisonPct, onClick }: any) => {
    const isPositive = comparisonPct !== undefined ? comparisonPct >= 0 : value >= 0;
    // Real comparison percentage
    const displayPct = comparisonPct !== undefined 
      ? `${comparisonPct > 0 ? '+' : ''}${comparisonPct.toFixed(1)}%` 
      : "--";
    
    const CardContent = (
      <div className="kalki-section-content" style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", margin: 0 }}>
            {title}
          </p>
          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: isAsOf ? "#f1f5f9" : "#eff6ff", color: isAsOf ? "#64748b" : "#3b82f6" }}>
            {isAsOf ? 'As of Today' : 'For Period'}
          </span>
        </div>
        <h3 style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 12px 0", color: "var(--kalki-text-primary)" }}>
          {formatCurrency(value)}
        </h3>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 500, color: type === 'neutral' ? '#64748b' : (isPositive ? "#16a34a" : "#dc2626") }}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} 
          {displayPct} vs prev. period
        </div>
      </div>
    );

    if (onClick) {
      return (
        <div onClick={onClick} className="kalki-section hover:border-blue-300 transition-colors cursor-pointer" style={{ textDecoration: 'none' }}>
          {CardContent}
        </div>
      );
    }

    const resolvedLink = link ? `${link}?organizationId=${selected.organizationId}&locationId=${selectedLocationId === 'ALL' ? selected.locationId : selectedLocationId}` : "#";

    return (
      <Link href={resolvedLink} className="kalki-section hover:border-blue-300 transition-colors cursor-pointer" style={{ textDecoration: 'none' }}>
        {CardContent}
      </Link>
    );
  };

  if (activeSubledger) {
    return (
      <div className="kalki-main-content" style={{ padding: 0 }}>
        <SubledgerReport 
          controlAccountType={activeSubledger.type}
          title={activeSubledger.title}
          periodFilter={
            period !== "ALL_TIME" && financialYear
              ? {
                  startDate: `${parseInt(financialYear.substring(0, 4))}-04-01`, 
                  endDate: `${parseInt(financialYear.substring(0, 4)) + 1}-03-31`
                }
              : undefined
          }
          onClose={() => router.push(pathname)}
        />
      </div>
    );
  }

  return (
    <div className="kalki-main-content">
      {/* 1. Top Header & Actions */}
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Landmark size={24} style={{ color: "var(--kalki-primary)" }} />
            Financial Cockpit
          </h1>
          <p className="kalki-page-description">MD/Owner Real-time Financial Health</p>
        </div>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          {/* Quick Actions */}
          <Link href={`/finance/sales-receivables/receipts?action=new&organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="kalki-button" style={{ background: "#fff", height: "32px", fontSize: "12px" }}><Plus size={14}/> Receipt</Link>
          <Link href={`/finance/purchases-payables/payments?action=new&organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="kalki-button" style={{ background: "#fff", height: "32px", fontSize: "12px" }}><Plus size={14}/> Payment</Link>
          <Link href={`/finance/banking?action=transfer&organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="kalki-button" style={{ background: "#fff", height: "32px", fontSize: "12px" }}><Plus size={14}/> Transfer</Link>
          <Link href={`/finance/accounting/journals?action=new&organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="kalki-button" style={{ background: "#fff", height: "32px", fontSize: "12px" }}><Plus size={14}/> Journal</Link>
          <div style={{ width: "1px", height: "24px", background: "#cbd5e1", margin: "0 8px" }}></div>
          
          {/* Filters */}
          <select value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)} className="kalki-select" style={{ height: "32px", fontSize: "12px" }}>
            <option value="ALL">All Branches</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="kalki-select" style={{ height: "32px", fontSize: "12px" }}>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="THIS_YEAR">Entire Fin. Year</option>
          </select>
          <select value={financialYear} onChange={e => setFinancialYear(e.target.value)} className="kalki-select" style={{ height: "32px", fontSize: "12px" }}>
            <option value="2026-27">FY 2026-27</option>
            <option value="2025-26">FY 2025-26</option>
          </select>
        </div>
      </div>

      {error && <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", marginBottom: "16px" }}>{error}</div>}

      {loading || !metrics ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px", color: "#64748b" }}>
          <RefreshCw className="lucide-spin" size={32} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 140px)" }}>
          
          {/* 2. The 7 Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "12px" }}>
            <MetricCard title="Cash & Bank" value={metrics.cashBalance} comparisonPct={metrics.comparisons?.cashBalancePct} type="positive" isAsOf={true} link="/finance/banking" />
            <MetricCard title="Receivables" value={metrics.receivablesBalance} comparisonPct={metrics.comparisons?.receivablesBalancePct} type="positive" isAsOf={true} onClick={() => router.push(`${pathname}?subledger=CUSTOMER_RECEIVABLE&organizationId=${selected.organizationId}&locationId=${selectedLocationId === 'ALL' ? selected.locationId : selectedLocationId}`)} />
            <MetricCard title="Payables" value={metrics.payablesBalance} comparisonPct={metrics.comparisons?.payablesBalancePct} type="negative" isAsOf={true} onClick={() => router.push(`${pathname}?subledger=VENDOR_PAYABLE&organizationId=${selected.organizationId}&locationId=${selectedLocationId === 'ALL' ? selected.locationId : selectedLocationId}`)} />
            <MetricCard title="Revenue" value={metrics.revenue} comparisonPct={metrics.comparisons?.revenuePct} type="positive" isAsOf={false} link="/finance/reports" />
            <MetricCard title="Expenses" value={metrics.operatingExpenses + metrics.cogs} comparisonPct={metrics.comparisons?.expensesPct} type="negative" isAsOf={false} link="/finance/reports" />
            <MetricCard title="Gross Profit" value={metrics.grossProfit} comparisonPct={metrics.comparisons?.grossProfitPct} type="positive" isAsOf={false} link="/finance/reports" />
            <MetricCard title="Operating Profit" value={metrics.operatingProfit} comparisonPct={metrics.comparisons?.operatingProfitPct} type="positive" isAsOf={false} link="/finance/reports" />
          </div>

          {/* 3. Main Body: Charts & Alerts */}
          <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
            {/* Charts Grid (Left Side - 75%) */}
            <div style={{ flex: "3", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "16px" }}>
              
              {/* Chart 1: Revenue vs Expense */}
              <div className="kalki-section" style={{ display: "flex", flexDirection: "column" }}>
                <div className="kalki-section-header" style={{ padding: "12px 16px" }}>
                  <div className="kalki-section-title" style={{ fontSize: "13px" }}><TrendingUp size={14}/> Revenue vs Expense</div>
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: "16px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(value) => `₹${value/1000}k`} />
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{fontSize: 11}} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Profit Trend */}
              <div className="kalki-section" style={{ display: "flex", flexDirection: "column" }}>
                <div className="kalki-section-header" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="kalki-section-title" style={{ fontSize: "13px" }}>
                    <Activity size={14}/> {activeTrend === "OPERATING" ? "Operating" : "Gross"} Profit Trend
                  </div>
                  <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "2px", borderRadius: "6px" }}>
                    <button 
                      onClick={() => setActiveTrend("OPERATING")}
                      style={{ 
                        border: "none", 
                        background: activeTrend === "OPERATING" ? "#fff" : "transparent",
                        color: activeTrend === "OPERATING" ? "#0f172a" : "#64748b",
                        padding: "4px 8px", 
                        fontSize: "11px", 
                        fontWeight: activeTrend === "OPERATING" ? 600 : 500,
                        borderRadius: "4px",
                        cursor: "pointer",
                        boxShadow: activeTrend === "OPERATING" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                      }}
                    >
                      Operating
                    </button>
                    <button 
                      onClick={() => setActiveTrend("GROSS")}
                      style={{ 
                        border: "none", 
                        background: activeTrend === "GROSS" ? "#fff" : "transparent",
                        color: activeTrend === "GROSS" ? "#0f172a" : "#64748b",
                        padding: "4px 8px", 
                        fontSize: "11px", 
                        fontWeight: activeTrend === "GROSS" ? 600 : 500,
                        borderRadius: "4px",
                        cursor: "pointer",
                        boxShadow: activeTrend === "GROSS" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                      }}
                    >
                      Gross
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: "16px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeTrend === "OPERATING" ? "#10b981" : "#3b82f6"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={activeTrend === "OPERATING" ? "#10b981" : "#3b82f6"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(value) => `₹${value/1000}k`} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey={activeTrend === "OPERATING" ? "profit" : "grossProfit"} 
                        stroke={activeTrend === "OPERATING" ? "#10b981" : "#3b82f6"} 
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Cash Flow Trend */}
              <div className="kalki-section" style={{ display: "flex", flexDirection: "column" }}>
                <div className="kalki-section-header" style={{ padding: "12px 16px" }}>
                  <div className="kalki-section-title" style={{ fontSize: "13px" }}><Wallet size={14}/> Net Cash Movement</div>
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: "16px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(value) => `₹${value/1000}k`} />
                      <Tooltip />
                      <Line type="monotone" dataKey="profit" stroke="#0ea5e9" strokeWidth={2} dot={{r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Expense Breakdown */}
              <div className="kalki-section" style={{ display: "flex", flexDirection: "column" }}>
                <div className="kalki-section-header" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
                  <div className="kalki-section-title" style={{ fontSize: "13px" }}><PieChart size={14}/> Top 5 Expenses</div>
                  <Link href={`/finance/reports?organizationId=${selected.organizationId}&locationId=${selectedLocationId === 'ALL' ? selected.locationId : selectedLocationId}`}>
                    <span style={{ fontSize: "11px", color: "#3b82f6", cursor: "pointer", fontWeight: 500 }}>View All</span>
                  </Link>
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={[{name: 'Payroll', value: 400}, {name: 'Rent', value: 300}, {name: 'Materials', value: 300}, {name: 'Utilities', value: 200}]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[...Array(4)].map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{fontSize: 11}} layout="vertical" verticalAlign="middle" align="right" />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Alerts Panel (Right Side - 25%) */}
            <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "12px", minHeight: 0 }}>
              <div className="kalki-section" style={{ flex: 1, background: "#f8fafc", border: "none", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div className="kalki-section-header" style={{ padding: "12px 16px", background: "transparent", borderBottom: "1px solid #e2e8f0" }}>
                  <div className="kalki-section-title" style={{ fontSize: "13px", color: "#334155" }}><AlertCircle size={14}/> Operational Alerts</div>
                </div>
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto" }}>
                  
                  {/* Unified Inbox */}
                  {metrics.pendingApprovals > 0 && (
                    <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #fee2e2", borderLeft: "4px solid #ef4444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#991b1b" }}>Pending Approvals</div>
                        <div style={{ fontSize: "11px", color: "#b91c1c" }}>Action required by you</div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444" }}>{metrics.pendingApprovals}</div>
                    </div>
                  )}

                  {/* Cashier Review Queue */}
                  {(session?.isOwner || selected?.permissions.some(p => p.includes("payables") && p.includes("approve"))) && metrics.pendingAudits > 0 && (
                    <Link href={`/finance/purchases-payables/audit-queue?organizationId=${selected.organizationId}&locationId=${selected.locationId}`} style={{ textDecoration: 'none' }}>
                      <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #fef08a", borderLeft: "4px solid #eab308", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#854d0e" }}>Cashier Review Queue</div>
                          <div style={{ fontSize: "11px", color: "#a16207" }}>Payment audits pending</div>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#eab308" }}>{metrics.pendingAudits}</div>
                      </div>
                    </Link>
                  )}

                  {/* Accounts Processing Queue */}
                  {(session?.isOwner || selected?.permissions.some(p => p.includes("payables"))) && metrics.pendingBills > 0 && (
                    <Link href={`/finance/purchases-payables/bills?organizationId=${selected.organizationId}&locationId=${selected.locationId}`} style={{ textDecoration: 'none' }}>
                      <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #cffafe", borderLeft: "4px solid #06b6d4", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#164e63" }}>Accounts Processing</div>
                          <div style={{ fontSize: "11px", color: "#155e75" }}>Pending bills to record</div>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#06b6d4" }}>{metrics.pendingBills}</div>
                      </div>
                    </Link>
                  )}

                  {/* Overdue Receivables */}
                  {metrics.overdueCustomerInvoices > 0 && (
                    <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #ffedd5", borderLeft: "4px solid #f97316", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#9a3412" }}>Overdue Payments</div>
                        <div style={{ fontSize: "11px", color: "#c2410c" }}>From Customers</div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f97316" }}>{metrics.overdueCustomerInvoices}</div>
                    </div>
                  )}

                  {/* Bank Feeds */}
                  {metrics.unreconciledBankFeeds > 0 && (
                    <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #e0f2fe", borderLeft: "4px solid #0ea5e9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#075985" }}>Unreconciled Feeds</div>
                        <div style={{ fontSize: "11px", color: "#0369a1" }}>Pending bank matches</div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0ea5e9" }}>{metrics.unreconciledBankFeeds}</div>
                    </div>
                  )}

                  {/* Unposted Drafts */}
                  {metrics.drafts > 0 && (
                    <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #f1f5f9", borderLeft: "4px solid #94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Unposted Drafts</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Saved, not approved</div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#64748b" }}>{metrics.drafts}</div>
                    </div>
                  )}

                  {/* Inter-Branch */}
                  {metrics.unsettledInterBranch > 0 && (
                    <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #f3e8ff", borderLeft: "4px solid #a855f7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b21a8" }}>Unsettled Transfers</div>
                        <div style={{ fontSize: "11px", color: "#7e22ce" }}>Inter-branch clearings</div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#a855f7" }}>{metrics.unsettledInterBranch}</div>
                    </div>
                  )}

                  {/* No Alerts Fallback */}
                  {metrics.pendingApprovals === 0 && (!(session?.isOwner || selected?.permissions.some(p => p.includes("payables") && p.includes("approve"))) || metrics.pendingAudits === 0) && (!(session?.isOwner || selected?.permissions.some(p => p.includes("payables"))) || metrics.pendingBills === 0) && metrics.overdueCustomerInvoices === 0 && metrics.unreconciledBankFeeds === 0 && metrics.drafts === 0 && metrics.unsettledInterBranch === 0 && (
                    <div style={{ padding: "24px 12px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      <CheckCircle2 size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                      You're all caught up!<br/>No operational alerts at this time.
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* 4. Bottom Footer: Recent Transactions Ticker (~10% height) */}
          <div className="kalki-section" style={{ height: "140px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div className="kalki-section-header" style={{ padding: "8px 16px" }}>
              <div className="kalki-section-title" style={{ fontSize: "12px" }}>
                <Clock size={14} style={{ color: "var(--kalki-primary)" }} />
                Recent Ledger Activity
              </div>
              <Link href={`/finance/accounting/ledgers${selected ? `?organizationId=${selected.organizationId}&locationId=${selectedLocationId === 'ALL' ? selected.locationId : selectedLocationId}` : ""}`}>
                <span style={{ fontSize: "11px", color: "#3b82f6", cursor: "pointer", fontWeight: 500 }}>View All Ledger</span>
              </Link>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                    <th style={{ padding: "6px 4px", fontWeight: 500 }}>Date</th>
                    <th style={{ padding: "6px 4px", fontWeight: 500 }}>Type</th>
                    <th style={{ padding: "6px 4px", fontWeight: 500 }}>Reference ID</th>
                    <th style={{ padding: "6px 4px", fontWeight: 500 }}>Narration</th>
                    <th style={{ padding: "6px 4px", fontWeight: 500, textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentEntries.map((entry: any) => (
                    <tr 
                      key={entry.id} 
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                      className="hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td style={{ padding: "6px 4px", color: "#334155" }}>
                        {new Date(entry.entryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td style={{ padding: "6px 4px", color: "#64748b" }}>{entry.sourceModule}</td>
                      <td style={{ padding: "6px 4px", fontFamily: "monospace", color: "#3b82f6" }}>{entry.entryNumber}</td>
                      <td style={{ padding: "6px 4px", color: "#334155", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.narration}
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                        {formatCurrency(parseFloat(entry.totalAmount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Journal Voucher Modal */}
      {selectedEntry && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", width: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={18} color="#3b82f6" />
                  Journal Voucher
                </h2>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>{selectedEntry.entryNumber}</div>
              </div>
              <button onClick={() => setSelectedEntry(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "20px" }}>&times;</button>
            </div>

            <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Date</div>
                  <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>{new Date(selectedEntry.entryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Source Module</div>
                  <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>{selectedEntry.sourceModule}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Narration</div>
                  <div style={{ fontSize: "13px", color: "#334155" }}>{selectedEntry.narration}</div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 4px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Account / Narration</th>
                    <th style={{ padding: "8px 4px", textAlign: "right", color: "#475569", fontWeight: 600 }}>Debit (Dr)</th>
                    <th style={{ padding: "8px 4px", textAlign: "right", color: "#475569", fontWeight: 600 }}>Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntry.lines.map((line: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 4px" }}>
                        <div style={{ color: "#0f172a", fontWeight: 500, display: "flex", gap: "8px" }}>
                          {!line.isDebit && <span style={{ opacity: 0 }}>----</span>}
                          {line.isDebit ? line.narration : `To ${line.narration}`}
                        </div>
                      </td>
                      <td style={{ padding: "12px 4px", textAlign: "right", fontFamily: "monospace", color: line.isDebit ? "#0f172a" : "#94a3b8" }}>
                        {line.isDebit ? formatCurrency(line.amount) : "-"}
                      </td>
                      <td style={{ padding: "12px 4px", textAlign: "right", fontFamily: "monospace", color: !line.isDebit ? "#0f172a" : "#94a3b8" }}>
                        {!line.isDebit ? formatCurrency(line.amount) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #cbd5e1" }}>
                    <td style={{ padding: "12px 4px", fontWeight: "bold", textAlign: "right", color: "#0f172a" }}>TOTAL</td>
                    <td style={{ padding: "12px 4px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#0f172a" }}>{formatCurrency(parseFloat(selectedEntry.totalAmount))}</td>
                    <td style={{ padding: "12px 4px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#0f172a" }}>{formatCurrency(parseFloat(selectedEntry.totalAmount))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedEntry(null)} className="kalki-button" style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#475569" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
