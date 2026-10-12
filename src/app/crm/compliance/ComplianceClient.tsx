"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { updateConsent } from "@/domains/crm/crmService";

interface ConsentItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsappConsent: boolean | null;
  smsConsent: boolean | null;
  consentUpdatedAt: Date | null;
  createdAt: Date;
}

interface AuditLogItem {
  id: string;
  customerId: string;
  channel: string;
  consentGranted: boolean;
  source: string;
  createdAt: Date;
  customerName: string | null;
  customerPhone: string | null;
}

interface ComplianceClientProps {
  organizationId: string;
  consentList: ConsentItem[];
  auditLogs: AuditLogItem[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  searchQuery: string;
  channelFilter: string;
}

export default function ComplianceClient(props: ComplianceClientProps) {
  const {
    organizationId,
    consentList,
    auditLogs,
    currentPage,
    totalPages,
    totalCount,
    searchQuery,
    channelFilter,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleToggleConsent = async (
    customerId: string,
    channel: "WHATSAPP" | "SMS",
    currentVal: boolean
  ) => {
    setUpdatingId(`${customerId}-${channel}`);
    try {
      const res = await updateConsent({
        organizationId,
        customerId,
        channel,
        consentGranted: !currentVal,
        source: "MANUAL_ADMIN",
      });

      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to update consent");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      {/* 1. Header */}
      <div className="crm-header">
        <div>
          <h1 className="crm-header-title">Consent Center & Anti-Spam Compliance</h1>
          <p className="crm-header-subtitle">
            Auditable consent records across WhatsApp and SMS to ensure strict adherence to TRAI and Meta Ecosystem regulations.
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="crm-card" style={{ marginBottom: "1rem" }}>
        <div className="crm-filter-bar">
          <div className="crm-filter-group">
            <div className="crm-search-input-wrap">
              <Search size={15} className="crm-search-icon" />
              <input
                type="text"
                defaultValue={searchQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQueryParam({ search: (e.target as HTMLInputElement).value, page: "1" });
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value !== searchQuery) {
                    updateQueryParam({ search: e.target.value, page: "1" });
                  }
                }}
                placeholder="Search by customer name or phone... (Press Enter)"
                className="crm-search-input"
              />
            </div>
          </div>

          <div style={{ fontSize: "0.825rem", color: "#64748b" }}>
            Total Verified Consents: <strong style={{ color: "#0f172a" }}>{totalCount}</strong>
          </div>
        </div>
      </div>

      {/* 3. Consent Management Table */}
      <div className="crm-card" style={{ marginBottom: "1.5rem" }}>
        <div className="crm-card-header">
          <h2 className="crm-card-title">
            <ShieldCheck size={17} color="#d97706" />
            Customer Communication Consent Ledger ({totalCount})
          </h2>
        </div>

        {consentList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No customer records found</p>
          </div>
        ) : (
          <>
            <div className="crm-table-container">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Customer Name & Phone</th>
                    <th>WhatsApp Consent</th>
                    <th>SMS Consent</th>
                    <th>Last Verification</th>
                    <th>Source Protocol</th>
                  </tr>
                </thead>
                <tbody>
                  {consentList.map((item) => {
                    const waOptIn = item.whatsappConsent !== false;
                    const smsOptIn = item.smsConsent !== false;
                    const isWaUpdating = updatingId === `${item.id}-WHATSAPP`;
                    const isSmsUpdating = updatingId === `${item.id}-SMS`;

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong style={{ color: "#0f172a", fontSize: "0.9rem", display: "block" }}>
                            {item.name}
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {item.phone || "No phone logged"}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleConsent(item.id, "WHATSAPP", waOptIn)}
                            disabled={isWaUpdating}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              backgroundColor: waOptIn ? "#dcfce7" : "#fee2e2",
                              color: waOptIn ? "#166534" : "#991b1b",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                            }}
                          >
                            {waOptIn ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {waOptIn ? "OPTED IN" : "OPTED OUT"}
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleConsent(item.id, "SMS", smsOptIn)}
                            disabled={isSmsUpdating}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              backgroundColor: smsOptIn ? "#dcfce7" : "#fee2e2",
                              color: smsOptIn ? "#166534" : "#991b1b",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                            }}
                          >
                            {smsOptIn ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {smsOptIn ? "OPTED IN" : "OPTED OUT"}
                          </button>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            {item.consentUpdatedAt
                              ? new Date(item.consentUpdatedAt).toLocaleString()
                              : new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <span className="crm-badge crm-badge-new">
                            POS_BILLING_DEFAULT
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* 4. Recent Consent Audit Trail */}
      <div className="crm-card">
        <div className="crm-card-header">
          <h2 className="crm-card-title">
            <History size={16} color="#d97706" />
            Recent Consent State Audit Trail (Immutable)
          </h2>
        </div>
        <div style={{ padding: "1rem" }}>
          {auditLogs.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
              No audit entries recorded yet. Any toggle or opt-in change will generate an immutable entry here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.375rem",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.8rem",
                  }}
                >
                  <div>
                    <strong style={{ color: "#0f172a" }}>{log.customerName}</strong> ({log.customerPhone}) changed{" "}
                    <strong>{log.channel}</strong> to{" "}
                    <span style={{ color: log.consentGranted ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                      {log.consentGranted ? "GRANTED" : "REVOKED"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#64748b" }}>
                    <span>Source: {log.source}</span>
                    <span>• {new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
