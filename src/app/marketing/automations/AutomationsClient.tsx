"use client";

import React, { useState, useEffect } from "react";
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
  Calendar,
  Sparkles,
  ShieldCheck,
  Trash2,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  toggleAutomationStatus,
  createMarketingAutomation,
  createLifecycleAutomationWorkflow,
  toggleLifecycleAutomationWorkflow,
  deleteLifecycleAutomationWorkflow,
} from "@/domains/marketing/marketingAutomationService";

interface MetaTemplateItem {
  id: string;
  name: string;
  displayName: string | null;
  category: string;
  language: string;
  status: string;
  bodyText: string;
}

interface AutomatedTemplateItem {
  id: string;
  organizationId: string;
  locationId: string | null;
  name: string;
  targetEntityType: string;
  cycleDurationWeeks: number;
  status: string;
  isAutomated: boolean;
  triggerRule: string | null;
  scheduleCron: string | null;
  createdAt: Date;
}

interface AutomationsClientProps {
  organizationId: string;
  locationId?: string | null;
  targetRule?: string;
  openCreate?: boolean;
  automatedTemplates: AutomatedTemplateItem[];
  metaTemplates: MetaTemplateItem[];
  automations: any[];
}

const CRM_RULES = [
  {
    key: "DORMANT_VIPS",
    name: "Dormant VIPs (Win-Back)",
    desc: "High lifetime spend customers (₹10,000+) inactive for over 90 days",
    badge: "VIP Inactivity",
    color: "#f59e0b",
  },
  {
    key: "AOV_DROPS",
    name: "AOV Drop Anomaly (Upsell Stimulus)",
    desc: "Recent 30-day average order value dropped by > 5% vs 90-day baseline",
    badge: "Basket Deficit",
    color: "#ea580c",
  },
  {
    key: "CRITICAL_DEBTORS",
    name: "Critical Overdue Debtors (Settlement Reminder)",
    desc: "Unpaid customer receivables with invoices overdue by more than 30 days",
    badge: "Overdue Credit",
    color: "#ef4444",
  },
  {
    key: "NEW_VIPS",
    name: "New High-Value VIPs (Welcome Journey)",
    desc: "First-time patrons spending over ₹10,000 in recent visits",
    badge: "First-Time VIP",
    color: "#16a34a",
  },
  {
    key: "SPEND_ANOMALIES",
    name: "Spend Spike Anomalies",
    desc: "Customers showing abnormal surge in order spend (3x over store baseline)",
    badge: "Spike Spike",
    color: "#6366f1",
  },
];

const SCHEDULE_PRESETS = [
  { label: "Every Monday at 9:00 AM", cron: "0 9 * * 1" },
  { label: "Every Wednesday at 10:00 AM", cron: "0 10 * * 3" },
  { label: "Every Friday at 11:00 AM", cron: "0 11 * * 5" },
  { label: "Every Day at 10:00 AM", cron: "0 10 * * *" },
  { label: "1st Day of Every Month at 9:00 AM", cron: "0 9 1 * *" },
  { label: "Custom Schedule Cron", cron: "CUSTOM" },
];

export default function AutomationsClient({
  organizationId,
  locationId,
  targetRule = "",
  openCreate = false,
  automatedTemplates = [],
  metaTemplates = [],
  automations = [],
}: AutomationsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"DYNAMIC_WORKFLOWS" | "EVENT_DRIPS">("DYNAMIC_WORKFLOWS");

  // Workflow builder modal state
  const [showWorkflowModal, setShowWorkflowModal] = useState(openCreate || Boolean(targetRule));
  const [workflowName, setWorkflowName] = useState("");
  const [selectedRule, setSelectedRule] = useState(targetRule || "DORMANT_VIPS");
  const [selectedMetaTemplate, setSelectedMetaTemplate] = useState("");
  const [cycleDurationWeeks, setCycleDurationWeeks] = useState(3);
  const [scheduleCronPreset, setScheduleCronPreset] = useState("0 9 * * 1");
  const [customCron, setCustomCron] = useState("0 9 * * 1");
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);
  const [togglingWorkflowId, setTogglingWorkflowId] = useState<string | null>(null);

  // Existing event-triggered modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventTriggerType, setEventTriggerType] = useState("POS_BILL_CREATED");
  const [eventChannel, setEventChannel] = useState("WHATSAPP");
  const [eventTemplateName, setEventTemplateName] = useState("order_receipt_v1");
  const [eventDripDelay, setEventDripDelay] = useState(15);
  const [eventTargetSegment, setEventTargetSegment] = useState("ALL");
  const [eventFatigueDays, setEventFatigueDays] = useState(7);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);

  // Auto-fill template name based on rule if not yet customized
  useEffect(() => {
    if (metaTemplates.length > 0 && !selectedMetaTemplate) {
      setSelectedMetaTemplate(metaTemplates[0].name);
    }
  }, [metaTemplates, selectedMetaTemplate]);

  useEffect(() => {
    if (!workflowName && selectedRule) {
      const ruleObj = CRM_RULES.find((r) => r.key === selectedRule);
      if (ruleObj) {
        setWorkflowName(`${ruleObj.name} Lifecycle Drip`);
      }
    }
  }, [selectedRule, workflowName]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowName.trim()) {
      alert("Please provide a name for this automated lifecycle workflow.");
      return;
    }

    const effectiveCron = scheduleCronPreset === "CUSTOM" ? customCron : scheduleCronPreset;

    setSubmittingWorkflow(true);
    try {
      const res = await createLifecycleAutomationWorkflow({
        organizationId,
        locationId,
        name: workflowName.trim(),
        triggerRule: selectedRule,
        cycleDurationWeeks: Number(cycleDurationWeeks),
        scheduleCron: effectiveCron,
        metaTemplateName: selectedMetaTemplate || undefined,
      });

      if (!res.success) {
        alert(res.error || "Failed to create workflow");
      } else {
        setShowWorkflowModal(false);
        setWorkflowName("");
        router.refresh();
      }
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  const handleToggleWorkflow = async (id: string, currentStatus: string) => {
    setTogglingWorkflowId(id);
    try {
      const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const res = await toggleLifecycleAutomationWorkflow(id, newStatus);
      if (!res.success) {
        alert(res.error || "Failed to toggle status");
      } else {
        router.refresh();
      }
    } finally {
      setTogglingWorkflowId(null);
    }
  };

  const handleDeleteWorkflow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the automation workflow "${name}"?`)) return;
    const res = await deleteLifecycleAutomationWorkflow(id);
    if (!res.success) {
      alert(res.error || "Failed to delete workflow");
    } else {
      router.refresh();
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return alert("Please specify an automation journey name");

    setSubmittingEvent(true);
    try {
      const res = await createMarketingAutomation({
        organizationId,
        locationId: locationId || undefined,
        name: eventName,
        triggerType: eventTriggerType,
        channel: eventChannel,
        templateName: eventTemplateName,
        dripDelayMinutes: Number(eventDripDelay),
        targetSegment: eventTargetSegment,
        excludeIfMessagedInDays: Number(eventFatigueDays),
      });

      if (!res.success) {
        alert(res.error || "Failed to create event automation");
      } else {
        setShowEventModal(false);
        setEventName("");
        router.refresh();
      }
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleToggleEvent = async (id: string, currentStatus: string) => {
    setTogglingEventId(id);
    try {
      const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const res = await toggleAutomationStatus(id, newStatus);
      if (!res.success) {
        alert(res.error || "Failed to toggle event automation");
      } else {
        router.refresh();
      }
    } finally {
      setTogglingEventId(null);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* 1. Module Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.75rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                backgroundColor: "#fef3c7",
                color: "#92400e",
                fontSize: "0.725rem",
                fontWeight: 700,
                padding: "0.2rem 0.5rem",
                borderRadius: "0.25rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              KUAB Synced Drip Bus
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Enterprise Engine</span>
          </div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
            Automated Lifecycle Marketing & Drip Engine
          </h1>
          <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Autonomous dynamic list evaluation, multi-week spam cycle protection, and scheduled Meta Cloud WhatsApp drips.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setShowWorkflowModal(true)}
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "0.5rem",
              backgroundColor: "#d97706",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              boxShadow: "0 2px 4px rgba(217, 119, 6, 0.2)",
            }}
          >
            <Sparkles size={16} /> New Dynamic Drip Workflow
          </button>
          <button
            type="button"
            onClick={() => setShowEventModal(true)}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "1px solid #cbd5e1",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Plus size={15} /> New Event Journey
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          marginBottom: "1.5rem",
          gap: "1.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("DYNAMIC_WORKFLOWS")}
          style={{
            padding: "0.75rem 0.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "DYNAMIC_WORKFLOWS" ? "3px solid #d97706" : "3px solid transparent",
            color: activeTab === "DYNAMIC_WORKFLOWS" ? "#d97706" : "#64748b",
            fontWeight: activeTab === "DYNAMIC_WORKFLOWS" ? 700 : 500,
            fontSize: "0.925rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Layers size={17} />
          <span>Dynamic List Workflows</span>
          <span
            style={{
              backgroundColor: activeTab === "DYNAMIC_WORKFLOWS" ? "#fef3c7" : "#f1f5f9",
              color: activeTab === "DYNAMIC_WORKFLOWS" ? "#92400e" : "#64748b",
              borderRadius: "1rem",
              padding: "0.1rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {automatedTemplates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("EVENT_DRIPS")}
          style={{
            padding: "0.75rem 0.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "EVENT_DRIPS" ? "3px solid #16a34a" : "3px solid transparent",
            color: activeTab === "EVENT_DRIPS" ? "#16a34a" : "#64748b",
            fontWeight: activeTab === "EVENT_DRIPS" ? 700 : 500,
            fontSize: "0.925rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Bot size={17} />
          <span>Event-Triggered Journeys</span>
          <span
            style={{
              backgroundColor: activeTab === "EVENT_DRIPS" ? "#dcfce7" : "#f1f5f9",
              color: activeTab === "EVENT_DRIPS" ? "#166534" : "#64748b",
              borderRadius: "1rem",
              padding: "0.1rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {automations.length}
          </span>
        </button>
      </div>

      {/* 3. TAB 1: Dynamic List Workflows */}
      {activeTab === "DYNAMIC_WORKFLOWS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {automatedTemplates.length === 0 ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "3.5rem 2rem",
                borderRadius: "0.75rem",
                border: "1px dashed #cbd5e1",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <Sparkles size={40} color="#d97706" style={{ margin: "0 auto 0.75rem" }} />
              <h3 style={{ margin: 0, fontWeight: 700, color: "#0f172a", fontSize: "1.1rem" }}>
                No Dynamic Lifecycle Drip Workflows Configured
              </h3>
              <p style={{ margin: "0.4rem auto 1.25rem", fontSize: "0.875rem", maxWidth: "480px" }}>
                Map your CRM Intelligence anomaly lists (Dormant VIPs, AOV Drops, Critical Debtors) to Meta WhatsApp templates with automated multi-week spam cycle suppression.
              </p>
              <button
                type="button"
                onClick={() => setShowWorkflowModal(true)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: "0.375rem",
                  backgroundColor: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Create Your First Drip Workflow
              </button>
            </div>
          ) : (
            automatedTemplates.map((item) => {
              const isActive = item.status === "ACTIVE";
              const isToggling = togglingWorkflowId === item.id;
              const ruleDef = CRM_RULES.find((r) => r.key === item.triggerRule) || {
                key: item.triggerRule || "DYNAMIC",
                name: item.triggerRule || "Dynamic CRM Rule",
                badge: "CRM Rule",
                color: "#64748b",
              };

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    border: "1px solid #e2e8f0",
                    borderLeft: `5px solid ${ruleDef.color}`,
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    gap: "1.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1 }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "0.5rem",
                        backgroundColor: isActive ? "#fffbeb" : "#f1f5f9",
                        color: isActive ? ruleDef.color : "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Layers size={22} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                          {item.name}
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
                          {item.status}
                        </span>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backgroundColor: "#f8fafc",
                            color: ruleDef.color,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {ruleDef.badge}
                        </span>
                      </div>

                      <div
                        style={{
                          margin: "0.4rem 0 0.5rem 0",
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          fontSize: "0.825rem",
                          color: "#475569",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <ShieldCheck size={14} color="#16a34a" />
                          <span>Spam Cooldown: <strong>{item.cycleDurationWeeks} Weeks</strong></span>
                        </div>
                        <span>•</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Calendar size={14} color="#0284c7" />
                          <span>Schedule: <code style={{ backgroundColor: "#f1f5f9", padding: "0.1rem 0.35rem", borderRadius: "0.2rem" }}>{item.scheduleCron || "Every Monday 9 AM"}</code></span>
                        </div>
                        <span>•</span>
                        <span>Target: <strong>{item.targetEntityType}</strong></span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
                        <span>Worker Bus: <strong style={{ color: "#0284c7" }}>KUAB Scheduled Daemon</strong></span>
                        <span>•</span>
                        <span>Created: {new Date(item.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleWorkflow(item.id, item.status)}
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

                    <button
                      type="button"
                      onClick={() => handleDeleteWorkflow(item.id, item.name)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        padding: "0.4rem",
                        borderRadius: "0.375rem",
                      }}
                      title="Delete Workflow"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. TAB 2: Event-Triggered Journeys */}
      {activeTab === "EVENT_DRIPS" && (
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
              <p style={{ margin: 0, fontWeight: 600, color: "#0f172a" }}>No event-triggered journeys configured.</p>
              <p style={{ margin: "0.35rem 0 1rem", fontSize: "0.85rem" }}>
                Set up automated post-dining feedback, overdue reminders, or instant invoice drips.
              </p>
              <button
                type="button"
                onClick={() => setShowEventModal(true)}
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
              const isToggling = togglingEventId === auto.id;

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
                      onClick={() => handleToggleEvent(auto.id, auto.status)}
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
      )}

      {/* 5. MODAL: Create Dynamic Drip Lifecycle Workflow (Phase 3 Core) */}
      {showWorkflowModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
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
              maxWidth: "580px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={20} color="#d97706" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                  Map Dynamic List to WhatsApp Drip Workflow
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkflowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* 1. Workflow Name */}
              <div>
                <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dormant VIP Winback 3-Week Drip"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* 2. Select CRM Rule (Dynamic List) */}
              <div>
                <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  CRM Dynamic List Rule *
                </label>
                <select
                  value={selectedRule}
                  onChange={(e) => setSelectedRule(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    backgroundColor: "#ffffff",
                  }}
                >
                  {CRM_RULES.map((rule) => (
                    <option key={rule.key} value={rule.key}>
                      {rule.name}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                  {CRM_RULES.find((r) => r.key === selectedRule)?.desc}
                </span>
              </div>

              {/* 3. Select Meta WhatsApp Template */}
              <div>
                <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Meta WhatsApp Approved Template *
                </label>
                {metaTemplates.length > 0 ? (
                  <select
                    value={selectedMetaTemplate}
                    onChange={(e) => setSelectedMetaTemplate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {metaTemplates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.displayName || t.name} ({t.name}) [{t.status}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. dormant_vip_winback_offer_v1"
                    value={selectedMetaTemplate}
                    onChange={(e) => setSelectedMetaTemplate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
                )}
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                  Dispatches official WhatsApp Cloud API message template verified in Meta Business Suite.
                </span>
              </div>

              {/* 4. Cycle Duration (Spam Protection) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Cycle Cooldown Duration *
                  </label>
                  <select
                    value={cycleDurationWeeks}
                    onChange={(e) => setCycleDurationWeeks(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value={1}>1 Week (7 Days)</option>
                    <option value={2}>2 Weeks (14 Days)</option>
                    <option value={3}>3 Weeks (21 Days - Standard)</option>
                    <option value={4}>4 Weeks (28 Days)</option>
                    <option value={8}>8 Weeks (56 Days)</option>
                  </select>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                    Spam Guard: Excludes customers already enrolled in active cycles.
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Recurring Evaluation Schedule *
                  </label>
                  <select
                    value={scheduleCronPreset}
                    onChange={(e) => setScheduleCronPreset(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {SCHEDULE_PRESETS.map((p) => (
                      <option key={p.cron} value={p.cron}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                    Trigger time for KUAB cron lifecycle evaluation.
                  </span>
                </div>
              </div>

              {scheduleCronPreset === "CUSTOM" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Custom Cron Expression
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0 9 * * 1"
                    value={customCron}
                    onChange={(e) => setCustomCron(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowWorkflowModal(false)}
                  style={{
                    padding: "0.55rem 1rem",
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
                  disabled={submittingWorkflow}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    backgroundColor: "#d97706",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: submittingWorkflow ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {submittingWorkflow ? "Deploying..." : "Deploy Drip Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Create Event-Triggered Journey */}
      {showEventModal && (
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
                onClick={() => setShowEventModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.3rem" }}>
                  Journey Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-Dining Feedback & Rating Request"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
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
                    value={eventTriggerType}
                    onChange={(e) => setEventTriggerType(e.target.value)}
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
                    value={eventDripDelay}
                    onChange={(e) => setEventDripDelay(Number(e.target.value))}
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
                    value={eventTemplateName}
                    onChange={(e) => setEventTemplateName(e.target.value)}
                    placeholder="e.g. order_receipt_v1"
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
                    value={eventTargetSegment}
                    onChange={(e) => setEventTargetSegment(e.target.value)}
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
                  value={eventFatigueDays}
                  onChange={(e) => setEventFatigueDays(Number(e.target.value))}
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
                  onClick={() => setShowEventModal(false)}
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
                  disabled={submittingEvent}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: submittingEvent ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {submittingEvent ? "Deploying..." : "Sync & Deploy to KUAB"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
