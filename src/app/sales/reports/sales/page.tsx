"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Download, TrendingUp, FileText, IndianRupee, PieChart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { fetchOrgLocations, fetchOrgChannels, fetchSalesReportData } from "@/app/sales/reports/actions";
import Pagination from "@/components/sales/Pagination";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function SalesReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected: scope } = useSessionView();

  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);
  const [channels, setChannels] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ grossSales: 0, totalTax: 0, netRevenue: 0, invoiceCount: 0 });
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Read URL params
  const currentRange = searchParams.get("range") || "this_month";
  const currentLocation = searchParams.get("locationId") || "all";
  const currentChannel = searchParams.get("channelId") || "all";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";
  const currentSearch = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 15;

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
          const locs = await fetchOrgLocations(scope.organizationId);
          if (active) {
            setLocations(locs || []);
            try {
              const chans = await fetchOrgChannels(scope?.organizationId);
              setChannels(chans || []);
            } catch(e) {}
          }
        } catch (e) {
          console.error(e);
        }
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
            endDate = today.toISOString().split("T")[0];
            break;
          case "yesterday":
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            startDate = yest.toISOString().split("T")[0];
            endDate = yest.toISOString().split("T")[0];
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

        const res = await fetchSalesReportData(
          scope.organizationId,
          currentLocation,
          startDate,
          endDate,
          page,
          limit,
          currentSearch
        );
        
        if (active) {
          setInvoices(res.invoices || []);
          setKpis(res.kpis || { grossSales: 0, totalTax: 0, netRevenue: 0, invoiceCount: 0 });
          setTotalInvoices(res.total || 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    loadData();
    return () => { active = false; };
  }, [scope?.organizationId, currentRange, currentLocation, currentFrom, currentTo, page, currentSearch]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam("range", e.target.value);
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) return;
    
    const headers = ["Date", "Invoice No", "Customer Name", "Category", "Subtotal", "Tax Amount", "Grand Total", "Status"];
    const csvRows = [headers.join(",")];
    
    for (const inv of invoices) {
      const date = inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '';
      const no = inv.invoiceNumber || '';
      const customer = `"${(inv.customerName || '').replace(/"/g, '""')}"`;
      const channel = inv.channelName || 'Unassigned';
      const sub = Number(inv.subtotalAmount || 0).toFixed(2);
      const tax = Number(inv.taxAmount || 0).toFixed(2);
      const total = Number(inv.grandTotal || 0).toFixed(2);
      const status = (inv.paymentStatus || inv.status || '').toUpperCase();
      
      csvRows.push([date, no, customer, channel, sub, tax, total, status].join(","));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (invoices.length === 0) return;
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Sales Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    const tableData = invoices.map(inv => {
      return [
        inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
        inv.invoiceNumber || '',
        inv.customerName || '',
        inv.channelName || 'Unassigned',
        Number(inv.subtotalAmount || 0).toFixed(2),
        Number(inv.taxAmount || 0).toFixed(2),
        Number(inv.grandTotal || 0).toFixed(2),
        (inv.paymentStatus || inv.status || '').toUpperCase()
      ];
    });
    
    autoTable(doc, {
      startY: 35,
      head: [["Date", "Invoice No", "Customer Name", "Category", "Subtotal", "Tax Amount", "Grand Total", "Status"]],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`sales_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalPages = Math.ceil(totalInvoices / limit);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      
      {/* KPI Cards Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
        gap: "24px", 
        marginBottom: "32px" 
      }}>
        <div style={{ 
          backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", 
          border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{ padding: "12px", backgroundColor: "#eff6ff", borderRadius: "50%", color: "#3b82f6" }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Gross Sales</p>
            <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>₹{kpis.grossSales.toFixed(2)}</h3>
          </div>
        </div>

        <div style={{ 
          backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", 
          border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{ padding: "12px", backgroundColor: "#fef2f2", borderRadius: "50%", color: "#ef4444" }}>
            <PieChart size={24} />
          </div>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Tax (GST)</p>
            <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>₹{kpis.totalTax.toFixed(2)}</h3>
          </div>
        </div>

        <div style={{ 
          backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", 
          border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{ padding: "12px", backgroundColor: "#ecfdf5", borderRadius: "50%", color: "#10b981" }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Net Revenue</p>
            <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>₹{kpis.netRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div style={{ 
          backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", 
          border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{ padding: "12px", backgroundColor: "#f5f3ff", borderRadius: "50%", color: "#8b5cf6" }}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invoice Count</p>
            <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>{kpis.invoiceCount}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        marginBottom: "16px", flexWrap: "wrap", gap: "16px"
      }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <select 
            value={currentRange}
            onChange={handleRangeChange}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer" }}
          >
            <option value="this_month">This Month</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_1_month">Last 1 Month</option>
            <option value="custom">Custom</option>
          </select>
          
          {currentRange === "custom" && (
            <>
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
            </>
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
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer" }}
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          <input 
            type="text" 
            placeholder="Search customer, phone or category..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", minWidth: "260px" }}
          />
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleExportCSV} style={{ 
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", 
            backgroundColor: "white", color: "#3b82f6", border: "1px solid #3b82f6", 
            borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" 
          }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handleExportPDF} style={{ 
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", 
            backgroundColor: "white", color: "#ef4444", border: "1px solid #ef4444", 
            borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" 
          }}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ 
        backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflowX: "auto" 
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 10, boxShadow: "0 1px 0 #e2e8f0" }}>
            <tr>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Date</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Invoice No.</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Customer Name</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Category</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "right" }}>Subtotal</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "right" }}>Tax Amount</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "right" }}>Grand Total</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading report data...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No sales data found for the selected filters.</td>
              </tr>
            ) : (
              invoices.map((row, i) => {
                const status = (row.paymentStatus || row.status || "").toUpperCase();
                return (
                  <tr key={row.id} style={{ borderBottom: i === invoices.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px 20px", color: "#475569" }}>
                      {row.invoiceDate ? new Date(row.invoiceDate).toISOString().split('T')[0] : ''}
                    </td>
                    <td style={{ padding: "16px 20px", color: "#0f172a", fontWeight: "500" }}>{row.invoiceNumber}</td>
                    <td style={{ padding: "16px 20px", color: "#334155" }}>
                      {row.customerName || 'Unknown Customer'}
                      {row.customerPhone && <div style={{ fontSize: "12px", color: "#64748b" }}>{row.customerPhone}</div>}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        backgroundColor: (row.channelName || "Unassigned").toUpperCase().includes("DINE") ? "#eff6ff" : (row.channelName || "").toUpperCase().includes("TAKE") || (row.channelName || "").toUpperCase().includes("PARCEL") ? "#fffbeb" : "#f1f5f9", 
                        color: (row.channelName || "Unassigned").toUpperCase().includes("DINE") ? "#1e40af" : (row.channelName || "").toUpperCase().includes("TAKE") || (row.channelName || "").toUpperCase().includes("PARCEL") ? "#b45309" : "#475569", 
                        borderRadius: "6px", fontSize: "12px", fontWeight: "600" 
                      }}>
                        {row.channelName || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", color: "#334155", textAlign: "right" }}>₹{Number(row.subtotalAmount || 0).toFixed(2)}</td>
                    <td style={{ padding: "16px 20px", color: "#334155", textAlign: "right" }}>₹{Number(row.taxAmount || 0).toFixed(2)}</td>
                    <td style={{ padding: "16px 20px", color: "#0f172a", fontWeight: "600", textAlign: "right" }}>₹{Number(row.grandTotal || 0).toFixed(2)}</td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      <span style={{ 
                        padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600",
                        backgroundColor: status === 'PAID' ? "#dcfce7" : status === 'PENDING' ? "#fef3c7" : "#fee2e2",
                        color: status === 'PAID' ? "#16a34a" : status === 'PENDING' ? "#d97706" : "#dc2626"
                      }}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {!loading && totalPages > 0 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              Showing {Math.min((page - 1) * limit + 1, totalInvoices)} to {Math.min(page * limit, totalInvoices)} of {totalInvoices} invoices
            </span>
            <Pagination totalPages={totalPages} currentPage={page} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalesReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading dashboard...</div>}>
      <SalesReportContent />
    </Suspense>
  );
}