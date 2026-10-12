"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { launchMarketingCampaign } from "@/domains/marketing/campaignService";
import {
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  X,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Zap,
  Search,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CampaignDetailDrawer from "@/components/marketing/CampaignDetailDrawer";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import "../marketing.css";

interface CampaignItem {
  id: string;
  name: string;
  channel: string;
  templateName: string;
  templateLanguage: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  conversions72hCount: number;
  conversions72hRevenue: string;
  conversions7dCount: number;
  conversions7dRevenue: string;
  conversions30dCount: number;
  conversions30dRevenue: string;
  estimatedApiCost: string;
  totalAttributedRevenue: string;
  roiPercentage: string;
  launchedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function MarketingCampaignsPage() {
  const { selected } = useSessionView();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "REVENUE" | "COST" | "ROI">("NEWEST");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal State for Launch Campaign
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [templateSelectionMode, setTemplateSelectionMode] = useState<"SELECT" | "CUSTOM">("SELECT");
  const [templateName, setTemplateName] = useState("hello_world");
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [templateVariables, setTemplateVariables] = useState("");
  const [audienceType, setAudienceType] = useState<"ALL_CUSTOMERS" | "CUSTOM_LIST">("ALL_CUSTOMERS");
  const [customPhones, setCustomPhones] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState<string | null>(null);

  // Close modal on Escape key press
  useEscapeKey(() => setIsModalOpen(false), isModalOpen);
  // Close detail drawer on Escape key press (when modal is not open)
  useEscapeKey(() => setSelectedCampaignId(null), !!selectedCampaignId && !isModalOpen);

  const fetchCampaigns = async () => {
    if (!selected?.organizationId) return;
    setLoading(true);
    try {
      const locParam = selected.locationId ? `&locationId=${selected.locationId}` : "";
      const res = await fetch(`/api/marketing/campaigns?organizationId=${selected.organizationId}${locParam}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCampaigns(json.data);
      }
    } catch (e) {
      console.error("[Fetch Campaigns Error]:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (e: React.MouseEvent, campaign: CampaignItem) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete campaign "${campaign.name}"?\n\nThis will remove the campaign record and its associated audience log.`
    );
    if (!confirmed) return;

    setDeletingId(campaign.id);
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaign.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (selectedCampaignId === campaign.id) {
          setSelectedCampaignId(null);
        }
        await fetchCampaigns();
      } else {
        alert(data.error || "Failed to delete campaign");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  const fetchAvailableTemplates = async () => {
    if (!selected?.organizationId) return;
    try {
      const res = await fetch(`/api/marketing/templates?organizationId=${selected.organizationId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setAvailableTemplates(json.data);
        if (!templateName || templateName === "hello_world") {
          const first = json.data[0];
          setTemplateName(first.name);
          setTemplateLanguage(first.language || "en");
        }
      }
    } catch (e) {
      console.error("[Fetch Templates Error]:", e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchAvailableTemplates();
  }, [selected?.organizationId, selected?.locationId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tpl = params.get("template");
      if (tpl) {
        setTemplateName(tpl);
        setIsModalOpen(true);
      }
      const viewId = params.get("viewId");
      if (viewId) {
        setSelectedCampaignId(viewId);
      }
    }
  }, []);

  // Aggregate Executive ROI Header Metrics
  const totalMarketingSpend = campaigns.reduce(
    (acc, c) => acc + Number(c.estimatedApiCost || 0),
    0
  );

  const totalAttributedRevenue = campaigns.reduce(
    (acc, c) => acc + Number(c.totalAttributedRevenue || 0),
    0
  );

  const blendedRoi =
    totalMarketingSpend > 0
      ? (((totalAttributedRevenue - totalMarketingSpend) / totalMarketingSpend) * 100).toFixed(2)
      : "0.00";

  // Handle Form Submission invoking Server Action
  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTemplate = (
      templateSelectionMode === "CUSTOM" ? customTemplateName : templateName
    ).trim();

    if (!name.trim() || !effectiveTemplate || !selected?.organizationId) return;

    setLaunching(true);
    setLaunchError(null);
    setLaunchSuccess(null);

    const phones = customPhones
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 10);

    const rawVars = templateVariables
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      const result = await launchMarketingCampaign({
        organizationId: selected.organizationId,
        locationId: selected.locationId || null,
        name: name.trim(),
        templateName: effectiveTemplate,
        templateLanguage,
        channel: "WHATSAPP",
        audienceType,
        customNumbers: audienceType === "CUSTOM_LIST" ? phones : undefined,
        templateParams: rawVars.length > 0 ? rawVars : undefined,
      });

      if (result.success) {
        setLaunchSuccess(
          `Campaign launched successfully! ${result.sentCount || 0} messages dispatched.`
        );
        setTimeout(() => {
          setIsModalOpen(false);
          setName("");
          setCustomPhones("");
          setLaunchSuccess(null);
          fetchCampaigns();
        }, 1200);
      } else {
        setLaunchError(result.error || "Failed to launch campaign.");
      }
    } catch (err: any) {
      setLaunchError(err?.message || "Execution exception occurred during dispatch.");
    } finally {
      setLaunching(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Filter, Search, and Sort Logic
  const filteredCampaigns = campaigns.filter((camp) => {
    // 1. Text Search (matches name, template, or channel)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = camp.name?.toLowerCase().includes(q);
      const matchTemplate = camp.templateName?.toLowerCase().includes(q);
      const matchStatus = camp.status?.toLowerCase().includes(q);
      if (!matchName && !matchTemplate && !matchStatus) return false;
    }

    // 2. Status Filter
    if (statusFilter !== "ALL" && camp.status !== statusFilter) {
      return false;
    }

    // 3. Date / Time Filter
    if (dateFilter !== "ALL" && camp.createdAt) {
      const campDate = new Date(camp.createdAt);
      const now = new Date();
      if (dateFilter === "TODAY") {
        if (
          campDate.getDate() !== now.getDate() ||
          campDate.getMonth() !== now.getMonth() ||
          campDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      } else if (dateFilter === "LAST_7D") {
        const diffDays = (now.getTime() - campDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === "LAST_30D") {
        const diffDays = (now.getTime() - campDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }
    }

    return true;
  });

  // Sorting
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (sortBy === "NEWEST") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "OLDEST") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === "REVENUE") {
      return Number(b.totalAttributedRevenue || 0) - Number(a.totalAttributedRevenue || 0);
    }
    if (sortBy === "COST") {
      return Number(b.estimatedApiCost || 0) - Number(a.estimatedApiCost || 0);
    }
    if (sortBy === "ROI") {
      return Number(b.roiPercentage || 0) - Number(a.roiPercentage || 0);
    }
    return 0;
  });

  // Pagination (10 per page)
  const totalPages = Math.ceil(sortedCampaigns.length / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedCampaigns = sortedCampaigns.slice(startIndex, startIndex + pageSize);

  // Helper for pagination page numbers [1, 2, 3...]
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="marketing-container">
      {/* 1. Header & Actions */}
      <div className="marketing-header">
        <div>
          <h1 className="marketing-header-title">Executive Campaign Dashboard</h1>
          <p className="marketing-header-subtitle">
            Closed-loop multi-channel attribution and POS conversion ROI modeling.
          </p>
        </div>
        <div className="marketing-header-actions">
          <button
            onClick={fetchCampaigns}
            className="kalki-btn-secondary"
            title="Refresh Ledger"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="kalki-btn-primary"
          >
            <Plus size={16} />
            Launch Campaign
          </button>
        </div>
      </div>

      {/* 2. Global ROI Header (3-Column Executive KPI Cards) */}
      <div className="marketing-kpi-grid">
        {/* KPI 1: Total Marketing Spend */}
        <div className="marketing-kpi-card">
          <div className="marketing-kpi-card-header">
            <span className="marketing-kpi-title">Total Marketing Spend</span>
            <div className="marketing-kpi-icon-wrap marketing-kpi-icon-spend">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="marketing-kpi-value">{formatCurrency(totalMarketingSpend)}</div>
          <div className="marketing-kpi-meta">
            <span>Aggregated Meta WhatsApp API template fees</span>
          </div>
        </div>

        {/* KPI 2: Total Attributed Revenue */}
        <div className="marketing-kpi-card">
          <div className="marketing-kpi-card-header">
            <span className="marketing-kpi-title">Total Attributed Revenue</span>
            <div className="marketing-kpi-icon-wrap marketing-kpi-icon-revenue">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="marketing-kpi-value">{formatCurrency(totalAttributedRevenue)}</div>
          <div className="marketing-kpi-meta">
            <span style={{ color: "#16a34a", fontWeight: 600 }}>Closed-Loop POS Sales</span>
            <span>across 72h / 7d / 30d</span>
          </div>
        </div>

        {/* KPI 3: Blended ROI % */}
        <div className="marketing-kpi-card">
          <div className="marketing-kpi-card-header">
            <span className="marketing-kpi-title">Blended Marketing ROI</span>
            <div className="marketing-kpi-icon-wrap marketing-kpi-icon-roi">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="marketing-kpi-value" style={{ color: Number(blendedRoi) >= 0 ? "#7c3aed" : "#ef4444" }}>
            {Number(blendedRoi) > 0 ? `+${blendedRoi}%` : `${blendedRoi}%`}
          </div>
          <div className="marketing-kpi-meta">
            <span>Net return on WhatsApp broadcast investments</span>
          </div>
        </div>
      </div>

      {/* 3. Campaign Attribution Ledger (Data Table & Mobile Cards) */}
      <div className="marketing-ledger-card">
        <div className="marketing-ledger-header">
          <h2 className="marketing-ledger-title">
            <Megaphone size={18} color="#16a34a" />
            Campaign Attribution Ledger ({sortedCampaigns.length})
          </h2>
        </div>

        {/* Industry-Standard Best Practice Filter & Search Toolbar */}
        <div className="marketing-filter-bar">
          <div className="marketing-filter-group">
            {/* Search by Campaign Name / Template */}
            <div className="marketing-search-input-wrap">
              <Search size={15} className="marketing-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, template..."
                className="marketing-search-input"
              />
            </div>

            {/* Date / Time Filter */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="marketing-filter-select"
              title="Filter by date range"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="LAST_7D">Last 7 Days</option>
              <option value="LAST_30D">Last 30 Days</option>
            </select>

            {/* Status / Result Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="marketing-filter-select"
              title="Filter by campaign status"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="RUNNING">Running</option>
              <option value="DRAFT">Draft</option>
            </select>

            {/* Sort Filter (Amount, ROI, Date) */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="marketing-filter-select"
              title="Sort campaigns"
            >
              <option value="NEWEST">Sort: Newest First</option>
              <option value="OLDEST">Sort: Oldest First</option>
              <option value="REVENUE">Sort: Highest Revenue (₹)</option>
              <option value="COST">Sort: Highest Cost (₹)</option>
              <option value="ROI">Sort: Highest ROI (%)</option>
            </select>
          </div>

          {(searchQuery || statusFilter !== "ALL" || dateFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setDateFilter("ALL");
                setCurrentPage(1);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: "0.8rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {sortedCampaigns.length === 0 ? (
          <div className="marketing-empty-state">
            <Megaphone size={40} className="marketing-empty-icon" />
            <div className="marketing-empty-title">
              {campaigns.length === 0 ? "No campaigns launched yet" : "No matching campaigns found"}
            </div>
            <p className="marketing-empty-desc">
              {campaigns.length === 0
                ? "Broadcast pre-approved Meta WhatsApp templates to your customer base to track closed-loop POS sales ROI."
                : "Try adjusting your search query, date range, or status filter to view campaigns."}
            </p>
            {campaigns.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="kalki-btn-primary"
              >
                <Plus size={16} />
                Launch First Campaign
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="marketing-table-container">
              <table className="marketing-table">
                <thead>
                  <tr>
                    <th>Campaign Details</th>
                    <th>Delivery Funnel</th>
                    <th>Conversion Funnel (72h / 7d / 30d)</th>
                    <th>Total Attributed</th>
                    <th>Cost & ROI</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCampaigns.map((camp) => (
                    <tr
                      key={camp.id}
                      onClick={() => setSelectedCampaignId(camp.id)}
                      className="clickable-row"
                      title="Click to view detailed recipient ledger & conversion analytics"
                    >
                      {/* Campaign Details */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <strong style={{ color: "#0f172a", fontSize: "0.92rem", display: "block" }}>
                            {camp.name}
                          </strong>
                          <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>
                            View details →
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                          <span
                            className={`kalki-badge ${
                              camp.status === "COMPLETED"
                                ? "kalki-badge-completed"
                                : camp.status === "RUNNING"
                                ? "kalki-badge-running"
                                : "kalki-badge-draft"
                            }`}
                          >
                            {camp.status}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {camp.launchedAt
                              ? new Date(camp.launchedAt).toLocaleDateString()
                              : camp.createdAt
                              ? new Date(camp.createdAt).toLocaleDateString()
                              : "Draft"}
                          </span>
                        </div>
                      </td>

                      {/* Delivery Funnel */}
                      <td>
                        <div className="funnel-chips">
                          <span className="funnel-chip funnel-sent" title="Sent Count">
                            <Send size={11} /> {camp.sentCount}
                          </span>
                          <span className="funnel-divider">→</span>
                          <span className="funnel-chip funnel-delivered" title="Delivered Count">
                            <Check size={11} /> {camp.deliveredCount}
                          </span>
                          <span className="funnel-divider">→</span>
                          <span className="funnel-chip funnel-read" title="Read Count">
                            <Eye size={11} /> {camp.readCount}
                          </span>
                        </div>
                        {camp.failedCount > 0 && (
                          <span style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 600, display: "block", marginTop: "0.25rem" }}>
                            {camp.failedCount} Failed
                          </span>
                        )}
                      </td>

                      {/* Conversion Funnel */}
                      <td>
                        <div className="conversion-windows">
                          <div className="conversion-window-item">
                            <span className="window-label">72 Hours:</span>
                            <span className="window-rev window-72h">
                              {formatCurrency(camp.conversions72hRevenue)} ({camp.conversions72hCount})
                            </span>
                          </div>
                          <div className="conversion-window-item">
                            <span className="window-label">7 Days:</span>
                            <span className="window-rev">
                              {formatCurrency(camp.conversions7dRevenue)} ({camp.conversions7dCount})
                            </span>
                          </div>
                          <div className="conversion-window-item">
                            <span className="window-label">30 Days:</span>
                            <span className="window-rev">
                              {formatCurrency(camp.conversions30dRevenue)} ({camp.conversions30dCount})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Total Attributed Revenue */}
                      <td>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>
                          {formatCurrency(camp.totalAttributedRevenue)}
                        </div>
                      </td>

                      {/* Cost & ROI */}
                      <td>
                        <div style={{ fontSize: "0.825rem", color: "#64748b" }}>
                          Cost: <strong style={{ color: "#334155" }}>{formatCurrency(camp.estimatedApiCost)}</strong>
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            marginTop: "0.2rem",
                            color: Number(camp.roiPercentage || 0) > 0 ? "#16a34a" : "#64748b",
                          }}
                        >
                          {Number(camp.roiPercentage || 0) > 0 ? `+${camp.roiPercentage}% ROI` : `${camp.roiPercentage || 0}% ROI`}
                        </div>
                      </td>

                      {/* Actions (Delete Campaign) */}
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCampaign(e, camp)}
                          disabled={deletingId === camp.id}
                          className="marketing-btn-delete-row"
                          title="Delete Campaign"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack (@media max-width: 768px) */}
            <div className="marketing-mobile-cards">
              {paginatedCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  onClick={() => setSelectedCampaignId(camp.id)}
                  className="marketing-card-item clickable-recent-item"
                  style={{ cursor: "pointer" }}
                  title="Click to view full campaign & audience ledger"
                >
                  <div className="marketing-card-item-top">
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{camp.name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>
                        {camp.launchedAt ? new Date(camp.launchedAt).toLocaleDateString() : "Draft"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        className={`kalki-badge ${
                          camp.status === "COMPLETED"
                            ? "kalki-badge-completed"
                            : camp.status === "RUNNING"
                            ? "kalki-badge-running"
                            : "kalki-badge-draft"
                        }`}
                      >
                        {camp.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCampaign(e, camp)}
                        disabled={deletingId === camp.id}
                        className="marketing-btn-delete-row"
                        title="Delete Campaign"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.3rem" }}>
                      DELIVERY FUNNEL
                    </div>
                    <div className="funnel-chips">
                      <span className="funnel-chip funnel-sent">Sent: {camp.sentCount}</span>
                      <span className="funnel-divider">→</span>
                      <span className="funnel-chip funnel-delivered">Delivered: {camp.deliveredCount}</span>
                      <span className="funnel-divider">→</span>
                      <span className="funnel-chip funnel-read">Read: {camp.readCount}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.3rem" }}>
                      ATTRIBUTED REVENUE
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                        {formatCurrency(camp.totalAttributedRevenue)}
                      </span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#16a34a" }}>
                        {camp.roiPercentage || 0}% ROI
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls (1, 2, 3...) */}
            <div className="marketing-pagination-bar">
              <div className="marketing-pagination-info">
                Showing {sortedCampaigns.length > 0 ? startIndex + 1 : 0} to{" "}
                {Math.min(startIndex + pageSize, sortedCampaigns.length)} of {sortedCampaigns.length} campaigns
              </div>
              <div className="marketing-pagination-controls">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={validCurrentPage === 1}
                  className="marketing-page-btn"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`marketing-page-btn ${num === validCurrentPage ? "active" : ""}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={validCurrentPage === totalPages}
                  className="marketing-page-btn"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* 4. Launch Campaign Modal */}
      {isModalOpen && (
        <div className="kalki-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="kalki-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="kalki-modal-header">
              <h3 className="kalki-modal-title">
                <Megaphone size={20} color="#16a34a" />
                Launch WhatsApp Marketing Campaign
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="kalki-modal-close-btn"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLaunchCampaign} className="kalki-modal-form">
              <div className="kalki-modal-body">
                {/* Campaign Name */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Campaign Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diwali Mega Sale 2026 Blast"
                    className="kalki-form-input"
                  />
                </div>

                {/* Template Selection */}
                <div className="kalki-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label className="kalki-form-label" style={{ margin: 0 }}>Pre-Approved Meta Template *</label>
                    <button
                      type="button"
                      onClick={() => setTemplateSelectionMode((m) => (m === "SELECT" ? "CUSTOM" : "SELECT"))}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#16a34a",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {templateSelectionMode === "SELECT" ? "+ Enter Custom Template Name" : "← Pick from Pre-defined"}
                    </button>
                  </div>

                  {templateSelectionMode === "SELECT" ? (
                    <select
                      value={templateName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTemplateName(val);
                        const match = availableTemplates.find((t) => t.name === val);
                        if (match && match.language) {
                          setTemplateLanguage(match.language);
                        }
                      }}
                      className="kalki-form-select"
                    >
                      {availableTemplates.length > 0 ? (
                        availableTemplates.map((t) => (
                          <option key={`${t.name}-${t.language}`} value={t.name}>
                            {t.displayName || t.name} ({t.language}) • {t.category || "APPROVED"}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="hello_world">hello_world (en_US) • Meta Default</option>
                          <option value="diwali_offer_special">diwali_offer_special (Marketing)</option>
                        </>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={customTemplateName}
                      onChange={(e) => setCustomTemplateName(e.target.value)}
                      placeholder="e.g. deepavali_offer, diwali_blast (exact name in Meta)"
                      className="kalki-form-input"
                    />
                  )}
                  <span className="kalki-form-hint">
                    Template name must exactly match the approved name in your Meta WhatsApp Manager.
                  </span>
                </div>

                {/* Template Language */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Template Language *</label>
                  <select
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    className="kalki-form-select"
                  >
                    <option value="en_US">en_US (English - US)</option>
                    <option value="en">en (English)</option>
                    <option value="en_GB">en_GB (English - UK)</option>
                    <option value="ta">ta (Tamil)</option>
                    <option value="hi">hi (Hindi)</option>
                  </select>
                  <span className="kalki-form-hint">
                    Must match the language configured during Meta approval (most custom templates in India use &apos;en&apos; or &apos;en_GB&apos;).
                  </span>
                </div>

                {/* Optional Template Parameters */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Template Parameters (Optional)</label>
                  <input
                    type="text"
                    value={templateVariables}
                    onChange={(e) => setTemplateVariables(e.target.value)}
                    placeholder="e.g. 20% OFF, DIWALI26 (comma separated if template contains {{1}}, {{2}})"
                    className="kalki-form-input"
                  />
                  <span className="kalki-form-hint">
                    Leave blank if your template does not have variable placeholders.
                  </span>
                </div>

                {/* Target Audience */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Audience Selection *</label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value as any)}
                    className="kalki-form-select"
                  >
                    <option value="ALL_CUSTOMERS">All ERP Customers (Registered 10-Digit Phones)</option>
                    <option value="CUSTOM_LIST">Custom Phone Numbers List</option>
                  </select>
                </div>

                {/* Custom Phone Numbers Textarea */}
                {audienceType === "CUSTOM_LIST" && (
                  <div className="kalki-form-group">
                    <label className="kalki-form-label">Recipient Phone Numbers *</label>
                    <textarea
                      rows={3}
                      required
                      value={customPhones}
                      onChange={(e) => setCustomPhones(e.target.value)}
                      placeholder="9790014356, 9842771993, 9876543210 (comma or newline separated)"
                      className="kalki-form-textarea"
                    />
                    <span className="kalki-form-hint">
                      Enter 10-digit mobile numbers with or without country codes.
                    </span>
                  </div>
                )}

                {/* Feedback Alerts */}
                {launchError && (
                  <div className="kalki-alert-error">
                    <AlertCircle size={16} />
                    <span>{launchError}</span>
                  </div>
                )}

                {launchSuccess && (
                  <div className="kalki-alert-success">
                    <CheckCircle2 size={16} />
                    <span>{launchSuccess}</span>
                  </div>
                )}
              </div>

              <div className="kalki-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="kalki-btn-secondary"
                  disabled={launching}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={launching}
                  className="kalki-btn-primary"
                >
                  <Send size={15} />
                  {launching ? "Dispatching..." : "Launch Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Slide-Over Campaign Record Details Drawer */}
      <CampaignDetailDrawer
        campaignId={selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        organizationId={selected?.organizationId}
        locationId={selected?.locationId || undefined}
      />
    </div>
  );
}
