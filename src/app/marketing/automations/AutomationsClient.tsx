"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Plus,
  Clock,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Send,
  Zap,
  Filter,
  X,
  Play,
  Pause,
} from "lucide-react";
import {
  toggleAutomationStatus,
  createMarketingAutomation,
} from "@/domains/marketing/marketingAutomationService";

interface AutomationsClientProps {
  organizationId: string;
  automations: any[];
}

export default function AutomationsClient({
  organizationId,
  automations,
}: AutomationsClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // New automation modal state
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("POS_BILL_CREATED");
  const [channel, setChannel] = useState("WHATSAPP");
  const [templateName, setTemplateName] = useState("order_receipt_v1");
  const [dripDelayMinutes, setDripDelayMinutes] = useState(15);
  const [targetSegment, setTargetSegment] = useState("ALL");
  const [excludeIfMessagedInDays, setExcludeIfMessagedInDays] = useState(7);

  const handleToggle = async (id: string, currentStatus: string) => {
    setTogglingId(id);
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await toggleAutomationStatus(id, newStatus);
    setTogglingId(null);
    if (!res.success) {
      alert(res.error || "Failed to toggle status");
    } else {
      router.refresh();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Please specify an automation journey name");

    setSubmitting(true);
    const res = await createMarketingAutomation({
      organizationId,
      name,
      triggerType,
      channel,
      templateName,
      dripDelayMinutes: Number(dripDelayMinutes),
      targetSegment,
      excludeIfMessagedInDays: Number(excludeIfMessagedInDays),
    });
    setSubmitting(false);

    if (!res.success) {
      alert(res.error || "Failed to create automation");
    } else {
      setShowModal(false);
      setName("");
      router.refresh();
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Automated Marketing Journeys (KUAB Synced)
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Event-triggered drip schedules managed autonomously by Kalki Universal Automation Bus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#16a34a",
            color: "#ffffff",
            fontSize: "0.85rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Plus size={16} /> New Drip Journey
        </button>
      </div>

      {/* Journeys List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {automations.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "3rem",
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <Bot size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ margin: 0, fontWeight: 600, color: "#0f172a" }}>No automated journeys configured yet.</p>
            <p style={{ margin: "0.35rem 0 1rem", fontSize: "0.85rem" }}>
              Set up automated post-dining feedback, overdue reminders, or win-back drips.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "0.375rem",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.825rem",
                cursor: "pointer",
              }}
            >
              Configure First Journey
            </button>
          </div>
        ) : (
          automations.map((auto) => {
            const isActive = auto.status === "ACTIVE";
            const isToggling = togglingId === auto.id;

            return (
              <div
                key={auto.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "0.5rem",
                      backgroundColor: isActive ? "#f0fdf4" : "#f1f5f9",
                      color: isActive ? "#16a34a" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={22} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                        {auto.name}
                      </h3>
                      <span
                        style={{
                          padding: "0.15rem 0.5rem",
                          borderRadius: "1rem",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          backgroundColor: isActive ? "#f0fdf4" : "#f8fafc",
                          color: isActive ? "#16a34a" : "#64748b",
                          border: `1px solid ${isActive ? "#bbf7d0" : "#e2e8f0"}`,
                        }}
                      >
                        {auto.status}
                      </span>
                    </div>

                    <p style={{ margin: "0.3rem 0 0.5rem 0", fontSize: "0.825rem", color: "#64748b" }}>
                      Trigger: <strong style={{ color: "#0f172a" }}>{auto.triggerType}</strong> • Drip Delay:{" "}
                      <strong style={{ color: "#0f172a" }}>{auto.dripDelayMinutes} mins</strong> • Target:{" "}
                      <strong style={{ color: "#0f172a" }}>{auto.targetSegment}</strong>
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "#64748b" }}>
                      <span>
                        Template: <code style={{ backgroundColor: "#f1f5f9", padding: "0.1rem 0.35rem", borderRadius: "0.2rem" }}>{auto.templateName || "None"}</code>
                      </span>
                      <span>•</span>
                      <span>
                        Executions: <strong style={{ color: "#16a34a" }}>{auto.executionCount} triggered</strong>
                      </span>
                      <span>•</span>
                      <span>KUAB Scheduler: <strong style={{ color: "#0284c7" }}>ACTIVE</strong></span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(auto.id, auto.status)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: isToggling ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      color: isActive ? "#16a34a" : "#94a3b8",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                    }}
                  >
                    {isActive ? (
                      <>
                        <ToggleRight size={32} />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={32} />
                        <span>Paused</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Drip Journey Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              width: "100%",
              maxWidth: "540px",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Zap size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                  Configure Automated Drip Journey
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.3rem" }}>
                  Journey Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-Dining Feedback & Rating Request"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.3rem" }}>
                    Trigger Event *
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="POS_BILL_CREATED">POS Bill Settlement</option>
                    <option value="INVOICE_OVERDUE">Receivables Overdue (15d)</option>
                    <option value="DORMANT_30_DAYS">Dormant Customer (30d No Visit)</option>
                    <option value="BIRTHDAY_TODAY">Birthday / Anniversary</option>
                    <option value="LEAD_STAGE_WON">CRM Lead Won</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.3rem" }}>
                    Drip Delay (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dripDelayMinutes}
                    onChange={(e) => setDripDelayMinutes(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.3rem" }}>
                    WhatsApp Template *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. hello_world"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.3rem" }}>
                    Target Audience Segment
                  </label>
                  <select
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="ALL">All Eligible Customers</option>
                    <option value="CHAMPIONS">Champions Only</option>
                    <option value="LOYAL">Loyal Customers</option>
                    <option value="AT_RISK">At Risk Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.3rem" }}>
                  Fatigue Exclusion Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={excludeIfMessagedInDays}
                  onChange={(e) => setExcludeIfMessagedInDays(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Will skip contacts if they were already broadcasted to within this timeframe.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#334155",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {submitting ? "Deploying..." : "Sync & Deploy to KUAB"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
