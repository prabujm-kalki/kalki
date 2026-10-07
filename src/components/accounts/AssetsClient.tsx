"use client";

import React, { useState, useEffect } from "react";
import { Laptop, ArrowDown, Activity, Settings, Plus, AlertCircle } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchFixedAssets, runDepreciationRun } from "@/app/finance/assets-actions";
import { fetchLocations } from "@/app/finance/actions";

export function AssetsClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      fetchFixedAssets(selected.organizationId),
      fetchLocations(selected.organizationId)
    ]).then(([astRes, locRes]) => {
      if (astRes.success) setAssets(astRes.data as any[]);
      else setError(astRes.error);
      if (locRes.success) setLocations(locRes.data as any[]);
      setLoading(false);
    });
  }, [selected]);

  const handleDepreciate = async (asset: any) => {
    if (!selected) return;
    const monthlyRate = (parseFloat(asset.depreciationRate) / 100) / 12;
    const amount = parseFloat(asset.purchasePrice) * monthlyRate;

    if (confirm(`Run monthly depreciation for ${asset.name}?\nEstimated Amount: ₹${amount.toFixed(2)}`)) {
      const res = await runDepreciationRun({
        organizationId: selected.organizationId,
        locationId: asset.locationId,
        assetId: asset.id,
        depreciationAmount: amount,
        assetAccountId: asset.assetAccountId,
        depreciationExpenseAccountId: asset.depreciationAccountId // assuming the DB field has this mapping
      });

      if (res.success) {
        alert("Depreciation posted successfully.");
        // Reload
        fetchFixedAssets(selected.organizationId).then(r => {
          if (r.success) setAssets(r.data as any[]);
        });
      } else {
        alert("Failed: " + res.error);
      }
    }
  };

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  const totalOriginal = assets.reduce((s, a) => s + parseFloat(a.purchasePrice), 0);
  const totalCurrent = assets.reduce((s, a) => s + parseFloat(a.currentValue), 0);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Laptop size={24} style={{ color: "var(--kalki-primary)" }} />
            Fixed Assets Register
          </h1>
          <p className="kalki-page-description">Track equipment, run depreciation, and manage capital expenditures.</p>
        </div>
        <button className="kalki-button kalki-button--primary" style={{ height: "36px" }}>
          <Plus size={16} style={{ marginRight: "8px" }} /> Add Asset
        </button>
      </div>

      {error && (
        <div className="kalki-section" style={{ border: "1px solid var(--kalki-danger)", background: "#fff5f5", marginBottom: "24px" }}>
          <div className="kalki-section-content" style={{ display: "flex", gap: "12px", color: "var(--kalki-danger)", alignItems: "flex-start" }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>Database Error</h3>
              <p style={{ margin: 0, fontSize: "13px", wordBreak: "break-all" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <div className="kalki-section" style={{ position: "relative", margin: 0 }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <Activity size={64} color="var(--kalki-primary)" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Gross Block (Original Cost)</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>₹{totalOriginal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
        <div className="kalki-section" style={{ position: "relative", margin: 0 }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <Activity size={64} color="#16a34a" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Net Block (Current Value)</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>₹{totalCurrent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </div>

      <div className="kalki-section">
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Branch</th>
                <th style={{ textAlign: "right" }}>Purchase Price</th>
                <th style={{ textAlign: "right" }}>Current Value</th>
                <th style={{ textAlign: "right" }}>Depreciation</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>Loading assets...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>No fixed assets recorded yet.</td></tr>
              ) : assets.map(asset => {
                const loc = locations.find(l => l.id === asset.locationId);
                return (
                  <tr key={asset.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--kalki-text-primary)" }}>{asset.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", fontFamily: "monospace" }}>{asset.assetCode}</div>
                    </td>
                    <td>{loc?.name || "Unknown"}</td>
                    <td style={{ textAlign: "right" }}>₹{parseFloat(asset.purchasePrice).toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: "right", fontWeight: "bold", color: "var(--kalki-primary)" }}>₹{parseFloat(asset.currentValue).toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: "right", color: "var(--kalki-text-secondary)" }}>{parseFloat(asset.depreciationRate)}% / yr</td>
                    <td style={{ textAlign: "right" }}>
                      <button onClick={() => handleDepreciate(asset)} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "var(--kalki-primary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 12px", borderRadius: "999px", cursor: "pointer", fontSize: "12px" }}>
                        <ArrowDown size={12} /> Run Depr
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
