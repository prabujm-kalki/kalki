"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Star,
  Zap,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Sliders,
  Filter,
} from "lucide-react";

interface ScoringItem {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  priorityScore: number;
  lifecycleStage: string;
  churnRiskPercentage: string;
  predictedNextVisitDays: number | null;
  monetarySpend: string;
  rfmSegment: string;
  lastCalculatedAt: Date;
}

interface ScoringClientProps {
  organizationId: string;
  scoringList: ScoringItem[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  selectedStage: string;
  minScore: number;
}

export default function ScoringClient(props: ScoringClientProps) {
  const {
    organizationId,
    scoringList,
    currentPage,
    totalPages,
    totalCount,
    selectedStage,
    minScore,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Rule Builder Weights
  const [recencyWeight, setRecencyWeight] = useState(35);
  const [frequencyWeight, setFrequencyWeight] = useState(35);
  const [monetaryWeight, setMonetaryWeight] = useState(30);

  const updateQueryParam = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "" || val === "ALL") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      {/* 1. Header & Actions */}
      <div className="crm-header">
        <div>
          <h1 className="crm-header-title">Predictive Scoring & Lifecycle Model</h1>
          <p className="crm-header-subtitle">
            Dynamic heuristic and statistical weighting to surface highest-priority customer intervention opportunities.
          </p>
        </div>
        <div className="crm-header-actions">
          <button
            onClick={() => router.push(`/marketing/campaigns?organizationId=${organizationId}&filter=VIP`)}
            className="crm-btn-primary"
          >
            <Send size={15} />
            Engage High-Score VIPs
          </button>
        </div>
      </div>

      {/* 2. Top Rule-Builder Section */}
      <div className="crm-card" style={{ marginBottom: "1.25rem" }}>
        <div className="crm-card-header">
          <h2 className="crm-card-title">
            <Sliders size={16} color="#d97706" />
            Priority Score Weighting Rule-Builder (0 - 100 Algorithm)
          </h2>
        </div>
        <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem", marginBottom: "0.4rem" }}>
              <span style={{ fontWeight: 600, color: "#334155" }}>Recency Factor</span>
              <strong style={{ color: "#d97706" }}>{recencyWeight}%</strong>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={recencyWeight}
              onChange={(e) => setRecencyWeight(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "#d97706" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Scores recent visits higher; penalizes dormancy.
            </span>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem", marginBottom: "0.4rem" }}>
              <span style={{ fontWeight: 600, color: "#334155" }}>Order Frequency Factor</span>
              <strong style={{ color: "#d97706" }}>{frequencyWeight}%</strong>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={frequencyWeight}
              onChange={(e) => setFrequencyWeight(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "#d97706" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Weights multi-visit repeat brand loyalty.
            </span>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem", marginBottom: "0.4rem" }}>
              <span style={{ fontWeight: 600, color: "#334155" }}>Monetary Spend Factor</span>
              <strong style={{ color: "#d97706" }}>{monetaryWeight}%</strong>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={monetaryWeight}
              onChange={(e) => setMonetaryWeight(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "#d97706" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Weights overall cumulative gross billing value.
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Controls */}
      <div className="crm-card" style={{ marginBottom: "1rem" }}>
        <div className="crm-filter-bar">
          <div className="crm-filter-group">
            <select
              value={selectedStage}
              onChange={(e) => updateQueryParam({ stage: e.target.value, page: "1" })}
              className="crm-filter-select"
            >
              <option value="ALL">All Lifecycle Stages</option>
              <option value="ACTIVE">Active Patrons</option>
              <option value="AT_RISK">At-Risk Customers</option>
              <option value="DORMANT">Dormant Customers</option>
              <option value="NEW">New Customers</option>
            </select>
          </div>

          <div style={{ fontSize: "0.825rem", color: "#64748b" }}>
            Scored Patrons: <strong style={{ color: "#0f172a" }}>{totalCount}</strong>
          </div>
        </div>
      </div>

      {/* 4. Prioritized Action Table */}
      <div className="crm-card">
        <div className="crm-card-header">
          <h2 className="crm-card-title">
            <Star size={17} color="#d97706" />
            Prioritized Customer Action Ledger ({totalCount})
          </h2>
        </div>

        {scoringList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No scoring records found</p>
          </div>
        ) : (
          <>
            <div className="crm-table-container">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Priority Score (0-100)</th>
                    <th>Customer Name</th>
                    <th>Lifecycle Stage</th>
                    <th>Churn Risk</th>
                    <th>RFM Tier</th>
                    <th>Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {scoringList.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              backgroundColor: item.priorityScore >= 80 ? "#dcfce7" : item.priorityScore >= 50 ? "#fef3c7" : "#fee2e2",
                              color: item.priorityScore >= 80 ? "#166534" : item.priorityScore >= 50 ? "#92400e" : "#991b1b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.95rem",
                            }}
                          >
                            {item.priorityScore}
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {item.priorityScore >= 80 ? "High Priority" : item.priorityScore >= 50 ? "Standard" : "Low Priority"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: "#0f172a", fontSize: "0.9rem", display: "block" }}>
                          {item.customerName}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {item.customerPhone || "No phone logged"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`crm-badge ${
                            item.lifecycleStage === "ACTIVE"
                              ? "crm-badge-champions"
                              : item.lifecycleStage === "AT_RISK"
                              ? "crm-badge-at-risk"
                              : "crm-badge-new"
                          }`}
                        >
                          {item.lifecycleStage}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          {Number(item.churnRiskPercentage) >= 40 && <AlertTriangle size={13} color="#ea580c" />}
                          <span style={{ fontWeight: 600, color: Number(item.churnRiskPercentage) >= 40 ? "#ea580c" : "#64748b" }}>
                            {item.churnRiskPercentage}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.85rem" }}>
                          {item.rfmSegment}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "#16a34a", fontSize: "0.95rem" }}>
                          ₹{Number(item.monetarySpend).toLocaleString("en-IN")}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="crm-pagination-bar">
              <div className="crm-pagination-info">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </div>
              <div className="crm-pagination-controls">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => updateQueryParam({ page: String(currentPage - 1) })}
                  className="crm-page-btn"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((num) => (
                  <button
                    key={num}
                    onClick={() => updateQueryParam({ page: String(num) })}
                    className={`crm-page-btn ${num === currentPage ? "active" : ""}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => updateQueryParam({ page: String(currentPage + 1) })}
                  className="crm-page-btn"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
