"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchCustomerWiseReportData, fetchOrgLocations, fetchCustomerInvoices , fetchOrgChannels } from "../actions";
import { useSessionView } from "@/components/AppShell";
import { Download, Users, Crown, Banknote, Repeat, ChevronLeft, ChevronRight, Eye, X, Receipt, AlertTriangle, TrendingDown, Wallet, Star, Activity } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GlobalTemplateModal } from "@/components/crm/GlobalTemplateModal";

function CustomerWiseReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected: scope } = useSessionView();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [fullData, setFullData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({ totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 });
  const [locations, setLocations] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [marketingModal, setMarketingModal] = useState<{
    isOpen: boolean;
    customerIds: string[];
    contextPrefix?: string;
  }>({ isOpen: false, customerIds: [] });

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
  const alertFilter = searchParams.get("alertFilter") as 'dormant_vips' | 'low_aov' | 'top_spenders' | 'critical_debtors' | 'new_vips' | 'spend_anomalies' | 'all' | null;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "15", 10);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [customFromInput, setCustomFromInput] = useState(currentFrom);
  const [customToInput, setCustomToInput] = useState(currentTo);

  useEffect(() => {
    setCustomFromInput(currentFrom);
    setCustomToInput(currentTo);
  }, [currentFrom, currentTo]);

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
          alertFilter || 'all',
          currentChannel
        );
        
        if (active) {
          setData(res.data || []);
          setFullData(res.fullData || []);
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
  }, [scope?.organizationId, currentRange, currentLocation, currentChannel, currentFrom, currentTo, page, limit, currentSearch, alertFilter]);

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

  const applyCustomDateRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    if (customFromInput) params.set("from", customFromInput);
    else params.delete("from");
    if (customToInput) params.set("to", customToInput);
    else params.delete("to");
    params.set("page", "1");
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
    <div style={{ padding: "16px 20px", maxWidth: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
        
        <div style={{ backgroundColor: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={18} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Total Customers</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 }}>{kpis.totalCustomers.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Crown size={18} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Top Spender</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px", lineHeight: 1.2 }}>
                {kpis.topSpenderName}
              </span>
              <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600", whiteSpace: "nowrap" }}>
                ₹{Number(kpis.topSpenderAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Banknote size={18} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Avg Customer Spend</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 }}>₹{Number(kpis.avgSpend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#f5f3ff", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Repeat size={18} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Repeat Customer Rate</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 }}>{Number(kpis.repeatRate || 0).toFixed(1)}%</div>
          </div>
        </div>

      </div>

      {/* Actionable Aggregated Alert Engine */}
      {alerts.length > 0 && (
        <div 
          style={{ 
            display: "flex", 
            gap: "12px", 
            marginBottom: "16px",
            overflowX: "auto",
            overflowY: "hidden",
            paddingBottom: "6px",
            scrollbarWidth: "thin",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {alerts.map(alert => {
            const isCritical = alert.type === 'critical';
            const isWarning = alert.type === 'warning';
            const isSuccess = alert.type === 'success';

            // Styling tokens adhering to Kalki BOS Vanilla CSS Design System
            const borderColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : isSuccess ? "#22c55e" : "#3b82f6";
            const bgColor = isCritical ? "#fef2f2" : isWarning ? "#fffbeb" : isSuccess ? "#dcfce7" : "#eff6ff";
            const badgeTextColor = isSuccess ? "#166534" : borderColor;

            // Icon resolution based on alert configuration
            let Icon = Users;
            if (alert.icon === 'Wallet') Icon = Wallet;
            else if (alert.icon === 'Star') Icon = Star;
            else if (alert.icon === 'Activity') Icon = Activity;
            else if (alert.icon === 'TrendingDown' || isWarning) Icon = TrendingDown;
            else if (isCritical) Icon = AlertTriangle;

            return (
              <div 
                key={alert.id} 
                style={{ 
                  flex: "0 0 calc(25% - 9px)",
                  minWidth: "260px",
                  boxSizing: "border-box",
                  backgroundColor: "white", 
                  border: "1px solid #e2e8f0", 
                  borderLeft: `4px solid ${borderColor}`,
                  borderRadius: "8px", 
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <div style={{ backgroundColor: bgColor, color: badgeTextColor, padding: "4px", borderRadius: "4px", display: "flex" }}>
                      <Icon size={13} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: badgeTextColor }}>
                      {alert.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "0 0 2px 0", lineHeight: 1.25 }}>
                    {alert.title}
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px 0", lineHeight: 1.25 }}>
                    {alert.description}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  <button 
                    onClick={() => updateParam('alertFilter', alert.filterParam)}
                    style={{ alignSelf: "flex-start", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", borderRadius: "5px", padding: "4px 9px", fontSize: "12px", fontWeight: "500", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                  >
                    {alert.actionLabel}
                  </button>
                  <button
                    onClick={() => {
                      const prefix =
                        alert.badge === "Retention Risk"
                          ? "DORMANT_VIP"
                          : alert.badge === "Credit Risk"
                          ? "OVERDUE_DEBTOR"
                          : alert.badge === "Growth"
                          ? "NEW_VIP"
                          : alert.badge === "Catering Target"
                          ? "SPEND_ANOMALY"
                          : alert.badge === "Upsell Deficit"
                          ? "UPSELL_DEFICIT"
                          : alert.badge === "Concentration"
                          ? "TOP_SPENDER"
                          : "CAMPAIGN";
                      setMarketingModal({
                        isOpen: true,
                        customerIds: alert.matchedCustomerIds || [],
                        contextPrefix: prefix,
                      });
                    }}
                    style={{ alignSelf: "flex-start", backgroundColor: "#0f172a", border: "none", color: "#ffffff", borderRadius: "5px", padding: "4px 9px", fontSize: "12px", fontWeight: "500", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1e293b"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0f172a"}
                  >
                    Create Template
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Control Bar */}
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          gap: "8px", 
          marginBottom: "14px", 
          backgroundColor: "#f8fafc", 
          padding: "8px 12px", 
          borderRadius: "8px", 
          border: "1px solid #e2e8f0",
          overflowX: "auto"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, flexWrap: "nowrap" }}>
          <select 
            value={currentRange}
            onChange={(e) => updateParam("range", e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "12px", outline: "none", cursor: "pointer", flexShrink: 0 }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_1_month">Last 1 Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {currentRange === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <input 
                type="date" 
                value={customFromInput}
                onChange={(e) => setCustomFromInput(e.target.value)}
                style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "12px", outline: "none", width: "125px" }}
              />
              <span style={{ color: "#64748b", fontSize: "11px" }}>to</span>
              <input 
                type="date" 
                value={customToInput}
                onChange={(e) => setCustomToInput(e.target.value)}
                style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "12px", outline: "none", width: "125px" }}
              />
              <button
                type="button"
                onClick={applyCustomDateRange}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
              >
                Apply
              </button>
            </div>
          )}

          <select 
            value={currentChannel} 
            onChange={(e) => updateParam("channelId", e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "12px", outline: "none", cursor: "pointer", maxWidth: "150px", flexShrink: 0 }}
          >
            <option value="all">All Categories</option>
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>

          <select
            value={currentLocation}
            onChange={(e) => updateParam("locationId", e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "12px", outline: "none", cursor: "pointer", maxWidth: "160px", flexShrink: 0 }}
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          <input 
            type="text" 
            placeholder="Search name or phone..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "12px", outline: "none", minWidth: "140px", flex: "1 1 140px" }}
          />
        </div>
        
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button 
            onClick={handleExportCSV} 
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", backgroundColor: "white", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <Download size={13} /> CSV
          </button>
          <button 
            onClick={handleExportPDF} 
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", backgroundColor: "white", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <Download size={13} /> PDF
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

      {marketingModal.isOpen && scope?.organizationId && (
        <GlobalTemplateModal
          organizationId={scope.organizationId}
          locationId={currentLocation !== "all" ? currentLocation : undefined}
          targetEntityType="CUSTOMER"
          entityIds={marketingModal.customerIds}
          defaultTemplateName={
            marketingModal.contextPrefix
              ? `${marketingModal.contextPrefix}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_1`
              : `CAMPAIGN_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_1`
          }
          displayData={(() => {
            const customerIdSet = new Set(marketingModal.customerIds);
            const matchedRows = fullData.filter(d => d.customerId && customerIdSet.has(d.customerId));
            // If matchedRows is non-empty, use them; otherwise, fall back to whatever is in fullData
            const source = matchedRows.length > 0 ? matchedRows : fullData.filter(d => d.customerId);
            return source.map(d => ({
              id: d.customerId,
              name: d.customerName || 'Walk-in Guest',
              contact: d.customerPhone || '-',
              totalOrders: Number(d.totalInvoices || 0),
              avgBillValue: Number(d.avgBillValue || 0),
              lastVisitDate: d.lastPurchaseDate ? new Date(d.lastPurchaseDate).toISOString().split('T')[0] : '-',
              totalRevenue: Number(d.totalRevenue || 0)
            }));
          })()}
          onClose={() => setMarketingModal({ isOpen: false, customerIds: [] })}
        />
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