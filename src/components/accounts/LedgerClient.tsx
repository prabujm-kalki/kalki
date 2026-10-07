"use client";

import React, { useState, useEffect } from "react";
import { Users, Building2, Search, ArrowRight, IndianRupee } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchVendorPayables, fetchReceivables } from "@/app/finance/ledger-actions";
import { fetchLocations } from "@/app/finance/actions";

export function LedgerClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [payables, setPayables] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"PAYABLES" | "RECEIVABLES">("PAYABLES");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      fetchVendorPayables(selected.organizationId),
      fetchReceivables(selected.organizationId),
      fetchLocations(selected.organizationId)
    ]).then(([payRes, recRes, locRes]) => {
      if (payRes.success) setPayables(payRes.data as any[]);
      if (recRes.success) setReceivables(recRes.data as any[]);
      if (locRes.success) setLocations(locRes.data as any[]);
      setLoading(false);
    });
  }, [selected]);

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  const totalPayables = payables.reduce((s, p) => s + p.balance, 0);
  const totalReceivables = receivables.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={24} style={{ color: "var(--kalki-primary)" }} />
            Sub-Ledgers
          </h1>
          <p className="kalki-page-description">Manage Accounts Payable (Vendors) and Accounts Receivable (Customers).</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid var(--kalki-border)", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("PAYABLES")}
          style={{ 
            display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", 
            borderBottom: activeTab === "PAYABLES" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
            color: activeTab === "PAYABLES" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
            background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
            fontWeight: activeTab === "PAYABLES" ? 600 : 500, cursor: "pointer", fontSize: "14px"
          }}
        >
          <Building2 size={18} />
          Accounts Payable
          <span style={{ 
            background: activeTab === "PAYABLES" ? "#dbeafe" : "#f1f5f9", 
            color: activeTab === "PAYABLES" ? "#1d4ed8" : "var(--kalki-text-secondary)",
            padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold"
          }}>
            ₹{totalPayables.toLocaleString('en-IN')}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("RECEIVABLES")}
          style={{ 
            display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", 
            borderBottom: activeTab === "RECEIVABLES" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
            color: activeTab === "RECEIVABLES" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
            background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
            fontWeight: activeTab === "RECEIVABLES" ? 600 : 500, cursor: "pointer", fontSize: "14px"
          }}
        >
          <Users size={18} />
          Accounts Receivable
          <span style={{ 
            background: activeTab === "RECEIVABLES" ? "#dbeafe" : "#f1f5f9", 
            color: activeTab === "RECEIVABLES" ? "#1d4ed8" : "var(--kalki-text-secondary)",
            padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold"
          }}>
            ₹{totalReceivables.toLocaleString('en-IN')}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="text-center p-12 text-gray-400">Loading sub-ledgers...</div>
      ) : activeTab === "PAYABLES" ? (
        <div className="kalki-section">
          <div className="kalki-table-container">
            <table className="kalki-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Contact</th>
                  <th style={{ textAlign: "right" }}>Outstanding Balance</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payables.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>No outstanding payables.</td></tr>
                ) : payables.map(vendor => (
                  <tr key={vendor.id}>
                    <td style={{ fontWeight: 500, color: "var(--kalki-text-primary)" }}>{vendor.name}</td>
                    <td>{vendor.contactEmail || vendor.contactPhone || "N/A"}</td>
                    <td style={{ textAlign: "right", fontWeight: "bold", color: "var(--kalki-danger)" }}>₹{vendor.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: "right" }}>
                      <button style={{ background: "none", border: "none", color: "var(--kalki-primary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        View Ledger <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="kalki-section">
          <div className="kalki-table-container">
            <table className="kalki-table">
              <thead>
                <tr>
                  <th>Branch (Location)</th>
                  <th style={{ textAlign: "right" }}>Outstanding Receivables</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {receivables.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>No outstanding receivables.</td></tr>
                ) : receivables.map(rec => {
                  const loc = locations.find(l => l.id === rec.locationId);
                  return (
                    <tr key={rec.locationId}>
                      <td style={{ fontWeight: 500, color: "var(--kalki-text-primary)" }}>{loc?.name || "Unknown Branch"}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold", color: "#16a34a" }}>₹{rec.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "right" }}>
                        <button style={{ background: "none", border: "none", color: "var(--kalki-primary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                          Settle <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
