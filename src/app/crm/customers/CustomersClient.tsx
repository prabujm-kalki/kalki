"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Users,
  Plus,
  GitMerge,
  Search,
  Phone,
  Mail,
  Receipt,
  MessageSquare,
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  Clock,
  X,
  Check,
} from "lucide-react";
import { addCustomer, mergeDuplicateCustomers, getCustomerTimeline } from "@/domains/crm/crmService";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  customerType: string | null;
  priorityScore: number | null;
  rfmSegment: string | null;
  lifecycleStage: string | null;
  monetarySpend: string | null;
  whatsappConsent: boolean | null;
}

interface CustomersClientProps {
  organizationId: string;
  customers: CustomerRow[];
  locations: { id: string; name: string }[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  searchQuery: string;
  selectedType: string;
  selectedCustomerId: string;
}

export default function CustomersClient(props: CustomersClientProps) {
  const {
    organizationId,
    customers,
    locations,
    currentPage,
    totalPages,
    totalCount,
    searchQuery,
    selectedType,
    selectedCustomerId,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 360 Timeline State
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newType, setNewType] = useState("RETAIL");
  const [newLocationId, setNewLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Merge modal selection
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);

  // Close modals on Escape key
  useEscapeKey(() => setIsAddModalOpen(false), isAddModalOpen);
  useEscapeKey(() => setIsMergeModalOpen(false), isMergeModalOpen);

  // Update URL Search Parameters for Server-Side State
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

  // State for search input to support 300ms debounce
  const initialSearch = searchParams.get("q") || searchParams.get("search") || searchQuery || "";
  const [searchInputVal, setSearchInputVal] = useState(initialSearch);

  // Sync search input state if URL search param changes from outside
  useEffect(() => {
    setSearchInputVal(initialSearch);
  }, [initialSearch]);

  // Debounced search sync to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentParam = searchParams.get("q") || searchParams.get("search") || "";
      if (searchInputVal !== currentParam) {
        updateQueryParam({ q: searchInputVal || null, search: null, page: "1" });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInputVal]);

  const activeCategory = searchParams.get("category") || searchParams.get("type") || selectedType || "ALL";
  const activeStatus = searchParams.get("status") || "ALL";
  const activeSort = searchParams.get("sort") || "NEWEST";

  // Load 360 Timeline whenever active customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setTimelineEvents([]);
      return;
    }

    setTimelineLoading(true);
    getCustomerTimeline(selectedCustomerId)
      .then((res) => {
        if (res.success && res.events) {
          setTimelineEvents(res.events);
        }
      })
      .finally(() => setTimelineLoading(false));
  }, [selectedCustomerId]);

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    try {
      const res = await addCustomer({
        organizationId,
        name: newName,
        phone: newPhone,
        email: newEmail,
        customerType: newType,
        preferredLocationId: newLocationId || undefined,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setNewName("");
        setNewPhone("");
        setNewEmail("");
        router.refresh();
      } else {
        alert(res.error || "Failed to create customer");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMergeCustomers = async () => {
    if (!activeCustomer || selectedForMerge.length === 0) return;

    const confirmed = window.confirm(
      `Merge ${selectedForMerge.length} duplicate record(s) into primary customer "${activeCustomer.name}"? This will consolidate all bills, messages, and tickets.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await mergeDuplicateCustomers({
        organizationId,
        primaryCustomerId: activeCustomer.id,
        duplicateCustomerIds: selectedForMerge,
      });

      if (res.success) {
        setIsMergeModalOpen(false);
        setSelectedForMerge([]);
        router.refresh();
      } else {
        alert(res.error || "Merge failed");
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
          <h1 className="crm-header-title">Customer Master & 360 Timeline</h1>
          <p className="crm-header-subtitle">
            Unified omnichannel profile with real-time POS purchase histories, WhatsApp threads, and service tickets.
          </p>
        </div>
        <div className="crm-header-actions">
          <button
            onClick={() => setIsMergeModalOpen(true)}
            className="crm-btn-ghost"
            title="Consolidate duplicate customer profiles"
          >
            <GitMerge size={15} />
            Merge Duplicates
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="crm-btn-primary"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* 2. Compact Operational Filter Bar */}
      <div
        className="crm-card"
        style={{
          marginBottom: "1rem",
          padding: "0.625rem 1rem",
          backgroundColor: "#ffffff",
          borderRadius: "0.5rem",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          {/* 1. Universal Search Bar (Wide flex-grow) */}
          <div style={{ position: "relative", flex: "1 1 0%", minWidth: "220px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              value={searchInputVal}
              onChange={(e) => setSearchInputVal(e.target.value)}
              placeholder="Search Name, Phone, or Email..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 12px 8px 34px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "0.375rem",
                fontSize: "0.825rem",
                color: "#0f172a",
                outline: "none",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#d97706";
                e.target.style.backgroundColor = "#ffffff";
                e.target.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.backgroundColor = "#f8fafc";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* 2. Category Dropdown */}
          <select
            value={activeCategory}
            onChange={(e) => updateQueryParam({ category: e.target.value, type: null, page: "1" })}
            style={{
              flexShrink: 0,
              padding: "8px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              fontSize: "0.825rem",
              fontWeight: 500,
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#d97706")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="ALL">All Categories</option>
            <option value="RETAIL">Retail / Walk-in</option>
            <option value="B2B">B2B / Corporate</option>
            <option value="CATERING">Catering Client</option>
          </select>

          {/* 3. Status Dropdown */}
          <select
            value={activeStatus}
            onChange={(e) => updateQueryParam({ status: e.target.value, page: "1" })}
            style={{
              flexShrink: 0,
              padding: "8px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              fontSize: "0.825rem",
              fontWeight: 500,
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#d97706")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          {/* 4. Sort By Dropdown */}
          <select
            value={activeSort}
            onChange={(e) => updateQueryParam({ sort: e.target.value, page: "1" })}
            style={{
              flexShrink: 0,
              padding: "8px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              fontSize: "0.825rem",
              fontWeight: 500,
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#d97706")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="NEWEST">Newest First</option>
            <option value="SPEND_DESC">Highest Total Spend</option>
            <option value="RECENTLY_ADDED">Recently Added</option>
            <option value="ALPHA_ASC">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 3. Split-View Layout */}
      <div className="crm-split-layout">
        {/* LEFT COLUMN: Customer Master Table */}
        <div className="crm-card">
          <div className="crm-card-header">
            <h2 className="crm-card-title">
              <Users size={17} color="#d97706" />
              Customer Master Ledger
            </h2>
          </div>

          {customers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
              <Users size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No customers found</p>
              <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                Add your first customer or try adjusting your search filters.
              </p>
            </div>
          ) : (
            <>
              <div className="crm-table-container">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Customer Details</th>
                      <th>Type & RFM</th>
                      <th>Score</th>
                      <th>POS Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => {
                      const isSelected = c.id === activeCustomer?.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => updateQueryParam({ selectedId: c.id })}
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#fffbeb" : undefined,
                            borderLeft: isSelected ? "3px solid #d97706" : "3px solid transparent",
                          }}
                        >
                          <td>
                            <strong style={{ display: "block", color: "#0f172a", fontSize: "0.9rem" }}>
                              {c.name}
                            </strong>
                            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
                              {c.phone && <span>{c.phone}</span>}
                              {c.email && <span>• {c.email}</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                              <span
                                className={`crm-badge ${
                                  c.customerType === "VIP"
                                    ? "crm-badge-vip"
                                    : c.customerType === "B2B"
                                    ? "crm-badge-loyal"
                                    : "crm-badge-new"
                                }`}
                              >
                                {c.customerType || "RETAIL"}
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                {c.rfmSegment || "NEW"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Star size={13} color="#d97706" />
                              <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>
                                {c.priorityScore ?? 50}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "#0f172a", fontSize: "0.9rem" }}>
                              ₹{Number(c.monetarySpend || 0).toLocaleString("en-IN")}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* URL-State Pagination Bar */}
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

        {/* RIGHT COLUMN: 360 Unified Omnichannel Timeline */}
        <div className="crm-timeline-card">
          <div className="crm-timeline-header">
            {activeCustomer ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                    {activeCustomer.name}
                  </h3>
                  <span className="crm-badge crm-badge-vip">
                    {activeCustomer.rfmSegment || "ACTIVE"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
                  <span>Phone: {activeCustomer.phone || "N/A"}</span>
                  <span>• Consent: {activeCustomer.whatsappConsent !== false ? "WhatsApp Opted-In" : "Opted-Out"}</span>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Select a customer</p>
            )}
          </div>

          <div className="crm-timeline-body">
            {timelineLoading ? (
              <p style={{ color: "#64748b", fontSize: "0.85rem", textAlign: "center", margin: "2rem 0" }}>
                Loading timeline...
              </p>
            ) : timelineEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "#64748b" }}>
                <Clock size={28} style={{ margin: "0 auto 0.5rem", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: "0.85rem" }}>No interactions logged yet</p>
                <p style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
                  POS sales bills, WhatsApp messages, and service tickets will automatically populate here.
                </p>
              </div>
            ) : (
              timelineEvents.map((evt, idx) => (
                <div key={idx} className="crm-timeline-item">
                  <div
                    className="crm-timeline-icon"
                    style={{
                      backgroundColor:
                        evt.type === "INVOICE"
                          ? "#dcfce7"
                          : evt.type === "WHATSAPP"
                          ? "#e0e7ff"
                          : "#fee2e2",
                      color:
                        evt.type === "INVOICE"
                          ? "#16a34a"
                          : evt.type === "WHATSAPP"
                          ? "#3730a3"
                          : "#dc2626",
                    }}
                  >
                    {evt.type === "INVOICE" ? (
                      <Receipt size={14} />
                    ) : evt.type === "WHATSAPP" ? (
                      <MessageSquare size={14} />
                    ) : (
                      <LifeBuoy size={14} />
                    )}
                  </div>
                  <div className="crm-timeline-content">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.825rem", color: "#0f172a" }}>
                        {evt.title}
                      </strong>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                        {new Date(evt.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#475569" }}>
                      {evt.subtitle}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Add Customer Modal */}
      {isAddModalOpen && (
        <div className="crm-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3 className="crm-modal-title">
                <Users size={18} color="#d97706" />
                Add New Customer
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="crm-modal-body">
                <div className="crm-form-group">
                  <label className="crm-form-label">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Phone Number (10 digits)</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 9842771993"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. ramesh@example.com"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Customer Classification</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="crm-form-select"
                  >
                    <option value="RETAIL">Retail Customer</option>
                    <option value="VIP">VIP Patron</option>
                    <option value="B2B">B2B Commercial</option>
                    <option value="CATERING">Catering Client</option>
                  </select>
                </div>

                {locations.length > 0 && (
                  <div className="crm-form-group">
                    <label className="crm-form-label">Preferred Location</label>
                    <select
                      value={newLocationId}
                      onChange={(e) => setNewLocationId(e.target.value)}
                      className="crm-form-select"
                    >
                      <option value="">Org-wide / No specific branch</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="crm-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  {submitting ? "Saving..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Merge Duplicates Modal */}
      {isMergeModalOpen && (
        <div className="crm-modal-overlay" onClick={() => setIsMergeModalOpen(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3 className="crm-modal-title">
                <GitMerge size={18} color="#d97706" />
                Merge Duplicate Customers
              </h3>
              <button
                onClick={() => setIsMergeModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="crm-modal-body">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                Primary Master Profile: <strong style={{ color: "#0f172a" }}>{activeCustomer?.name}</strong> (
                {activeCustomer?.phone || "No phone"})
              </p>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                Select secondary duplicate accounts below to consolidate into this master record:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem", maxHeight: "200px", overflowY: "auto" }}>
                {customers
                  .filter((c) => c.id !== activeCustomer?.id)
                  .map((dup) => {
                    const isChecked = selectedForMerge.includes(dup.id);
                    return (
                      <label
                        key={dup.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #e2e8f0",
                          backgroundColor: isChecked ? "#fffbeb" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForMerge((prev) => [...prev, dup.id]);
                            } else {
                              setSelectedForMerge((prev) => prev.filter((id) => id !== dup.id));
                            }
                          }}
                        />
                        <div style={{ fontSize: "0.825rem" }}>
                          <strong>{dup.name}</strong> • {dup.phone || "No phone"} ({dup.email || "No email"})
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="crm-modal-footer">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="crm-btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMergeCustomers}
                disabled={submitting || selectedForMerge.length === 0}
                className="crm-btn-primary"
              >
                {submitting ? "Merging..." : `Merge ${selectedForMerge.length} Record(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
