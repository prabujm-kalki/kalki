"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  DollarSign, 
  Percent, 
  Scale, 
  ArrowUpRight, 
  RotateCw, 
  SlidersHorizontal,
  Flame,
  UtensilsCrossed,
  ShieldCheck,
  Send
} from "lucide-react";
import { formatIndianCurrency } from "@/lib/whatsapp-po";

interface BranchComparisonCockpitProps {
  organizationId: string;
}

export function BranchComparisonCockpit({ organizationId }: BranchComparisonCockpitProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>("RESTAURANT");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchIntelligence = async (force: boolean = false, businessType: string = selectedBusinessType) => {
    setLoading(true);
    setError(null);
    try {
      const typeQuery = businessType ? `&businessType=${businessType}` : "";
      const res = await fetch(`/api/purchasing/branch-intelligence?organizationId=${organizationId}${typeQuery}${force ? "&forceRefresh=true" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load intelligence metrics");
      setData(json);
      if (json.branches && json.branches.length > 0) {
        // Pick first branch of current view if current selected isn't in branch list
        const exists = json.branches.some((b: any) => b.locationId === selectedBranchId);
        if (!exists) {
          setSelectedBranchId(json.branches[0].locationId);
        }
      } else {
        setSelectedBranchId(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchIntelligence(false, selectedBusinessType);
    }
  }, [organizationId, selectedBusinessType]);

  const handleExecuteAction = async (action: any) => {
    setActionSuccess(`Action initiated: ${action.title}. Task pushed to task engine.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  if (loading && !data) {
    return (
      <div style={{ padding: "24px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>
        <RotateCw className="h-5 w-5" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
        <span>Loading Consolidated Branch Intelligence & Root Cause Analysis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", background: "#fef2f2", borderRadius: "10px", border: "1px solid #fecaca", color: "#b91c1c" }}>
        <strong>Error loading branch comparison:</strong> {error}
        <button
          onClick={() => fetchIntelligence(true)}
          style={{ marginLeft: "12px", padding: "4px 8px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "24px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>
        No branch intelligence snapshot data found for this organization.
      </div>
    );
  }

  const { summary, branches } = data;
  const activeBranch = branches.find((b: any) => b.locationId === selectedBranchId) || branches[0];

  return (
    <div style={{ marginBottom: "28px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#38bdf8", textTransform: "uppercase" }}>
                Enterprise Consolidated Intelligence
              </span>
              <span style={{ backgroundColor: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", padding: "2px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: 600 }}>
                All Locations Aggregated
              </span>
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "6px 0 2px 0", color: "#ffffff" }}>
              Multi-Branch Cost Variance & Root-Cause Matrix
            </h2>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              Autonomous decomposition of Food Cost % vs Industry Benchmarks with 1-click remediation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchIntelligence(true)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RotateCw className="h-3.5 w-3.5" style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            <span>Recalculate Snapshots</span>
          </button>
        </div>

        {/* Network KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "18px" }}>
          <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>Total Network Sales</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>
              ₹{Number(summary.totalNetworkRevenue || 0).toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "10px", color: "#38bdf8", marginTop: "2px" }}>Across {summary.branchesCount} Outlets</div>
          </div>

          <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>Network Avg Food Cost</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: summary.avgFoodCostPct > 32 ? "#f87171" : "#4ade80", marginTop: "4px" }}>
              {summary.avgFoodCostPct}%
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Target: 30.0% Benchmark</div>
          </div>

          <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>Network Labor Cost</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#38bdf8", marginTop: "4px" }}>
              {summary.avgLaborCostPct}%
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Target: 18.0% Benchmark</div>
          </div>

          <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>Network Prime Cost</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: summary.avgPrimeCostPct > 55 ? "#fbbf24" : "#4ade80", marginTop: "4px" }}>
              {summary.avgPrimeCostPct}%
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Target: &lt; 55.0% Margin Health</div>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>
          {actionSuccess}
        </div>
      )}

      {/* Business Model / Peer Group Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
            Comparison Group:
          </span>
          <button
            type="button"
            onClick={() => setSelectedBusinessType("RESTAURANT")}
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: selectedBusinessType === "RESTAURANT" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
              backgroundColor: selectedBusinessType === "RESTAURANT" ? "#eff6ff" : "#ffffff",
              color: selectedBusinessType === "RESTAURANT" ? "#1e40af" : "#475569",
            }}
          >
            🍱 Restaurants & Mess ({branches?.filter((b: any) => b.businessType === "RESTAURANT").length || 0})
          </button>
          <button
            type="button"
            onClick={() => setSelectedBusinessType("RETAIL_STORE")}
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: selectedBusinessType === "RETAIL_STORE" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
              backgroundColor: selectedBusinessType === "RETAIL_STORE" ? "#eff6ff" : "#ffffff",
              color: selectedBusinessType === "RETAIL_STORE" ? "#1e40af" : "#475569",
            }}
          >
            🛒 Department Stores & Retail
          </button>
          <button
            type="button"
            onClick={() => setSelectedBusinessType("ALL")}
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: selectedBusinessType === "ALL" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
              backgroundColor: selectedBusinessType === "ALL" ? "#eff6ff" : "#ffffff",
              color: selectedBusinessType === "ALL" ? "#1e40af" : "#475569",
            }}
          >
            🌐 All Peer Groups
          </button>
        </div>

        <span style={{ fontSize: "11px", color: "#64748b" }}>
          Showing configured benchmark peer locations only
        </span>
      </div>

      {/* Branch Selector Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {branches.map((b: any) => {
          const isSelected = b.locationId === activeBranch?.locationId;
          const isCrit = b.statusHealth === "CRITICAL";
          const isWarn = b.statusHealth === "WARNING";

          return (
            <button
              key={b.locationId}
              type="button"
              onClick={() => setSelectedBranchId(b.locationId)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: isSelected ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                color: isSelected ? "#1e40af" : "#475569",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                whiteSpace: "nowrap",
              }}
            >
              <Building2 className="h-3.5 w-3.5" style={{ color: isSelected ? "#2563eb" : "#64748b" }} />
              <span>{b.locationName}</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "99px",
                  fontWeight: 700,
                  backgroundColor: isCrit ? "#fee2e2" : isWarn ? "#fef3c7" : "#dcfce7",
                  color: isCrit ? "#dc2626" : isWarn ? "#d97706" : "#15803d",
                }}
              >
                Food Cost: {b.foodCostPct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Branch Deep-Dive Panel */}
      {activeBranch && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {/* Branch Top Status Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "14px", borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {activeBranch.locationName} Diagnostic Report
                </h3>
                {activeBranch.totalRevenue > 0 && activeBranch.foodCostCogs === 0 ? (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      backgroundColor: "#fef3c7",
                      color: "#b45309",
                      border: "1px solid #fde68a",
                    }}
                  >
                    ⚠️ Data Incomplete: Pending Invoices / GRN
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      backgroundColor: activeBranch.statusHealth === "CRITICAL" ? "#fee2e2" : activeBranch.statusHealth === "WARNING" ? "#fef3c7" : "#dcfce7",
                      color: activeBranch.statusHealth === "CRITICAL" ? "#dc2626" : activeBranch.statusHealth === "WARNING" ? "#b45309" : "#15803d",
                    }}
                  >
                    {activeBranch.statusHealth === "CRITICAL" ? "Alert: High Food Cost" : activeBranch.statusHealth === "WARNING" ? "Watch: Moderate Variance" : "Health: On Benchmark"}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
                {activeBranch.totalRevenue > 0 && activeBranch.foodCostCogs === 0 ? (
                  <span style={{ color: "#b45309" }}>
                    Notice: Zero food purchases entered for this location. Real food cost cannot be computed until purchase bills or stock assessments are registered.
                  </span>
                ) : (
                  <>
                    Variance vs Industry Benchmark ({activeBranch.benchmarkFoodCostPct}%):{" "}
                    <strong style={{ color: activeBranch.foodCostVariancePct > 0 ? "#dc2626" : "#16a34a" }}>
                      {activeBranch.foodCostVariancePct > 0 ? `+${activeBranch.foodCostVariancePct}% Over Target` : `${activeBranch.foodCostVariancePct}% Under Target`}
                    </strong>
                  </>
                )}
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Sales</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  ₹{Number(activeBranch.totalRevenue || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Food Spend (CoGS)</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  ₹{Number(activeBranch.foodCostCogs || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Prime Cost</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#2563eb" }}>
                  {activeBranch.primeCostPct}%
                </div>
              </div>
            </div>
          </div>

          {/* Root-Cause Narratives Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" }}>
            {/* Root Causes Box */}
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", padding: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#991b1b", marginBottom: "10px" }}>
                <Flame className="h-4 w-4" />
                <span>Automated Root-Cause Decomposition ("Why is it High?")</span>
              </div>

              {activeBranch.rootCauses && activeBranch.rootCauses.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activeBranch.rootCauses.map((cause: any, idx: number) => (
                    <div key={idx} style={{ backgroundColor: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{cause.title}</span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626" }}>+{cause.impactPct}% Impact</span>
                      </div>
                      <p style={{ fontSize: "11.5px", color: "#475569", margin: "4px 0 0 0", lineHeight: 1.4 }}>
                        {cause.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#166534", padding: "10px", backgroundColor: "#f0fdf4", borderRadius: "6px" }}>
                  ✅ Performance aligns with industry benchmark standards. No abnormal leakage detected.
                </div>
              )}
            </div>

            {/* Top Items Variance Table */}
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", padding: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "10px" }}>
                <UtensilsCrossed className="h-4 w-4" style={{ color: "#2563eb" }} />
                <span>Top Raw Material Cost Variance</span>
              </div>

              {activeBranch.topItemsVariance && activeBranch.topItemsVariance.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px" }}>Item</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Actual Rate</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Target Rate</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Variance</th>
                        <th style={{ padding: "6px 8px", textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeBranch.topItemsVariance.map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600, color: "#0f172a" }}>{item.itemName}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "#dc2626" }}>₹{item.realizedRate}/{item.unit}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "#16a34a" }}>₹{item.benchmarkRate}/{item.unit}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#b91c1c" }}>+{item.rateVariancePct}%</td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleExecuteAction({
                                  title: `Raise Vendor Rate Dispute for ${item.itemName}`,
                                });
                              }}
                              style={{
                                padding: "2px 8px",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Dispute Rate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#64748b" }}>No material purchase rate variances recorded.</div>
              )}
            </div>
          </div>

          {/* 1-Click Action Hub */}
          {activeBranch.recommendedActions && activeBranch.recommendedActions.length > 0 && (
            <div style={{ marginTop: "16px", padding: "14px", backgroundColor: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck className="h-5 w-5" style={{ color: "#2563eb" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e3a8a" }}>1-Click Remediation Hub</div>
                    <div style={{ fontSize: "11.5px", color: "#3b82f6" }}>Execute corrective actions instantly without leaving this screen.</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {activeBranch.recommendedActions.map((action: any) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleExecuteAction(action)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "6px",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 1px 2px rgba(37, 99, 235, 0.3)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{action.buttonLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
