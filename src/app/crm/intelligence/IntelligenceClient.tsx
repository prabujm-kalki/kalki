"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  PieChart,
  RefreshCw,
  Send,
  Sliders,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { recalculateRfmSegments } from "@/domains/crm/crmService";
import { GlobalTemplateModal } from "@/components/crm/GlobalTemplateModal";

interface SegmentStat {
  segment: string;
  count: number;
  totalSpend: number;
  avgFrequency: number;
}

interface CohortItem {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  rfmSegment: string;
  recencyDays: number;
  frequencyOrders: number;
  monetarySpend: string;
  priorityScore: number;
  lifecycleStage: string;
  lastCalculatedAt: Date;
}

interface IntelligenceClientProps {
  organizationId: string;
  segmentStats: SegmentStat[];
  cohortList: CohortItem[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  selectedSegment: string;
  recencyMax: number;
  minSpend: number;
}

export default function IntelligenceClient(props: IntelligenceClientProps) {
  const {
    organizationId,
    segmentStats,
    cohortList,
    currentPage,
    totalPages,
    totalCount,
    selectedSegment,
    recencyMax,
    minSpend,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [recalculating, setRecalculating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Threshold sliders
  const [localRecency, setLocalRecency] = useState(recencyMax);
  const [localSpend, setLocalSpend] = useState(minSpend);

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

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await recalculateRfmSegments(organizationId);
      if (res.success) {
        alert(`Successfully recalculated RFM intelligence scores for ${res.count} customers!`);
        router.refresh();
      } else {
        alert(res.error || "Recalculation failed");
      }
    } finally {
      setRecalculating(false);
    }
  };

  const handleSendToMarketing = () => {
    setShowTemplateModal(true);
  };

  const segmentsMap: Record<string, { label: string; desc: string; icon: any; color: string; badge: string }> = {
    CHAMPIONS: {
      label: "Champions",
      desc: "Frequent buyers, highest spenders (High F, High M, Low R)",
      icon: Award,
      color: "#16a34a",
      badge: "crm-badge-champions",
    },
    LOYAL: {
      label: "Loyal Customers",
      desc: "Consistent repeat visits, steady lifetime value",
      icon: TrendingUp,
      color: "#4f46e5",
      badge: "crm-badge-loyal",
    },
    AT_RISK: {
      label: "At Risk",
      desc: "Previously frequent, but haven't visited in 60-120 days",
      icon: AlertTriangle,
      color: "#ea580c",
      badge: "crm-badge-at-risk",
    },
    DORMANT: {
      label: "Dormant / Inactive",
      desc: "No purchases in 120+ days. Requires reactivation offer",
      icon: Clock,
      color: "#dc2626",
      badge: "crm-badge-dormant",
    },
    NEW: {
      label: "New Patrons",
      desc: "Recent first-time diners/buyers, ripe for onboarding",
      icon: Sparkles,
      color: "#64748b",
      badge: "crm-badge-new",
    },
  };

  return (
    <>
      {/* 1. Header & Actions */}
      <div className="crm-header">
        <div>
          <h1 className="crm-header-title">Auto-Segmentation & RFM Engine</h1>
          <p className="crm-header-subtitle">
            Algorithmic Recency, Frequency, and Monetary cohort clustering linked with closed-loop POS sales.
          </p>
        </div>
        <div className="crm-header-actions">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="crm-btn-secondary"
            title="Re-run RFM clustering model against recent POS bills"
          >
            <RefreshCw size={14} className={recalculating ? "animate-spin" : ""} />
            {recalculating ? "Recalculating..." : "Recalculate Segments"}
          </button>
          <button
            onClick={handleSendToMarketing}
            className="crm-btn-primary"
            title="Push selected cohort to WhatsApp Marketing Campaigns"
          >
            <Send size={15} />
            Send to Marketing
          </button>
        </div>
      </div>

      {/* 2. RFM Cohort Summary Cards */}
      <div className="crm-kpi-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {Object.entries(segmentsMap).map(([key, def]) => {
          const stat = segmentStats.find((s) => s.segment === key);
          const count = Number(stat?.count || 0);
          const spend = Number(stat?.totalSpend || 0);
          const isSelected = selectedSegment === key;
          const Icon = def.icon;

          return (
            <div
              key={key}
              onClick={() => updateQueryParam({ segment: isSelected ? "ALL" : key, page: "1" })}
              className="crm-kpi-card"
              style={{
                cursor: "pointer",
                border: isSelected ? `2px solid ${def.color}` : "1px solid #e2e8f0",
                backgroundColor: isSelected ? "#fafafa" : "#ffffff",
                transition: "all 0.15s ease",
              }}
            >
              <div className="crm-kpi-header">
                <span className="crm-kpi-title" style={{ color: def.color }}>
                  {def.label}
                </span>
                <Icon size={16} color={def.color} />
              </div>
              <div className="crm-kpi-value">{count}</div>
              <div className="crm-kpi-meta">
                <span>Total: ₹{spend.toLocaleString("en-IN")}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Threshold Sliders & Cohort Filter Bar */}
      <div className="crm-card" style={{ marginBottom: "1rem" }}>
        <div className="crm-filter-bar">
          <div className="crm-filter-group" style={{ alignItems: "center", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sliders size={16} color="#d97706" />
              <strong style={{ fontSize: "0.85rem", color: "#1e293b" }}>RFM Threshold Sliders:</strong>
            </div>

            {/* Recency Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#475569" }}>
              <span>Recency &lt; {localRecency} Days</span>
              <input
                type="range"
                min="7"
                max="365"
                step="7"
                value={localRecency}
                onChange={(e) => setLocalRecency(parseInt(e.target.value, 10))}
                onMouseUp={() => updateQueryParam({ recencyMax: String(localRecency), page: "1" })}
                style={{ width: "110px", accentColor: "#d97706" }}
              />
            </div>

            {/* Min Spend Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#475569" }}>
              <span>Min Spend &gt; ₹{localSpend}</span>
              <input
                type="range"
                min="0"
                max="25000"
                step="500"
                value={localSpend}
                onChange={(e) => setLocalSpend(parseFloat(e.target.value))}
                onMouseUp={() => updateQueryParam({ minSpend: String(localSpend), page: "1" })}
                style={{ width: "110px", accentColor: "#d97706" }}
              />
            </div>

            {/* Segment Selector */}
            <select
              value={selectedSegment}
              onChange={(e) => updateQueryParam({ segment: e.target.value, page: "1" })}
              className="crm-filter-select"
            >
              <option value="ALL">All Segments</option>
              <option value="CHAMPIONS">Champions</option>
              <option value="LOYAL">Loyal Customers</option>
              <option value="AT_RISK">At Risk</option>
              <option value="DORMANT">Dormant</option>
              <option value="NEW">New</option>
            </select>
          </div>

          <div style={{ fontSize: "0.825rem", color: "#64748b" }}>
            Segment Audience: <strong style={{ color: "#0f172a" }}>{totalCount} Customers</strong>
          </div>
        </div>
      </div>

      {/* 4. Cohort Data Table */}
      <div className="crm-card">
        <div className="crm-card-header">
          <h2 className="crm-card-title">
            <PieChart size={17} color="#d97706" />
            Audience Cohort Ledger ({totalCount})
          </h2>
        </div>

        {cohortList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No customers in this cohort</p>
            <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
              Click &quot;Recalculate Segments&quot; or adjust the RFM threshold sliders above.
            </p>
          </div>
        ) : (
          <>
            <div className="crm-table-container">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>RFM Segment</th>
                    <th>Recency (Days)</th>
                    <th>Frequency (Orders)</th>
                    <th>Monetary Spend</th>
                    <th>Priority Score</th>
                    <th>Lifecycle</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortList.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong style={{ color: "#0f172a", fontSize: "0.9rem", display: "block" }}>
                          {item.customerName}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {item.customerPhone || item.customerEmail || "No contact"}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-badge ${segmentsMap[item.rfmSegment]?.badge || "crm-badge-new"}`}>
                          {segmentsMap[item.rfmSegment]?.label || item.rfmSegment}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "#334155" }}>{item.recencyDays} days ago</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{item.frequencyOrders} orders</span>
                      </td>
                      <td>
                        <strong style={{ color: "#16a34a", fontSize: "0.95rem" }}>
                          ₹{Number(item.monetarySpend).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: "0.9rem",
                              color: item.priorityScore >= 80 ? "#16a34a" : item.priorityScore >= 50 ? "#d97706" : "#64748b",
                            }}
                          >
                            {item.priorityScore}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>/100</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
                          {item.lifecycleStage}
                        </span>
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

      {showTemplateModal && (
        <GlobalTemplateModal
          organizationId={organizationId}
          targetEntityType="CUSTOMER"
          entityIds={cohortList.map((c) => c.customerId)}
          displayData={cohortList.map((c) => ({
            id: c.customerId,
            name: c.customerName,
            contact: c.customerPhone || undefined,
            totalOrders: c.frequencyOrders,
            totalRevenue: parseFloat(c.monetarySpend) || 0,
            rfmSegment: c.rfmSegment,
          }))}
          defaultTemplateName={`campaign_${(selectedSegment || "all").toLowerCase()}_promo_1`}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </>
  );
}
