"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Download, TrendingUp, Package, Hash } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { fetchOrgLocations, fetchItemCategories, fetchItemWiseReportData } from "@/app/sales/reports/actions";
import Pagination from "@/components/sales/Pagination";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function ItemWiseReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected: scope } = useSessionView();

  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);
  const [channels, setChannels] = useState<{id: string, name: string}[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<{ topRevenueItem: any, topVolumeItem: any, totalUnits: number }>({ topRevenueItem: null, topVolumeItem: null, totalUnits: 0 });
  const [totalItems, setTotalItems] = useState(0);

  // Read URL params
  const currentRange = searchParams.get("range") || "this_month";
  const currentLocation = searchParams.get("locationId") || "all";
  const currentChannel = searchParams.get("channelId") || "all";
  const currentCategory = searchParams.get("categoryId") || "all";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";
  const currentSearch = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 15;

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateParam("search", searchInput);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, currentSearch]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (scope?.organizationId) {
        try {
          const [locs, cats] = await Promise.all([
            fetchOrgLocations(scope.organizationId),
            fetchItemCategories(scope.organizationId)
          ]);
          if (active) {
            setLocations(locs);
            setCategories(cats);
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

        const res = await fetchItemWiseReportData(
          scope.organizationId,
          currentLocation,
          currentCategory,
          startDate,
          endDate,
          page,
          limit,
          currentSearch
        );
        
        if (active) {
          setItemsData(res.items);
          setKpis(res.kpis);
          setTotalItems(res.total);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [scope?.organizationId, currentLocation, currentCategory, currentRange, currentFrom, currentTo, page, currentSearch]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") params.set("page", "1"); 
    if (key === "range" && value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push("?" + params.toString());
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam("range", e.target.value);
  };

  const handleExportCSV = () => {
    if (itemsData.length === 0) return;
    const headers = ["Item Name", "Category", "UOM", "Total Qty Sold", "Net Revenue"];
    const rows = itemsData.map(row => [
      row.itemName || "",
      row.categoryName || "Uncategorized",
      row.uom || "",
      Number(row.totalQtySold || 0).toString(),
      Number(row.netRevenue || 0).toFixed(2)
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Item_Wise_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (itemsData.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Item-wise Sales Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableColumn = ["Item Name", "Category", "UOM", "Total Qty Sold", "Net Revenue"];
    const tableRows: any[] = [];
    
    itemsData.forEach(row => {
      tableRows.push([
        row.itemName || "",
        row.categoryName || "Uncategorized",
        row.uom || "",
        Number(row.totalQtySold || 0).toString(),
        `Rs. ${Number(row.netRevenue || 0).toFixed(2)}`
      ]);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`Item_Wise_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalPages = Math.ceil(totalItems / limit);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px 0" }}>Item-wise Sales Report</h1>
        <p style={{ color: "#64748b", margin: 0 }}>Analyze product performance, volume, and revenue contributions.</p>
      </div>

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
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Top Revenue Item</p>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
              {kpis.topRevenueItem ? `${kpis.topRevenueItem.name} - ₹${kpis.topRevenueItem.amount.toFixed(2)}` : "N/A"}
            </h3>
          </div>
        </div>

        <div style={{ 
          backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", 
          border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{ padding: "12px", backgroundColor: "#ecfdf5", borderRadius: "50%", color: "#10b981" }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Highest Volume Item</p>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
              {kpis.topVolumeItem ? `${kpis.topVolumeItem.name} - ${kpis.topVolumeItem.qty} Nos` : "N/A"}
            </h3>
          </div>
        </div>

        <div style={{ 
          backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", 
          border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{ padding: "12px", backgroundColor: "#f5f3ff", borderRadius: "50%", color: "#8b5cf6" }}>
            <Hash size={24} />
          </div>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Units Sold</p>
            <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>{Number(kpis.totalUnits).toLocaleString()}</h3>
          </div>
        </div>
      </div>

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

          <select 
            value={currentCategory}
            onChange={(e) => updateParam("categoryId", e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer" }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <input 
            type="text" 
            placeholder="Search item..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", minWidth: "200px" }}
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

      <div style={{ 
        backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflowX: "auto" 
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 10, boxShadow: "0 1px 0 #e2e8f0" }}>
            <tr>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Item Code/Name</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>Category</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>UOM</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "right" }}>Total Qty Sold</th>
              <th style={{ padding: "16px 20px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px", textAlign: "right" }}>Net Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading report data...</td>
              </tr>
            ) : itemsData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No items found for the selected filters.</td>
              </tr>
            ) : (
              itemsData.map((row, i) => (
                <tr key={row.itemId} style={{ borderBottom: i === itemsData.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px 20px", color: "#0f172a", fontWeight: "500" }}>{row.itemName}</td>
                  <td style={{ padding: "16px 20px", color: "#334155" }}>
                    <span style={{ padding: "4px 8px", backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                      {row.categoryName || 'Uncategorized'}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", color: "#475569" }}>{row.uom}</td>
                  <td style={{ padding: "16px 20px", color: "#334155", textAlign: "right" }}>{Number(row.totalQtySold || 0).toString()}</td>
                  <td style={{ padding: "16px 20px", color: "#0f172a", fontWeight: "600", textAlign: "right" }}>₹{Number(row.netRevenue || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && totalPages > 0 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              Showing {Math.min((page - 1) * limit + 1, totalItems)} to {Math.min(page * limit, totalItems)} of {totalItems} items
            </span>
            <Pagination totalPages={totalPages} currentPage={page} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ItemWiseReport() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>}>
      <ItemWiseReportContent />
    </Suspense>
  );
}