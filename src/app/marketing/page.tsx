"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import {
  Megaphone,
  MessageSquare,
  Users,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Send,
  Eye,
  AlertCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export default function MarketingOverviewPage() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    if (!selected?.organizationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/stats?organizationId=${selected.organizationId}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selected?.organizationId]);

  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Marketing & Customer Engagement
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Drive sales, broadcast promotions, and manage two-way WhatsApp customer relationships.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={fetchStats}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href={`/marketing/campaigns${query}`}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
            }}
          >
            <Plus size={16} />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Card 1: Reachable Audience */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Reachable Audience
            </span>
            <div style={{ padding: "6px", backgroundColor: "#f0fdf4", borderRadius: "8px", color: "#16a34a" }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>
            {stats?.audience?.reachableOnWhatsApp || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            out of {stats?.audience?.totalCustomers || 0} registered ERP customers
          </div>
        </div>

        {/* Card 2: Total Broadcasts Sent */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Messages Dispatched
            </span>
            <div style={{ padding: "6px", backgroundColor: "#eff6ff", borderRadius: "8px", color: "#2563eb" }}>
              <Send size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>
            {stats?.campaigns?.totalSent || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "0.25rem" }}>
            Across {stats?.campaigns?.totalCampaigns || 0} marketing campaigns
          </div>
        </div>

        {/* Card 3: Read Rate / Engagement */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Delivered & Read
            </span>
            <div style={{ padding: "6px", backgroundColor: "#faf5ff", borderRadius: "8px", color: "#9333ea" }}>
              <Eye size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>
            {stats?.campaigns?.totalDelivered || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Read: {stats?.campaigns?.totalRead || 0} • Failed: {stats?.campaigns?.totalFailed || 0}
          </div>
        </div>

        {/* Card 4: Two-Way Inquiries */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Inbound Customer Inquiries
            </span>
            <div style={{ padding: "6px", backgroundColor: "#fef3c7", borderRadius: "8px", color: "#d97706" }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>
            {stats?.communications?.totalInbound || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Customer replies handled in Two-Way Inbox
          </div>
        </div>
      </div>

      {/* Quick Launch & Campaign History Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        {/* Left Column: Recent Campaigns Table */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
              Recent Campaigns
            </h3>
            <Link
              href={`/marketing/campaigns${query}`}
              style={{ fontSize: "0.8rem", color: "#16a34a", textDecoration: "none", fontWeight: 600 }}
            >
              View All Campaigns →
            </Link>
          </div>

          {stats?.recentCampaigns?.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
              No campaigns launched yet. Click &quot;Create Campaign&quot; above to launch your first WhatsApp broadcast!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {stats?.recentCampaigns?.map((camp: any) => (
                <div
                  key={camp.id}
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#1e293b", display: "block" }}>
                      {camp.name}
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Template: {camp.templateName} • {new Date(camp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        backgroundColor: camp.status === "COMPLETED" ? "#dcfce7" : "#eff6ff",
                        color: camp.status === "COMPLETED" ? "#15803d" : "#1d4ed8",
                      }}
                    >
                      {camp.status}
                    </span>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                      {camp.sentCount} / {camp.totalRecipients} sent
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Sub-Module Navigators */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
              Growth Hub Tools
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Link
                href={`/marketing/inbox${query}`}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#1e293b",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <MessageSquare size={16} color="#16a34a" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Two-Way WhatsApp Inbox</span>
                </div>
                <ArrowUpRight size={14} color="#94a3b8" />
              </Link>

              <Link
                href={`/marketing/audiences${query}`}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#1e293b",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Users size={16} color="#2563eb" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Audiences & Segments</span>
                </div>
                <ArrowUpRight size={14} color="#94a3b8" />
              </Link>

              <Link
                href={`/marketing/templates${query}`}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#1e293b",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Megaphone size={16} color="#9333ea" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Template Studio</span>
                </div>
                <ArrowUpRight size={14} color="#94a3b8" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
