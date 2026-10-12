"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Headphones,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
} from "lucide-react";
import { createTicket, resolveTicket } from "@/domains/crm/crmService";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  urgency: string;
  category: string;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
}

interface ServiceClientProps {
  organizationId: string;
  tickets: TicketItem[];
  locations: { id: string; name: string }[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  selectedStatus: string;
  selectedUrgency: string;
  openTicketsCount: number;
  resolvedTicketsCount: number;
}

export default function ServiceClient(props: ServiceClientProps) {
  const {
    organizationId,
    tickets,
    locations,
    currentPage,
    totalPages,
    totalCount,
    selectedStatus,
    selectedUrgency,
    openTicketsCount,
    resolvedTicketsCount,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  // Form states
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("MEDIUM");
  const [category, setCategory] = useState("BILLING");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEscapeKey(() => setIsCreateModalOpen(false), isCreateModalOpen);
  useEscapeKey(() => setIsResolveModalOpen(false), isResolveModalOpen);

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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createTicket({
        organizationId,
        subject,
        description,
        urgency,
        category,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setSubject("");
        setDescription("");
        router.refresh();
      } else {
        alert(res.error || "Failed to create ticket");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !resolutionNotes.trim()) return;

    setSubmitting(true);
    try {
      const res = await resolveTicket(selectedTicket.id, resolutionNotes);
      if (res.success) {
        setIsResolveModalOpen(false);
        setSelectedTicket(null);
        setResolutionNotes("");
        router.refresh();
      } else {
        alert(res.error || "Failed to resolve ticket");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. Header & Actions */}
      <div className="crm-header">
        <div>
          <h1 className="crm-header-title">Customer Service & SLA Resolution</h1>
          <p className="crm-header-subtitle">
            Log, assign, and track guest complaints, billing disputes, and delivery feedback tickets against resolution SLAs.
          </p>
        </div>
        <div className="crm-header-actions">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="crm-btn-primary"
          >
            <Plus size={16} />
            Create Ticket
          </button>
        </div>
      </div>

      {/* 2. KPI Status Tabs */}
      <div className="crm-kpi-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div
          onClick={() => updateQueryParam({ status: "OPEN", page: "1" })}
          className="crm-kpi-card"
          style={{
            cursor: "pointer",
            border: selectedStatus === "OPEN" ? "2px solid #ea580c" : "1px solid #e2e8f0",
            backgroundColor: selectedStatus === "OPEN" ? "#fff7ed" : "#ffffff",
          }}
        >
          <div className="crm-kpi-header">
            <span className="crm-kpi-title" style={{ color: "#ea580c" }}>Open / In-Progress</span>
            <Clock size={16} color="#ea580c" />
          </div>
          <div className="crm-kpi-value">{openTicketsCount}</div>
          <div className="crm-kpi-meta">Requires staff action / investigation</div>
        </div>

        <div
          onClick={() => updateQueryParam({ status: "RESOLVED", page: "1" })}
          className="crm-kpi-card"
          style={{
            cursor: "pointer",
            border: selectedStatus === "RESOLVED" ? "2px solid #16a34a" : "1px solid #e2e8f0",
            backgroundColor: selectedStatus === "RESOLVED" ? "#f0fdf4" : "#ffffff",
          }}
        >
          <div className="crm-kpi-header">
            <span className="crm-kpi-title" style={{ color: "#16a34a" }}>Resolved</span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div className="crm-kpi-value">{resolvedTicketsCount}</div>
          <div className="crm-kpi-meta">Closed with recorded resolution notes</div>
        </div>

        <div
          onClick={() => updateQueryParam({ status: "ALL", page: "1" })}
          className="crm-kpi-card"
          style={{
            cursor: "pointer",
            border: selectedStatus === "ALL" ? "2px solid #3b82f6" : "1px solid #e2e8f0",
            backgroundColor: selectedStatus === "ALL" ? "#eff6ff" : "#ffffff",
          }}
        >
          <div className="crm-kpi-header">
            <span className="crm-kpi-title" style={{ color: "#3b82f6" }}>All Tickets</span>
            <Headphones size={16} color="#3b82f6" />
          </div>
          <div className="crm-kpi-value">{openTicketsCount + resolvedTicketsCount}</div>
          <div className="crm-kpi-meta">Lifetime ticket volume</div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="crm-card" style={{ marginBottom: "1rem" }}>
        <div className="crm-filter-bar">
          <div className="crm-filter-group">
            <select
              value={selectedUrgency}
              onChange={(e) => updateQueryParam({ urgency: e.target.value, page: "1" })}
              className="crm-filter-select"
            >
              <option value="ALL">All Urgencies</option>
              <option value="URGENT">Urgent SLA</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ fontSize: "0.825rem", color: "#64748b" }}>
            Showing: <strong style={{ color: "#0f172a" }}>{totalCount} tickets</strong>
          </div>
        </div>
      </div>

      {/* 4. Ticket Table */}
      <div className="crm-card">
        <div className="crm-card-header">
          <h2 className="crm-card-title">
            <Headphones size={17} color="#d97706" />
            Service Ticket Ledger ({totalCount})
          </h2>
        </div>

        {tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No tickets matching your filter</p>
          </div>
        ) : (
          <>
            <div className="crm-table-container">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject & Description</th>
                    <th>Category</th>
                    <th>Urgency</th>
                    <th>Customer</th>
                    <th>Status & Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong style={{ color: "#0f172a", fontSize: "0.85rem" }}>
                          {t.ticketNumber}
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ maxWidth: "320px", whiteSpace: "normal" }}>
                        <strong style={{ color: "#0f172a", fontSize: "0.875rem", display: "block" }}>
                          {t.subject}
                        </strong>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                          {t.description}
                        </p>
                      </td>
                      <td>
                        <span className="crm-badge crm-badge-new">{t.category}</span>
                      </td>
                      <td>
                        <span
                          className={`crm-badge ${
                            t.urgency === "URGENT" || t.urgency === "HIGH"
                              ? "crm-badge-dormant"
                              : "crm-badge-at-risk"
                          }`}
                        >
                          {t.urgency}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "#0f172a", fontSize: "0.85rem", display: "block" }}>
                          {t.customerName || "Walk-in Guest"}
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          {t.customerPhone || "No contact"}
                        </span>
                      </td>
                      <td>
                        {t.status === "OPEN" ? (
                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setIsResolveModalOpen(true);
                            }}
                            className="crm-btn-primary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                          >
                            <CheckCircle2 size={13} />
                            Resolve Ticket
                          </button>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            <span className="crm-badge crm-badge-champions">
                              RESOLVED
                            </span>
                            {t.resolutionNotes && (
                              <span style={{ fontSize: "0.7rem", color: "#64748b", maxWidth: "160px" }}>
                                {t.resolutionNotes}
                              </span>
                            )}
                          </div>
                        )}
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

      {/* 5. Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="crm-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3 className="crm-modal-title">
                <Headphones size={18} color="#d97706" />
                Log Customer Service Ticket
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <div className="crm-modal-body">
                <div className="crm-form-group">
                  <label className="crm-form-label">Subject / Issue Summary *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Swiggy delivery delay on Order #481"
                    className="crm-form-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="crm-form-group">
                    <label className="crm-form-label">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="crm-form-select"
                    >
                      <option value="BILLING">Billing & Payment</option>
                      <option value="FOOD_QUALITY">Food Quality & Taste</option>
                      <option value="DELIVERY_DELAY">Delivery Delay</option>
                      <option value="FEEDBACK">General Guest Feedback</option>
                    </select>
                  </div>

                  <div className="crm-form-group">
                    <label className="crm-form-label">Urgency / SLA</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="crm-form-select"
                    >
                      <option value="LOW">Low (48 hours)</option>
                      <option value="MEDIUM">Medium (24 hours)</option>
                      <option value="HIGH">High (4 hours)</option>
                      <option value="URGENT">Urgent (Immediate Escalate)</option>
                    </select>
                  </div>
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Detailed Notes & Incident Description *</label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide full description of customer complaint or feedback..."
                    className="crm-form-textarea"
                  />
                </div>
              </div>

              <div className="crm-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="crm-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="crm-btn-primary"
                >
                  {submitting ? "Saving..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Resolve Ticket Modal */}
      {isResolveModalOpen && selectedTicket && (
        <div className="crm-modal-overlay" onClick={() => setIsResolveModalOpen(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3 className="crm-modal-title">
                <CheckCircle2 size={18} color="#16a34a" />
                Resolve Ticket #{selectedTicket.ticketNumber}
              </h3>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResolveTicket}>
              <div className="crm-modal-body">
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                  Subject: <strong style={{ color: "#0f172a" }}>{selectedTicket.subject}</strong>
                </p>

                <div className="crm-form-group" style={{ marginTop: "0.75rem" }}>
                  <label className="crm-form-label">Resolution Actions & Root-Cause Notes *</label>
                  <textarea
                    rows={4}
                    required
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="e.g. Apologized to guest, credited ₹250 to customer balance, replaced dish."
                    className="crm-form-textarea"
                  />
                </div>
              </div>

              <div className="crm-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="crm-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="crm-btn-primary"
                >
                  {submitting ? "Resolving..." : "Mark as Resolved"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
