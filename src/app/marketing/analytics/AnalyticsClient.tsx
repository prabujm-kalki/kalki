"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  ArrowUpRight,
  Filter,
  BarChart3,
  CheckCircle,
  ExternalLink,
  Percent,
} from "lucide-react";
import Link from "next/link";

interface AnalyticsClientProps {
  organizationId: string;
  campaigns: any[];
  totalApiSpend: number;
  totalAttributedRevenue: number;
  total72hRev: number;
  total7dRev: number;
  total30dRev: number;
  total72hCount: number;
  total7dCount: number;
  total30dCount: number;
}

export default function AnalyticsClient({
  organizationId,
  campaigns,
  totalApiSpend,
  totalAttributedRevenue,
  total72hRev,
  total7dRev,
  total30dRev,
  total72hCount,
  total7dCount,
  total30dCount,
}: AnalyticsClientProps) {
  const router = useRouter();
  const [selectedWindow, setSelectedWindow] = useState<"ALL" | "72H" | "7D" | "30D">("ALL");

  const overallRoi =
    totalApiSpend > 0
      ? (((totalAttributedRevenue - totalApiSpend) / totalApiSpend) * 100).toFixed(1)
      : totalAttributedRevenue > 0
      ? "100.0"
      : "0.0";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Closed-Loop POS Conversion & ROI Analytics
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Track verified POS bill conversions attributed to WhatsApp marketing broadcasts within 72h, 7d, and 30d windows.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setSelectedWindow("ALL")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "0.375rem",
              border: `1px solid ${selectedWindow === "ALL" ? "#16a34a" : "#cbd5e1"}`,
              backgroundColor: selectedWindow === "ALL" ? "#f0fdf4" : "#ffffff",
              color: selectedWindow === "ALL" ? "#16a34a" : "#334155",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All Windows
          </button>
          <button
            onClick={() => setSelectedWindow("72H")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "0.375rem",
              border: `1px solid ${selectedWindow === "72H" ? "#16a34a" : "#cbd5e1"}`,
              backgroundColor: selectedWindow === "72H" ? "#f0fdf4" : "#ffffff",
              color: selectedWindow === "72H" ? "#16a34a" : "#334155",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            72-Hour Flash (Immediate)
          </button>
          <button
            onClick={() => setSelectedWindow("7D")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "0.375rem",
              border: `1px solid ${selectedWindow === "7D" ? "#16a34a" : "#cbd5e1"}`,
              backgroundColor: selectedWindow === "7D" ? "#f0fdf4" : "#ffffff",
              color: selectedWindow === "7D" ? "#16a34a" : "#334155",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            7-Day Conversions
          </button>
          <button
            onClick={() => setSelectedWindow("30D")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "0.375rem",
              border: `1px solid ${selectedWindow === "30D" ? "#16a34a" : "#cbd5e1"}`,
              backgroundColor: selectedWindow === "30D" ? "#f0fdf4" : "#ffffff",
              color: selectedWindow === "30D" ? "#16a34a" : "#334155",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            30-Day Long-tail
          </button>
        </div>
      </div>

      {/* Conversion Window Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
            <span>72-Hour Flash Window</span>
            <Clock size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a", marginTop: "0.5rem" }}>
            ₹{total72hRev.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem" }}>
            {total72hCount} customer POS bills settled within 3 days of blast
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
            <span>7-Day Attribution Window</span>
            <Calendar size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0284c7", marginTop: "0.5rem" }}>
            ₹{total7dRev.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem" }}>
            {total7dCount} customer visits completed in week 1
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
            <span>30-Day Total Lifecycle Window</span>
            <DollarSign size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#8b5cf6", marginTop: "0.5rem" }}>
            ₹{total30dRev.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem" }}>
            {total30dCount} customer purchases inside 30-day window
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
            <span>Overall Return on Spend (ROI)</span>
            <Percent size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d97706", marginTop: "0.5rem" }}>
            {overallRoi}%
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem" }}>
            Spend: ₹{totalApiSpend.toFixed(2)} | Revenue: ₹{totalAttributedRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Campaign Attribution Ledger */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
            Campaign Closed-Loop Conversion Breakdown
          </h3>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.775rem", color: "#64748b" }}>
            Matches customer invoice settlements with campaign broadcasts within attribution windows.
          </p>
        </div>

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
                <th style={{ padding: "0.75rem 1.25rem" }}>Campaign</th>
                <th style={{ padding: "0.75rem 1rem" }}>Sent Count</th>
                <th style={{ padding: "0.75rem 1rem" }}>API Spend</th>
                <th style={{ padding: "0.75rem 1rem" }}>72h Flash Rev</th>
                <th style={{ padding: "0.75rem 1rem" }}>7d Rev</th>
                <th style={{ padding: "0.75rem 1rem" }}>30d Total Rev</th>
                <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Attributed ROI</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                    No campaigns launched yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const spend = Number(c.estimatedApiCost || 0);
                  const rev = Number(c.totalAttributedRevenue || 0);
                  const roiVal = spend > 0 ? (((rev - spend) / spend) * 100).toFixed(1) : rev > 0 ? "100.0" : "0.0";

                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600, color: "#0f172a" }}>
                        {c.name}
                        <div style={{ fontSize: "0.725rem", color: "#94a3b8", fontWeight: 400 }}>
                          Template: {c.templateName}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#475569" }}>
                        {c.sentCount} sent
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#0f172a", fontWeight: 600 }}>
                        ₹{spend.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#16a34a", fontWeight: 600 }}>
                        ₹{Number(c.conversions72hRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: "0.725rem", color: "#64748b", marginLeft: "0.3rem" }}>
                          ({c.conversions72hCount || 0})
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#0284c7", fontWeight: 600 }}>
                        ₹{Number(c.conversions7dRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: "0.725rem", color: "#64748b", marginLeft: "0.3rem" }}>
                          ({c.conversions7dCount || 0})
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#8b5cf6", fontWeight: 700 }}>
                        ₹{Number(c.conversions30dRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: "0.725rem", color: "#64748b", marginLeft: "0.3rem" }}>
                          ({c.conversions30dCount || 0})
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", textAlign: "right", fontWeight: 700, color: Number(roiVal) > 0 ? "#16a34a" : "#64748b" }}>
                        {roiVal}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
