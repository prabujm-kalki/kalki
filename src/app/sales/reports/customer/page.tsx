"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchCustomerWiseReportData, fetchOrgLocations, fetchCustomerInvoices , fetchOrgChannels } from "../actions";
import { useSessionView } from "@/components/AppShell";
import { Download, Users, Crown, Banknote, Repeat, ChevronLeft, ChevronRight, Eye, X, Receipt, AlertTriangle, TrendingDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function CustomerWiseReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected: scope } = useSessionView();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({ totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 });
  const [locations, setLocations] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // Ledger Slide-out State
  const [selectedCustomer, setSelectedCustomer] = useState<{name: string, phone: string} | null>(null);
  const [ledgerInvoices, setLedgerInvoices] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const currentRange = searchParams.get("range") || "this_month";
  const currentLocation = searchParams.get("locationId") || "all";
  const currentChannel = searchParams.get("channelId") || "all";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";
  const currentSearch = searchParams.get("search") || "";
  const alertFilter = searchParams.get("alertFilter") as 'dormant_vips' | 'low_aov' | 'top_spenders' | 'all' | null;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "15", 10);

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set("search", searchInput);
        else params.delete("search");
        params.set("page", "1");
        router.push(`?${params.toString()}`);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, currentSearch, router, searchParams]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (scope?.organizationId) {
        try {
          const locs = await fetchOrgLocations(scope?.organizationId);
          if (active) {
            setLocations(locs || []);
            try {
              const chans = await fetchOrgChannels(scope?.organizationId);
              setChannels(chans || []);
            } catch(e) {}
          }
        } catch (e) {}
      }
    };
    init();
    return () => { active = false; };
  }, [scope?.organizationId]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      if (!scope?.organizationId) return;
      setLoading(true);
      try {
        let startDate: string | undefined = undefined;
        let endDate: string | undefined = undefined;
        
        const today = new Date();
        switch (currentRange) {
          case "today":
            startDate = today.toISOString().split("T")[0];
            endDate = startDate;
            break;
          case "yesterday":
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            startDate = yest.toISOString().split("T")[0];
            endDate = startDate;
            break;
          case "last_7_days":
            const last7 = new Date(today);
            last7.setDate(last7.getDate() - 7);
            startDate = last7.toISOString().split("T")[0];
            endDate = today.toISOString().split("T")[0];
            break;
          case "last_1_month":
            const lastMonth = new Date(today);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            startDate = lastMonth.toISOString().split("T")[0];
            endDate = today.toISOString().split("T")[0];
            break;
          case "this_month":
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate = firstDay.toISOString().split("T")[0];
            endDate = today.toISOString().split("T")[0];
            break;
          case "custom":
            startDate = currentFrom || undefined;
            endDate = currentTo || undefined;
            break;
        }

        const res = await fetchCustomerWiseReportData(
          scope.organizationId,
          currentLocation,
          startDate,
          endDate,
          page,
          limit,
          currentSearch,
          alertFilter || 'all'
        );
        
        if (active) {
          setData(res.data || []);
          setAlerts(res.alerts || []);
          setKpis(res.kpis || { totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 });
          setTotalRecords(res.total || 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    loadData();
    return () => { active = false; };
  }, [scope?.organizationId, currentRange, currentLocation, currentFrom, currentTo, page, limit, currentSearch, alertFilter]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.set("page", "1"); 
    if (key === "range" && value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`?${params.toString()}`);
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = ["Customer Name", "Phone", "Total Orders", "Average Bill Value", "Last Visit Date", "Total Revenue"];
    const csvRows = [headers.join(",")];
    for (const row of data) {
      const name = `"${(row.customerName || '').replace(/"/g, '""')}"`;
      const phone = row.customerPhone || '';
      const orders = row.totalInvoices || 0;
      const avg = Number(row.avgBillValue || 0).toFixed(2);
      const lastVisit = row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toISOString().split('T')[0] : '';
      const rev = Number(row.totalRevenue || 0).toFixed(2);
      csvRows.push([name, phone, orders, avg, lastVisit, rev].join(","));
    }
    const blob = new Blob([csvRows.join("\\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_wise_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportPDF = () => {
    if (data.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Customer-wise Sales Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = data.map(row => {
      return [
        row.customerName || '-',
        row.customerPhone || '-',
        row.totalInvoices || '0',
        Number(row.avgBillValue || 0).toFixed(2),
        row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toISOString().split('T')[0] : '-',
        Number(row.totalRevenue || 0).toFixed(2)
      ];
    });
    
    autoTable(doc, {
      startY: 35,
      head: [["Customer Name", "Phone", "Total Orders", "Average Bill", "Last Visit", "Total Revenue"]],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    doc.save(`customer_wise_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const openLedger = async (customerName: string, customerPhone: string) => {
    setSelectedCustomer({ name: customerName, phone: customerPhone });
    setLedgerLoading(true);
    setLedgerInvoices([]);
    try {
      if (scope?.organizationId) {
        const invs = await fetchCustomerInvoices(scope.organizationId, customerName, customerPhone);
        setLedgerInvoices(invs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setSelectedCustomer(null);
    setLedgerInvoices([]);
  };

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return (
    <div style={{ padding: "24px", maxWidth: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        
        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Total Customers</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>{kpis.totalCustomers.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Crown size={24} />
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Top Spender</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
              {kpis.topSpenderName}
            </div>
            <div style={{ fontSize: "13px", color: "#10b981", fontWeight: "600" }}>₹{Number(kpis.topSpenderAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Banknote size={24} />
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Avg Customer Spend</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>₹{Number(kpis.avgSpend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#f5f3ff", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Repeat size={24} />
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Repeat Customer Rate</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>{Number(kpis.repeatRate || 0).toFixed(1)}%</div>
          </div>
        </div>

      </div>

      {/* Actionable Aggregated Alert Engine */}
      {alerts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          {alerts.map(alert => {
            const isCritical = alert.type === 'critical';
            const isWarning = alert.type === 'warning';
            const borderColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#3b82f6";
            const bgColor = isCritical ? "#fef2f2" : isWarning ? "#fffbeb" : "#eff6ff";
            const Icon = isCritical ? AlertTriangle : isWarning ? TrendingDown : Users;

            return (
              <div key={alert.id} style={{ 
                backgroundColor: "white", 
                border: "1px solid #e2e8f0", 
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: "8px", 
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ backgroundColor: bgColor, color: borderColor, padding: "6px", borderRadius: "6px", display: "flex" }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: borderColor }}>
                      {alert.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0" }}>
                    {alert.title}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                    {alert.description}
                  </p>
                </div>
                <button 
                  onClick={() => updateParam('alertFilter', alert.filterParam)}
                  style={{ alignSelf: "flex-start", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                >
                  {alert.actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Control Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
          
          <select 
            value={currentRange}
            onChange={(e) => updateParam("range", e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer", minWidth: "160px" }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_1_month">Last 1 Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {currentRange === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input 
                type="date" 
                value={currentFrom}
                onChange={(e) => updateParam("from", e.target.value)}
                style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none" }}
              />
              <span style={{ color: "#64748b" }}>to</span>
              <input 
                type="date" 
                value={currentTo}
                onChange={(e) => updateParam("to", e.target.value)}
                style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none" }}
              />
            </div>
          )}

          <select 
            value={currentChannel} 
            onChange={(e) => updateParam("channelId", e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer", minWidth: "160px" }}
          >
            <option value="all">All Categories</option>
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>
          <select
            value={currentLocation}
            onChange={(e) => updateParam("locationId", e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer", minWidth: "200px" }}
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          <input 
            type="text" 
            placeholder="Search customer name or phone..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", minWidth: "260px" }}
          />
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", backgroundColor: "white", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handleExportPDF} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", backgroundColor: "white", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {alertFilter && alertFilter !== 'all' && (
        <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "#1e3a8a", fontWeight: "500" }}>
              Filtered by: {alerts.find(a => a.filterParam === alertFilter)?.title || alertFilter.replace('_', ' ').toUpperCase()} ({totalRecords} customers)
            </span>
          </div>
          <button 
            onClick={() => updateParam("alertFilter", "")}
            style={{ background: "transparent", border: "none", color: "#3b82f6", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            <X size={14} /> Clear Filter
          </button>
        </div>
      )}

      {/* Data Table */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflowX: "auto", marginBottom: "24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Customer Name</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "center" }}>Total Orders</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "right" }}>Average Bill Value</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Last Visit Date</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "right" }}>Total Revenue</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading customer report...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No customer data found.</td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} style={{ borderBottom: i === data.length - 1 ? "none" : "1px solid #f1f5f9", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ color: "#0f172a", fontWeight: "600", marginBottom: "4px" }}>
                      {row.customerName || 'Walk-in Guest'}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {row.customerPhone !== '-' ? row.customerPhone : 'No phone number'}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", color: "#334155", textAlign: "center", fontWeight: "500" }}>
                    {row.totalInvoices}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#334155", textAlign: "right", fontWeight: "500" }}>
                    ₹{Number(row.avgBillValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#475569" }}>
                    {row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toISOString().split('T')[0] : '-'}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#0f172a", textAlign: "right", fontWeight: "700", fontSize: "15px" }}>
                    ₹{Number(row.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "center" }}>
                    <button 
                      onClick={() => openLedger(row.customerName || 'Walk-in Guest', row.customerPhone || '-')}
                      style={{ backgroundColor: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", transition: "color 0.2s" }} 
                      onMouseEnter={(e) => e.currentTarget.style.color = "#3b82f6"} 
                      onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"} 
                      title="View Ledger"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalRecords > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", gap: "16px" }}>
          
          <div style={{ color: "#64748b", fontSize: "14px" }}>
            Showing <span style={{ fontWeight: "600", color: "#0f172a" }}>{Math.min((page - 1) * limit + 1, totalRecords)}</span> to <span style={{ fontWeight: "600", color: "#0f172a" }}>{Math.min(page * limit, totalRecords)}</span> of <span style={{ fontWeight: "600", color: "#0f172a" }}>{totalRecords}</span> customers
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#64748b" }}>Rows per page:</span>
              <select 
                value={limit}
                onChange={(e) => updateParam("limit", e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer" }}
              >
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button 
                onClick={() => updateParam("page", String(page - 1))}
                disabled={page <= 1}
                style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: page <= 1 ? "#f8fafc" : "white", color: page <= 1 ? "#cbd5e1" : "#475569", cursor: page <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <ChevronLeft size={18} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let p = page;
                if (page < 3) p = idx + 1;
                else if (page > totalPages - 2) p = totalPages - 4 + idx;
                else p = page - 2 + idx;
                
                if (p < 1 || p > totalPages) return null;

                return (
                  <button 
                    key={p}
                    onClick={() => updateParam("page", String(p))}
                    style={{ 
                      width: "32px", height: "32px", borderRadius: "6px", 
                      border: p === page ? "1px solid #3b82f6" : "1px solid #cbd5e1", 
                      backgroundColor: p === page ? "#3b82f6" : "white", 
                      color: p === page ? "white" : "#475569", 
                      fontSize: "14px", fontWeight: p === page ? "600" : "400",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button 
                onClick={() => updateParam("page", String(page + 1))}
                disabled={page >= totalPages}
                style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: page >= totalPages ? "#f8fafc" : "white", color: page >= totalPages ? "#cbd5e1" : "#475569", cursor: page >= totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          
        </div>
      )}

      {/* Slide-out Ledger Panel */}
      {selectedCustomer && (
        <>
          {/* Overlay */}
          <div 
            onClick={closeLedger}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", zIndex: 999, transition: "opacity 0.2s" }}
          />
          {/* Drawer */}
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: "450px", backgroundColor: "white", zIndex: 1000, boxShadow: "-4px 0 15px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", transform: "translateX(0)", transition: "transform 0.3s ease-out" }}>
            
            {/* Drawer Header */}
            <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: "#f8fafc" }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", color: "#0f172a" }}>{selectedCustomer.name}</h2>
                <div style={{ color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{selectedCustomer.phone !== '-' ? selectedCustomer.phone : 'No Phone Number'}</span>
                </div>
              </div>
              <button 
                onClick={closeLedger}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}>
                <Receipt size={18} /> Recent Invoices
              </h3>

              {ledgerLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Loading invoice history...</div>
              ) : ledgerInvoices.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                  No recent invoices found for this customer.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {ledgerInvoices.map((inv, idx) => (
                    <div key={idx} style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "white", transition: "border-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.borderColor = "#cbd5e1"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>#{inv.invoiceNumber || 'N/A'}</div>
                        <div style={{ fontWeight: "700", color: "#10b981" }}>₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <div style={{ color: "#64748b" }}>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '-'}</div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {inv.channelName && (
                            <span style={{ backgroundColor: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" }}>
                              {inv.channelName}
                            </span>
                          )}
                          {inv.paymentStatus === 'PAID' && (
                            <span style={{ backgroundColor: "#ecfdf5", color: "#10b981", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" }}>Paid</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
}

export default function Page() {
  return (
    <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading customer report module...</div>}>
      <CustomerWiseReportContent />
    </React.Suspense>
  );
}