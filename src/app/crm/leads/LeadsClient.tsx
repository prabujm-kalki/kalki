"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Plus,
  Calendar,
  Phone,
  Mail,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Bot,
} from "lucide-react";
import { createCrmLead, updateLeadStage, scheduleLeadFollowUpViaKuab } from "@/domains/crm/crmService";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface LeadItem {
  id: string;
  title: string;
  leadType: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  stage: string;
  estimatedValue: string;
  eventDate: Date | null;
  notes: string | null;
  kuabFollowUpTaskId: string | null;
  createdAt: Date;
}

interface LeadsClientProps {
  organizationId: string;
  leads: LeadItem[];
  locations: { id: string; name: string }[];
  selectedType: string;
}

export default function LeadsClient(props: LeadsClientProps) {
  const { organizationId, leads, locations, selectedType } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedLeadForSchedule, setSelectedLeadForSchedule] = useState<LeadItem | null>(null);

  // New Lead Form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("CATERING");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Follow-up state
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  useEscapeKey(() => setIsAddModalOpen(false), isAddModalOpen);
  useEscapeKey(() => setIsScheduleModalOpen(false), isScheduleModalOpen);

  const STAGES = [
    { key: "NEW_ENQUIRY", label: "New Enquiry", color: "#3b82f6" },
    { key: "CONTACTED", label: "Contacted", color: "#f59e0b" },
    { key: "QUOTE_SENT", label: "Quote Sent", color: "#8b5cf6" },
    { key: "WON", label: "Won / Confirmed", color: "#10b981" },
    { key: "LOST", label: "Lost", color: "#ef4444" },
  ];

  const handleStageChange = async (leadId: string, nextStage: string) => {
    await updateLeadStage(leadId, nextStage);
    router.refresh();
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createCrmLead({
        organizationId,
        title: newTitle,
        leadType: newType,
        contactName: newName,
        contactPhone: newPhone,
        contactEmail: newEmail,
        estimatedValue: parseFloat(newValue || "0"),
        eventDate: newEventDate || undefined,
        notes: newNotes,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setNewTitle("");
        setNewName("");
        setNewPhone("");
        setNewValue("");
        router.refresh();
      } else {
        alert(res.error || "Failed to create lead");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForSchedule || !followUpDate) return;

    setSubmitting(true);
    try {
      const res = await scheduleLeadFollowUpViaKuab({
        organizationId,
        leadId: selectedLeadForSchedule.id,
        followUpDate,
        notes: followUpNotes,
      });

      if (res.success) {
        alert("Follow-up task scheduled successfully via Kalki Universal Automation Bus (KUAB)!");
        setIsScheduleModalOpen(false);
        setSelectedLeadForSchedule(null);
        setFollowUpDate("");
        setFollowUpNotes("");
        router.refresh();
      } else {
        alert(res.error || "Failed to schedule follow-up");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalPipelineValue = leads
    .filter((l) => l.stage !== "LOST")
    .reduce((acc, l) => acc + Number(l.estimatedValue || 0), 0);

  return (
    <>
      {/* 1. Header & Actions */}
      <div className="crm-header">
        <div>
          <h1 className="crm-header-title">B2B & Catering Pipeline (Kanban)</h1>
          <p className="crm-header-subtitle">
            Manage high-ticket banquet orders, outdoor catering packages, and bulk corporate meal contracts.
          </p>
        </div>
        <div className="crm-header-actions">
          <div style={{ textAlign: "right", marginRight: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Pipeline Value</span>
            <strong style={{ fontSize: "1.1rem", color: "#16a34a" }}>
              ₹{totalPipelineValue.toLocaleString("en-IN")}
            </strong>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="crm-btn-primary"
          >
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="crm-card" style={{ marginBottom: "1.25rem" }}>
        <div className="crm-filter-bar">
          <div className="crm-filter-group">
            <select
              value={selectedType}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value === "ALL") params.delete("leadType");
                else params.set("leadType", e.target.value);
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="crm-filter-select"
            >
              <option value="ALL">All Lead Types</option>
              <option value="CATERING">Catering & Banquet</option>
              <option value="B2B_BULK">B2B Bulk Orders</option>
              <option value="CORPORATE_EVENT">Corporate Events</option>
              <option value="FRANCHISE">Franchise Enquiries</option>
            </select>
          </div>

          <div style={{ fontSize: "0.825rem", color: "#64748b" }}>
            Total Pipeline Leads: <strong style={{ color: "#0f172a" }}>{leads.length}</strong>
          </div>
        </div>
      </div>

      {/* 3. 5-Stage Kanban Board */}
      <div className="crm-kanban-board">
        {STAGES.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.key);
          const colValue = colLeads.reduce((acc, l) => acc + Number(l.estimatedValue || 0), 0);

          return (
            <div key={col.key} className="crm-kanban-column">
              <div className="crm-kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: col.color,
                    }}
                  />
                  <span>{col.label}</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  ({colLeads.length}) • ₹{colValue.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="crm-kanban-cards">
                {colLeads.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8", fontSize: "0.75rem" }}>
                    No leads in this stage
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div key={lead.id} className="crm-lead-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                        <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>{lead.title}</strong>
                        <span className="crm-badge crm-badge-loyal" style={{ fontSize: "0.65rem" }}>
                          {lead.leadType}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "#475569", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Phone size={12} color="#64748b" />
                          <span>{lead.contactName} ({lead.contactPhone})</span>
                        </div>
                        {lead.eventDate && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Calendar size={12} color="#64748b" />
                            <span>Event: {new Date(lead.eventDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9" }}>
                        <strong style={{ color: "#16a34a", fontSize: "0.85rem" }}>
                          ₹{Number(lead.estimatedValue || 0).toLocaleString("en-IN")}
                        </strong>

                        {/* Quick KUAB Follow-up Button */}
                        <button
                          onClick={() => {
                            setSelectedLeadForSchedule(lead);
                            setIsScheduleModalOpen(true);
                          }}
                          className="crm-btn-ghost"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", color: "#d97706" }}
                          title="Schedule Follow-up Task via KUAB"
                        >
                          <Bot size={12} />
                          {lead.kuabFollowUpTaskId ? "Follow-up Set" : "+ Schedule"}
                        </button>
                      </div>

                      {/* Stage Shift Controls */}
                      <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem" }}>
                        <select
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.25rem 0.4rem",
                            borderRadius: "0.25rem",
                            border: "1px solid #e2e8f0",
                            fontSize: "0.7rem",
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              Move to: {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Add Lead Modal */}
      {isAddModalOpen && (
        <div className="crm-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3 className="crm-modal-title">
                <Briefcase size={18} color="#d97706" />
                Create New Lead / Enquiry
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLead}>
              <div className="crm-modal-body">
                <div className="crm-form-group">
                  <label className="crm-form-label">Enquiry Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Marriage Reception 600 Pax Dinner"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Lead Category</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="crm-form-select"
                  >
                    <option value="CATERING">Outdoor Catering / Banquet</option>
                    <option value="B2B_BULK">B2B Bulk Food Supply</option>
                    <option value="CORPORATE_EVENT">Corporate Party / Box Meals</option>
                    <option value="FRANCHISE">Franchise Expansion</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="crm-form-group">
                    <label className="crm-form-label">Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. S. Venkatesh"
                      className="crm-form-input"
                    />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-form-label">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="e.g. 9842771993"
                      className="crm-form-input"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="crm-form-group">
                    <label className="crm-form-label">Estimated Deal Value (₹)</label>
                    <input
                      type="number"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="e.g. 150000"
                      className="crm-form-input"
                    />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-form-label">Event / Booking Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="crm-form-input"
                    />
                  </div>
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Notes & Specifications</label>
                  <textarea
                    rows={3}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Menu preferences, hall location, payment terms..."
                    className="crm-form-textarea"
                  />
                </div>
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
                  {submitting ? "Saving..." : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Schedule KUAB Follow-up Modal */}
      {isScheduleModalOpen && selectedLeadForSchedule && (
        <div className="crm-modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3 className="crm-modal-title">
                <Bot size={18} color="#d97706" />
                Schedule Automation Follow-up (KUAB)
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleFollowUp}>
              <div className="crm-modal-body">
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                  Generating universal task for Lead: <strong style={{ color: "#0f172a" }}>{selectedLeadForSchedule.title}</strong>
                </p>

                <div className="crm-form-group" style={{ marginTop: "0.75rem" }}>
                  <label className="crm-form-label">Follow-up Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Follow-up Reminder Notes</label>
                  <textarea
                    rows={2}
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="e.g. Call client to finalize menu card and take 20% advance token."
                    className="crm-form-textarea"
                  />
                </div>
              </div>

              <div className="crm-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
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
                  {submitting ? "Scheduling..." : "Schedule KUAB Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
