"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import {
  Users,
  Filter,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Award,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function MarketingAudiencesPage() {
  const { selected } = useSessionView();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState(searchParams.get("segment") || "ALL");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [exclude7Days, setExclude7Days] = useState(false);
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const pageSize = 20;

  // Ingest customer records along with RFM profiles from CRM
  useEffect(() => {
    if (!selected?.organizationId) return;
    setLoading(true);
    const locParam = selected.locationId ? `&locationId=${selected.locationId}` : "";
    fetch(`/api/customers?organizationId=${selected.organizationId}${locParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customers && Array.isArray(data.customers)) {
          setCustomersList(data.customers);
        } else if (Array.isArray(data)) {
          setCustomersList(data);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [selected?.organizationId, selected?.locationId]);

  // Sync segment changes to URL state
  const handleSegmentChange = (seg: string) => {
    setSelectedSegment(seg);
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    if (seg === "ALL") {
      params.delete("segment");
    } else {
      params.set("segment", seg);
    }
    params.set("page", "1");
    router.replace(`/marketing/audiences?${params.toString()}`);
  };

  // Filter criteria logic
  const now = new Date();
  const filtered = customersList.filter((c) => {
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search));
    if (!matchesSearch) return false;

    // Segment filter
    if (selectedSegment === "CHAMPIONS") {
      if (c.rfmSegment !== "CHAMPIONS" && Number(c.totalBillsCount || 0) < 5) return false;
    } else if (selectedSegment === "LOYAL") {
      if (c.rfmSegment !== "LOYAL" && Number(c.totalBillsCount || 0) < 3) return false;
    } else if (selectedSegment === "AT_RISK") {
      if (c.rfmSegment !== "AT_RISK" && c.rfmSegment !== "DORMANT") return false;
    } else if (selectedSegment === "REACHABLE") {
      if (!c.phone || c.phone.trim().length < 10) return false;
    }

    // Exclusion rule: Exclude if messaged within past 7 days
    if (exclude7Days && c.lastMessagedAt) {
      const msgDate = new Date(c.lastMessagedAt);
      const diffDays = (now.getTime() - msgDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 7) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const reachableCount = customersList.filter((c) => c.phone && c.phone.trim().length >= 10).length;
  const championsCount = customersList.filter(
    (c) => c.rfmSegment === "CHAMPIONS" || Number(c.totalBillsCount || 0) >= 5
  ).length;
  const atRiskCount = customersList.filter(
    (c) => c.rfmSegment === "AT_RISK" || c.rfmSegment === "DORMANT"
  ).length;

  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Audience Builder & Smart Segments
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Directly ingests RFM cohorts from CRM Intelligence. Apply suppression & exclusion rules.
          </p>
        </div>
        <Link
          href={`/marketing/campaigns${query}&segment=${selectedSegment}`}
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
          }}
        >
          Broadcast to Filtered Segment ({filtered.length})
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Segments Ingested from CRM */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          onClick={() => handleSegmentChange("ALL")}
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#ffffff",
            border: `2px solid ${selectedSegment === "ALL" ? "#16a34a" : "#e2e8f0"}`,
            cursor: "pointer",
            boxShadow: selectedSegment === "ALL" ? "0 2px 8px rgba(22, 163, 74, 0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              All Customers
            </span>
            <Users size={16} color="#64748b" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
            {customersList.length}
          </div>
        </div>

        <div
          onClick={() => handleSegmentChange("CHAMPIONS")}
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#ffffff",
            border: `2px solid ${selectedSegment === "CHAMPIONS" ? "#16a34a" : "#e2e8f0"}`,
            cursor: "pointer",
            boxShadow: selectedSegment === "CHAMPIONS" ? "0 2px 8px rgba(22, 163, 74, 0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              CRM Champions
            </span>
            <Award size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a", marginTop: "0.25rem" }}>
            {championsCount}
          </div>
        </div>

        <div
          onClick={() => handleSegmentChange("AT_RISK")}
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#ffffff",
            border: `2px solid ${selectedSegment === "AT_RISK" ? "#16a34a" : "#e2e8f0"}`,
            cursor: "pointer",
            boxShadow: selectedSegment === "AT_RISK" ? "0 2px 8px rgba(22, 163, 74, 0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              At Risk / Win-back
            </span>
            <AlertTriangle size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: "0.25rem" }}>
            {atRiskCount}
          </div>
        </div>

        <div
          onClick={() => handleSegmentChange("REACHABLE")}
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#ffffff",
            border: `2px solid ${selectedSegment === "REACHABLE" ? "#16a34a" : "#e2e8f0"}`,
            cursor: "pointer",
            boxShadow: selectedSegment === "REACHABLE" ? "0 2px 8px rgba(22, 163, 74, 0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              WhatsApp Ready
            </span>
            <CheckCircle2 size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0284c7", marginTop: "0.25rem" }}>
            {reachableCount}
          </div>
        </div>
      </div>

      {/* Exclusion & Fatigue Controls */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          borderRadius: "0.5rem",
          border: "1px solid #e2e8f0",
          padding: "0.85rem 1.25rem",
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ShieldCheck size={20} color="#16a34a" />
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>
              Smart Fatigue Suppression Rule:
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "0.5rem" }}>
              Automatically prevent message fatigue by excluding contacts messaged recently.
            </span>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
          <input
            type="checkbox"
            checked={exclude7Days}
            onChange={(e) => setExclude7Days(e.target.checked)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          Exclude if messaged in past 7 days
        </label>
      </div>

      {/* Customer Audience Ledger */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search audience by name or phone..."
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #cbd5e1",
              fontSize: "0.8rem",
              width: "280px",
              outline: "none",
            }}
          />
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Showing {filtered.length} eligible recipients (Page {page} of {totalPages})
          </span>
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
                <th style={{ padding: "0.75rem 1.25rem" }}>Customer Name</th>
                <th style={{ padding: "0.75rem 1rem" }}>Phone Number</th>
                <th style={{ padding: "0.75rem 1rem" }}>CRM Cohort</th>
                <th style={{ padding: "0.75rem 1rem" }}>WhatsApp Channel</th>
                <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                    No audience records match the criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const isReachable = c.phone && c.phone.trim().length >= 10;
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.8rem 1.25rem", fontWeight: 600, color: "#0f172a" }}>
                        {c.name || "Customer"}
                      </td>
                      <td style={{ padding: "0.8rem 1rem", color: "#475569" }}>
                        {c.phone || "—"}
                      </td>
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "#f1f5f9",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          {c.rfmSegment || "NEW"}
                        </span>
                      </td>
                      <td style={{ padding: "0.8rem 1rem" }}>
                        {isReachable ? (
                          <span
                            style={{
                              color: "#16a34a",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <CheckCircle2 size={13} /> Reachable
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>No valid mobile</span>
                        )}
                      </td>
                      <td style={{ padding: "0.8rem 1.25rem", textAlign: "right" }}>
                        {isReachable && (
                          <Link
                            href={`/marketing/inbox${query}&phone=${c.phone}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#ffffff",
                              color: "#16a34a",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            Chat in Inbox →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side URL State Pagination Controls */}
        <div
          style={{
            padding: "0.75rem 1.25rem",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                const nextP = page - 1;
                setPage(nextP);
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(nextP));
                router.replace(`/marketing/audiences?${params.toString()}`);
              }}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                backgroundColor: page <= 1 ? "#f8fafc" : "#ffffff",
                color: page <= 1 ? "#94a3b8" : "#334155",
                fontSize: "0.75rem",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                const nextP = page + 1;
                setPage(nextP);
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(nextP));
                router.replace(`/marketing/audiences?${params.toString()}`);
              }}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                backgroundColor: page >= totalPages ? "#f8fafc" : "#ffffff",
                color: page >= totalPages ? "#94a3b8" : "#334155",
                fontSize: "0.75rem",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
