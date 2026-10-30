"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Download, FileSpreadsheet, FileText } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface KalkiStandardFilterBarProps {
  searchPlaceholder?: string;
  showRangeFilter?: boolean;
  showStatusFilter?: boolean;
  statusOptions?: FilterOption[];
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  actionButton?: React.ReactNode;
}

export function KalkiStandardFilterBar({
  searchPlaceholder = "Search...",
  showRangeFilter = true,
  showStatusFilter = false,
  statusOptions = [],
  onExportCSV,
  onExportPDF,
  actionButton,
}: KalkiStandardFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentSearch = searchParams.get("q") || "";
  const currentRange = searchParams.get("range") || "all";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";
  const currentStatus = searchParams.get("status") || "all";

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(searchParams.get("q") || "");
  }, [searchParams]);

  // Debounced search sync
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== (searchParams.get("q") || "")) {
        updateParam("q", searchInput.trim());
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") params.set("page", "1");
    if (key === "range" && value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", val);
    params.set("page", "1");

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (val === "today") {
      params.set("from", formatDate(today));
      params.set("to", formatDate(today));
    } else if (val === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      params.set("from", formatDate(y));
      params.set("to", formatDate(y));
    } else if (val === "last_7_days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      params.set("from", formatDate(d));
      params.set("to", formatDate(today));
    } else if (val === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      params.set("from", formatDate(firstDay));
      params.set("to", formatDate(today));
    } else if (val === "last_1_month") {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      params.set("from", formatDate(d));
      params.set("to", formatDate(today));
    } else if (val === "all") {
      params.delete("range");
      params.delete("from");
      params.delete("to");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      {/* Left Filter Controls */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
        {showRangeFilter && (
          <select
            value={currentRange}
            onChange={handleRangeChange}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "13.5px",
              outline: "none",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <option value="all">All Dates</option>
            <option value="this_month">This Month</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_1_month">Last 1 Month</option>
            <option value="custom">Custom Date Range</option>
          </select>
        )}

        {currentRange === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="date"
              value={currentFrom}
              onChange={(e) => updateParam("from", e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <span style={{ color: "#64748b", fontSize: "12.5px" }}>to</span>
            <input
              type="date"
              value={currentTo}
              onChange={(e) => updateParam("to", e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        )}

        {showStatusFilter && (
          <select
            value={currentStatus}
            onChange={(e) => updateParam("status", e.target.value)}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "13.5px",
              outline: "none",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Search input with leading icon */}
        <div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px", maxWidth: "340px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px 9px 36px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "13.5px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Right Action Buttons */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {onExportCSV && (
          <button
            type="button"
            onClick={onExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              backgroundColor: "#ffffff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Download size={15} /> Export CSV
          </button>
        )}

        {onExportPDF && (
          <button
            type="button"
            onClick={onExportPDF}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              backgroundColor: "#ffffff",
              color: "#ef4444",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Download size={15} /> Export PDF
          </button>
        )}

        {actionButton}
      </div>
    </div>
  );
}
