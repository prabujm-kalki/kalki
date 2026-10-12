"use client";

import { useState, useEffect } from "react";
import {
  X,
  Megaphone,
  Send,
  Check,
  Eye,
  AlertCircle,
  TrendingUp,
  Receipt,
  Users,
  Clock,
  ExternalLink,
  Search,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface AudienceItem {
  id: string;
  campaignId: string;
  customerId: string | null;
  recipientPhone: string;
  metaMessageId: string | null;
  deliveryStatus: string;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  isConverted: boolean;
  convertedInvoiceId: string | null;
  conversionWindow: string | null;
  conversionAmount: string;
  convertedAt: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  invoiceNumber: string | null;
  invoiceGrandTotal: string | null;
  invoiceDate: string | null;
}

interface CampaignDetailData {
  campaign: {
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
  };
  audiences: AudienceItem[];
}

interface CampaignDetailDrawerProps {
  campaignId: string | null;
  onClose: () => void;
  organizationId?: string;
  locationId?: string;
}

export default function CampaignDetailDrawer({
  campaignId,
  onClose,
  organizationId,
  locationId,
}: CampaignDetailDrawerProps) {
  const [data, setData] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"audiences" | "conversions">("audiences");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!campaignId) {
      setData(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/marketing/campaigns/${campaignId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Error fetching campaign details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [campaignId]);

  // Handle ESC key press
  useEscapeKey(onClose, !!campaignId);

  if (!campaignId) return null;

  const campaign = data?.campaign;
  const audiences = data?.audiences || [];

  const convertedAudiences = audiences.filter((a) => a.isConverted);

  // Filtered audience records
  const filteredAudiences = audiences.filter((a) => {
    const matchesSearch =
      a.recipientPhone.includes(searchTerm) ||
      (a.customerName && a.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "CONVERTED") return a.isConverted;
    return a.deliveryStatus === statusFilter;
  });

  const formatCurrency = (val: string | number | null | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const queryParams = organizationId
    ? `?organizationId=${organizationId}&locationId=${locationId || ""}`
    : "";

  return (
    <div className="kalki-drawer-overlay" onClick={onClose}>
      <div className="kalki-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="kalki-drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Megaphone size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                  {campaign?.name || "Campaign Details"}
                </h2>
                {campaign && (
                  <span
                    className={`kalki-badge ${
                      campaign.status === "COMPLETED"
                        ? "kalki-badge-completed"
                        : campaign.status === "RUNNING"
                        ? "kalki-badge-running"
                        : "kalki-badge-draft"
                    }`}
                  >
                    {campaign.status}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                Template: <code style={{ color: "#047857", fontWeight: 600 }}>{campaign?.templateName}</code> (
                {campaign?.templateLanguage}) • {campaign?.channel}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="kalki-modal-close-btn"
            title="Close Drawer (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="kalki-drawer-body">
          {loading ? (
            <div style={{ padding: "4rem 0", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 1rem auto" }} />
              <div>Loading real-time campaign performance...</div>
            </div>
          ) : !campaign ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#ef4444" }}>
              <AlertCircle size={32} style={{ margin: "0 auto 0.75rem auto" }} />
              <div>Failed to load campaign records.</div>
            </div>
          ) : (
            <>
              {/* Financial & Conversion KPI Cards */}
              <div className="kalki-drawer-kpis">
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    padding: "0.85rem",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                    Marketing Spend
                  </span>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>
                    {formatCurrency(campaign.estimatedApiCost)}
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Meta API fees</span>
                </div>

                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "0.5rem",
                    padding: "0.85rem",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>
                    Attributed POS Sales
                  </span>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#15803d", marginTop: "0.2rem" }}>
                    {formatCurrency(campaign.totalAttributedRevenue)}
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#166534" }}>Closed-loop conversion</span>
                </div>

                <div
                  style={{
                    backgroundColor: "#faf5ff",
                    border: "1px solid #e9d5ff",
                    borderRadius: "0.5rem",
                    padding: "0.85rem",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: "#7e22ce", fontWeight: 600, textTransform: "uppercase" }}>
                    Marketing ROI
                  </span>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#9333ea", marginTop: "0.2rem" }}>
                    {Number(campaign.roiPercentage || 0) > 0 ? `+${campaign.roiPercentage}%` : `${campaign.roiPercentage || 0}%`}
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#7e22ce" }}>Net campaign yield</span>
                </div>

                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "0.5rem",
                    padding: "0.85rem",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: "#1e40af", fontWeight: 600, textTransform: "uppercase" }}>
                    POS Conversions
                  </span>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#2563eb", marginTop: "0.2rem" }}>
                    {convertedAudiences.length}
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#1e40af" }}>
                    out of {campaign.totalRecipients} recipients
                  </span>
                </div>
              </div>

              {/* Delivery Funnel Bar */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Message Delivery Funnel
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Launched: {campaign.launchedAt ? new Date(campaign.launchedAt).toLocaleString() : "N/A"}
                  </span>
                </div>

                <div className="funnel-chips" style={{ justifyContent: "flex-start" }}>
                  <span className="funnel-chip funnel-sent" title="Sent Count">
                    <Send size={12} /> {campaign.sentCount} Dispatched
                  </span>
                  <span className="funnel-divider">→</span>
                  <span className="funnel-chip funnel-delivered" title="Delivered Count">
                    <Check size={12} /> {campaign.deliveredCount} Delivered
                  </span>
                  <span className="funnel-divider">→</span>
                  <span className="funnel-chip funnel-read" title="Read Count">
                    <Eye size={12} /> {campaign.readCount} Read
                  </span>
                  {campaign.failedCount > 0 && (
                    <span
                      style={{
                        padding: "0.3rem 0.6rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: "#fef2f2",
                        color: "#ef4444",
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <AlertCircle size={12} /> {campaign.failedCount} Failed
                    </span>
                  )}
                </div>
              </div>

              {/* Drawer Tabs */}
              <div className="kalki-drawer-tabs">
                <button
                  onClick={() => setActiveTab("audiences")}
                  className={`kalki-drawer-tab-btn ${activeTab === "audiences" ? "active" : ""}`}
                >
                  <Users size={15} />
                  Audience Recipients ({audiences.length})
                </button>
                <button
                  onClick={() => setActiveTab("conversions")}
                  className={`kalki-drawer-tab-btn ${activeTab === "conversions" ? "active" : ""}`}
                >
                  <Receipt size={15} />
                  Attributed Invoices ({convertedAudiences.length})
                </button>
              </div>

              {/* Tab 1: Audience Recipients */}
              {activeTab === "audiences" && (
                <div>
                  {/* Filter & Search Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {[
                        { key: "ALL", label: `All (${audiences.length})` },
                        { key: "READ", label: `Read (${campaign.readCount})` },
                        { key: "DELIVERED", label: `Delivered (${campaign.deliveredCount})` },
                        { key: "SENT", label: `Sent (${campaign.sentCount})` },
                        { key: "FAILED", label: `Failed (${campaign.failedCount})` },
                        { key: "CONVERTED", label: `Converted (${convertedAudiences.length})` },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setStatusFilter(tab.key)}
                          style={{
                            padding: "0.3rem 0.6rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            border: `1px solid ${statusFilter === tab.key ? "#16a34a" : "#cbd5e1"}`,
                            backgroundColor: statusFilter === tab.key ? "#f0fdf4" : "#ffffff",
                            color: statusFilter === tab.key ? "#16a34a" : "#475569",
                            cursor: "pointer",
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ position: "relative", minWidth: "180px" }}>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search phone or name..."
                        style={{
                          width: "100%",
                          padding: "0.35rem 0.65rem 0.35rem 1.8rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.78rem",
                          outline: "none",
                        }}
                      />
                      <Search
                        size={13}
                        style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                      />
                    </div>
                  </div>

                  {/* Recipient Ledger Table */}
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                            textAlign: "left",
                            color: "#64748b",
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                          }}
                        >
                          <th style={{ padding: "0.6rem 0.85rem" }}>Recipient</th>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Delivery Status</th>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Timestamps</th>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Conversion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAudiences.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                              No recipients found matching the filter.
                            </td>
                          </tr>
                        ) : (
                          filteredAudiences.map((aud) => (
                            <tr key={aud.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "0.65rem 0.85rem" }}>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                  {aud.customerName || "Customer"}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                                  {aud.recipientPhone}
                                </div>
                              </td>

                              <td style={{ padding: "0.65rem 0.85rem" }}>
                                <span
                                  style={{
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "0.25rem",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor:
                                      aud.deliveryStatus === "READ"
                                        ? "#f3e8ff"
                                        : aud.deliveryStatus === "DELIVERED"
                                        ? "#e0e7ff"
                                        : aud.deliveryStatus === "SENT"
                                        ? "#dcfce7"
                                        : "#fee2e2",
                                    color:
                                      aud.deliveryStatus === "READ"
                                        ? "#9333ea"
                                        : aud.deliveryStatus === "DELIVERED"
                                        ? "#4338ca"
                                        : aud.deliveryStatus === "SENT"
                                        ? "#15803d"
                                        : "#b91c1c",
                                  }}
                                >
                                  {aud.deliveryStatus}
                                </span>
                                {aud.errorMessage && (
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: "0.68rem",
                                      color: "#ef4444",
                                      marginTop: "0.2rem",
                                      maxWidth: "140px",
                                    }}
                                  >
                                    {aud.errorMessage}
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: "0.65rem 0.85rem", fontSize: "0.72rem", color: "#64748b" }}>
                                {aud.readAt ? (
                                  <div>Read: {new Date(aud.readAt).toLocaleTimeString()}</div>
                                ) : aud.deliveredAt ? (
                                  <div>Delivered: {new Date(aud.deliveredAt).toLocaleTimeString()}</div>
                                ) : aud.sentAt ? (
                                  <div>Sent: {new Date(aud.sentAt).toLocaleTimeString()}</div>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td style={{ padding: "0.65rem 0.85rem" }}>
                                {aud.isConverted ? (
                                  <div>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                        padding: "0.2rem 0.45rem",
                                        borderRadius: "0.25rem",
                                        backgroundColor: "#f0fdf4",
                                        color: "#16a34a",
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                      }}
                                    >
                                      <Sparkles size={11} /> Converted
                                    </span>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", marginTop: "0.15rem" }}>
                                      {formatCurrency(aud.conversionAmount)}
                                    </div>
                                    {aud.invoiceNumber && (
                                      <Link
                                        href={`/sales/invoices${queryParams}&search=${aud.invoiceNumber}`}
                                        style={{
                                          fontSize: "0.7rem",
                                          color: "#2563eb",
                                          textDecoration: "underline",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.2rem",
                                        }}
                                      >
                                        #{aud.invoiceNumber} <ExternalLink size={10} />
                                      </Link>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>No purchase</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Attributed Sales Invoices */}
              {activeTab === "conversions" && (
                <div>
                  {convertedAudiences.length === 0 ? (
                    <div
                      style={{
                        padding: "3rem 1.5rem",
                        textAlign: "center",
                        backgroundColor: "#f8fafc",
                        borderRadius: "0.5rem",
                        border: "1px dashed #cbd5e1",
                      }}
                    >
                      <Receipt size={32} style={{ color: "#94a3b8", margin: "0 auto 0.5rem auto" }} />
                      <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>
                        No POS Invoices Attributed Yet
                      </h4>
                      <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                        When target recipients make POS purchases within the 72h / 7d / 30d attribution window, their invoices will automatically populate here.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                        <thead>
                          <tr
                            style={{
                              backgroundColor: "#f8fafc",
                              borderBottom: "1px solid #e2e8f0",
                              textAlign: "left",
                              color: "#64748b",
                              fontSize: "0.72rem",
                              textTransform: "uppercase",
                            }}
                          >
                            <th style={{ padding: "0.6rem 0.85rem" }}>Invoice #</th>
                            <th style={{ padding: "0.6rem 0.85rem" }}>Customer</th>
                            <th style={{ padding: "0.6rem 0.85rem" }}>Attribution Window</th>
                            <th style={{ padding: "0.6rem 0.85rem" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {convertedAudiences.map((ca) => (
                            <tr key={ca.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "0.65rem 0.85rem" }}>
                                <Link
                                  href={`/sales/invoices${queryParams}&search=${ca.invoiceNumber || ""}`}
                                  style={{
                                    fontWeight: 700,
                                    color: "#2563eb",
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                  }}
                                >
                                  {ca.invoiceNumber || "Invoice"}
                                  <ExternalLink size={12} />
                                </Link>
                                <span style={{ display: "block", fontSize: "0.7rem", color: "#64748b" }}>
                                  {ca.convertedAt ? new Date(ca.convertedAt).toLocaleString() : ""}
                                </span>
                              </td>

                              <td style={{ padding: "0.65rem 0.85rem" }}>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                  {ca.customerName || "Walk-in Customer"}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                  {ca.recipientPhone}
                                </div>
                              </td>

                              <td style={{ padding: "0.65rem 0.85rem" }}>
                                <span
                                  style={{
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "0.25rem",
                                    backgroundColor:
                                      ca.conversionWindow === "72_HOURS"
                                        ? "#dcfce7"
                                        : ca.conversionWindow === "7_DAYS"
                                        ? "#e0e7ff"
                                        : "#fef3c7",
                                    color:
                                      ca.conversionWindow === "72_HOURS"
                                        ? "#15803d"
                                        : ca.conversionWindow === "7_DAYS"
                                        ? "#4338ca"
                                        : "#b45309",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {ca.conversionWindow?.replace("_", " ") || "Attributed"}
                                </span>
                              </td>

                              <td style={{ padding: "0.65rem 0.85rem" }}>
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                                  {formatCurrency(ca.conversionAmount)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
