"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Filter, Calendar, X } from "lucide-react";

export default function SearchFilterBar({ showDateFilter = false, showStatusFilter = false, showPaymentModeFilter = false }: { showDateFilter?: boolean, showStatusFilter?: boolean, showPaymentModeFilter?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [paymentMode, setPaymentMode] = useState(searchParams.get("paymentMode") || "");

  React.useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    
    // Reset to page 1 on new search
    params.delete("page"); 
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApplyFilter = () => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      alert("End Date cannot be earlier than Start Date.");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");
    
    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");
    
    if (status) params.set("status", status);
    else params.delete("status");
    
    if (paymentMode) params.set("paymentMode", paymentMode);
    else params.delete("paymentMode");
    
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setShowFilterDropdown(false);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setStatus("");
    setPaymentMode("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    params.delete("status");
    params.delete("paymentMode");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setShowFilterDropdown(false);
  };

  const hasActiveDateFilter = !!searchParams.get("startDate") || !!searchParams.get("endDate");

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      {showDateFilter && !hasActiveDateFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12px", backgroundColor: "#f8fafc", padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
          <Calendar size={14} /> Last 15 Days
        </div>
      )}
      {showDateFilter && hasActiveDateFilter && (
         <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0f172a", fontSize: "12px", backgroundColor: "#f1f5f9", padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
         <Calendar size={14} /> Custom Date
       </div>
      )}
      
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", position: "relative" }}>
        <div style={{ position: "relative", width: "240px" }}>
          <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex", alignItems: "center" }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 38px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
        <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", backgroundColor: "#0f172a", color: "white", fontSize: "14px", fontWeight: "500", cursor: "pointer", border: "none" }}>
          Search
        </button>
      </form>

      <div style={{ position: "relative" }}>
        <button 
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: hasActiveDateFilter ? "#e0e7ff" : "white", color: hasActiveDateFilter ? "#4338ca" : "#334155", fontSize: "14px", cursor: "pointer", fontWeight: "500" }}>
          <Filter size={18} /> Filter
        </button>

        {showFilterDropdown && (
          <div style={{ position: "absolute", top: "110%", right: "0", width: "300px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", padding: "16px", zIndex: 50 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>Filter Options</h4>
              <button onClick={() => setShowFilterDropdown(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            {showStatusFilter && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", backgroundColor: "white" }}>
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            )}

            {showPaymentModeFilter && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", backgroundColor: "white" }}>
                  <option value="">All Payment Modes</option>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="CREDIT">CREDIT</option>
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                onClick={handleClearFilter}
                style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", cursor: "pointer", fontWeight: "500" }}>
                Clear
              </button>
              <button 
                onClick={handleApplyFilter}
                style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", backgroundColor: "#0f172a", color: "white", fontSize: "14px", cursor: "pointer", fontWeight: "500" }}>
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
