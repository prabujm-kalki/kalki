"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  Send,
  CheckCircle,
  Eye,
  Play,
  Pause,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { toggleCampaignStatus } from "@/domains/marketing/marketingAutomationService";

interface DashboardClientProps {
  organizationId: string;
  campaigns: any[];
  totalApiSpend: number;
  totalAttributedRevenue: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  activeCount: number;
}

export default function DashboardClient({
  organizationId,
  campaigns,
  totalApiSpend,
  totalAttributedRevenue,
  totalSent,
  totalDelivered,
  totalRead,
  activeCount,
}: DashboardClientProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Overall ROI = ((Revenue - Spend) / Spend) * 100
  const overallRoi =
    totalApiSpend > 0
      ? (((totalAttributedRevenue - totalApiSpend) / totalApiSpend) * 100).toFixed(1)
      : totalAttributedRevenue > 0
      ? "100.0"
      : "0.0";

  const handleToggle = async (campaignId: string, currentStatus: string) => {
    setUpdatingId(campaignId);
    const newStatus = currentStatus === "RUNNING" ? "PAUSED" : "RUNNING";
    const res = await toggleCampaignStatus(campaignId, newStatus as any);
    setUpdatingId(null);
    if (!res.success) {
      alert(res.error || "Failed to toggle campaign status");
    } else {
      router.refresh();
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Marketing Command Center
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Real-time Meta WhatsApp broadcast KPIs, active worker kill switches, and financial ROI.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => router.refresh()}
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link
            href={`/marketing/campaigns?organizationId=${organizationId}`}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              fontSize: "0.825rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            New Campaign <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI Command Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
            <span>Attributed Revenue</span>
            <DollarSign size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", marginTop: "0.5rem" }}>
            ₹{totalAttributedRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "0.35rem", fontWeight: 600 }}>
            +{overallRoi}% return on spend
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
            <span>Total API Spend</span>
            <TrendingUp size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", marginTop: "0.5rem" }}>
            ₹{totalApiSpend.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
            Meta Cloud WhatsApp Billing
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
            <span>Messages Sent</span>
            <Send size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", marginTop: "0.5rem" }}>
            {totalSent.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
            Delivered: {totalDelivered} | Read: {totalRead}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
            <span>Active Worker Jobs</span>
            <Clock size={16} color={activeCount > 0 ? "#16a34a" : "#94a3b8"} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: activeCount > 0 ? "#16a34a" : "#0f172a", marginTop: "0.5rem" }}>
            {activeCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
            {activeCount > 0 ? "Workers running in background" : "All background queues idle"}
          </div>
        </div>
      </div>

      {/* Active Campaigns & Kill Switch Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              Active Campaigns & Background Worker Switchboard
            </h3>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.775rem", color: "#64748b" }}>
              Immediate Pause/Resume kill switch for batch dispatch processes.
            </p>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
            {campaigns.length} total campaigns
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <p>No marketing campaigns launched yet.</p>
            <Link
              href={`/marketing/campaigns?organizationId=${organizationId}`}
              style={{
                color: "#16a34a",
                fontWeight: 600,
                fontSize: "0.85rem",
                textDecoration: "underline",
              }}
            >
              Launch your first campaign
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    textAlign: "left",
                    color: "#64748b",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "0.75rem 1.25rem" }}>Campaign Name</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Template</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Progress</th>
                  <th style={{ padding: "0.75rem 1rem" }}>API Spend</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Attributed Rev</th>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Worker Kill Switch</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const isRunning = c.status === "RUNNING";
                  const isPaused = c.status === "PAUSED";
                  const isCompleted = c.status === "COMPLETED";
                  const isUpdating = updatingId === c.id;

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background-color 0.1s ease",
                      }}
                    >
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600, color: "#0f172a" }}>
                        {c.name}
                        <div style={{ fontSize: "0.725rem", color: "#94a3b8", fontWeight: 400 }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>
                        <code style={{ backgroundColor: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "0.25rem", fontSize: "0.75rem" }}>
                          {c.templateName}
                        </code>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "1rem",
                            fontSize: "0.725rem",
                            fontWeight: 700,
                            backgroundColor: isRunning
                              ? "#f0fdf4"
                              : isPaused
                              ? "#fffbeb"
                              : isCompleted
                              ? "#f8fafc"
                              : "#fef2f2",
                            color: isRunning
                              ? "#16a34a"
                              : isPaused
                              ? "#d97706"
                              : isCompleted
                              ? "#64748b"
                              : "#dc2626",
                            border: `1px solid ${
                              isRunning
                                ? "#bbf7d0"
                                : isPaused
                                ? "#fde68a"
                                : isCompleted
                                ? "#e2e8f0"
                                : "#fecaca"
                            }`,
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>
                        {c.sentCount} / {c.totalRecipients} sent
                        {c.failedCount > 0 && (
                          <span style={{ color: "#ef4444", marginLeft: "0.4rem", fontSize: "0.75rem" }}>
                            ({c.failedCount} err)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#0f172a", fontWeight: 600 }}>
                        ₹{Number(c.estimatedApiCost || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#16a34a", fontWeight: 700 }}>
                        ₹{Number(c.totalAttributedRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                        {isCompleted ? (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Finished</span>
                        ) : (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggle(c.id, c.status)}
                            style={{
                              padding: "0.35rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "none",
                              backgroundColor: isRunning ? "#ef4444" : "#16a34a",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: isUpdating ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              opacity: isUpdating ? 0.6 : 1,
                            }}
                          >
                            {isRunning ? (
                              <>
                                <Pause size={12} /> Pause Worker
                              </>
                            ) : (
                              <>
                                <Play size={12} /> Resume Worker
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
