"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { Users, Filter, CheckCircle2, Search, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";

export default function MarketingAudiencesPage() {
  const { selected } = useSessionView();
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selected?.organizationId) return;
    setLoading(true);
    fetch(`/api/customers?organizationId=${selected.organizationId}`)
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
  }, [selected?.organizationId]);

  const reachableCount = customersList.filter((c) => c.phone && c.phone.trim().length >= 10).length;

  const filtered = customersList.filter((c) => {
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search));
    if (!matchesSearch) return false;
    if (selectedFilter === "REACHABLE") return c.phone && c.phone.trim().length >= 10;
    return true;
  });

  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Audiences & Smart Customer Segments
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Target specific customer groups directly from live ERP data without exporting spreadsheets.
          </p>
        </div>
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
          }}
        >
          Broadcast to Segment
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Segments Filter Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div
          onClick={() => setSelectedFilter("ALL")}
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#ffffff",
            border: `1px solid ${selectedFilter === "ALL" ? "#16a34a" : "#e2e8f0"}`,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>All Customers</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
            {customersList.length}
          </div>
        </div>

        <div
          onClick={() => setSelectedFilter("REACHABLE")}
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#ffffff",
            border: `1px solid ${selectedFilter === "REACHABLE" ? "#16a34a" : "#e2e8f0"}`,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>WhatsApp Verified</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a", marginTop: "0.25rem" }}>
            {reachableCount}
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audience by name or phone..."
            style={{ padding: "0.4rem 0.75rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1", fontSize: "0.8rem", width: "260px", outline: "none" }}
          />
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Showing {filtered.length} customers
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>
                <th style={{ padding: "0.75rem 1.25rem" }}>Customer Name</th>
                <th style={{ padding: "0.75rem 1rem" }}>Phone Number</th>
                <th style={{ padding: "0.75rem 1rem" }}>WhatsApp Channel</th>
                <th style={{ padding: "0.75rem 1.25rem" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((c) => {
                const isReachable = c.phone && c.phone.trim().length >= 10;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.875rem 1.25rem", fontWeight: 600, color: "#0f172a" }}>
                      {c.name || "Customer"}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "#475569" }}>
                      {c.phone || "—"}
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      {isReachable ? (
                        <span style={{ color: "#16a34a", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <CheckCircle2 size={14} /> Ready
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No valid mobile</span>
                      )}
                    </td>
                    <td style={{ padding: "0.875rem 1.25rem" }}>
                      <span style={{ padding: "0.2rem 0.5rem", borderRadius: "0.25rem", backgroundColor: "#f1f5f9", fontSize: "0.75rem", color: "#475569" }}>
                        Active
                      </span>
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
