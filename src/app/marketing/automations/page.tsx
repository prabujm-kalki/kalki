"use client";

import { useState } from "react";
import { Bot, ToggleLeft, ToggleRight, Sparkles, Clock, CheckCircle2, ShieldCheck } from "lucide-react";

export default function MarketingAutomationsPage() {
  const [automations, setAutomations] = useState([
    {
      id: "auto-1",
      title: "Automated Payment Overdue Reminder",
      description: "Automatically triggers a WhatsApp notification when customer receivables are overdue by 15+ days.",
      trigger: "Invoice Status = Overdue",
      enabled: true,
      channel: "WhatsApp",
    },
    {
      id: "auto-2",
      title: "Purchase Order Dispatch to Vendors",
      description: "Sends PO details and PDF link to vendor WhatsApp immediately upon purchase order approval.",
      trigger: "PO Status = Approved",
      enabled: true,
      channel: "WhatsApp",
    },
    {
      id: "auto-3",
      title: "VIP Birthday & Anniversary Greeting",
      description: "Sends personalized celebration wishes with special dining offer codes at 9:00 AM.",
      trigger: "Customer Date of Birth = Today",
      enabled: false,
      channel: "WhatsApp",
    },
    {
      id: "auto-4",
      title: "Inbound 24/7 Out-of-Office Auto-Reply",
      description: "Sends an instant friendly acknowledgment when a customer chats outside operating hours.",
      trigger: "Inbound Message outside 9 AM - 10 PM",
      enabled: true,
      channel: "WhatsApp",
    },
  ]);

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
          WhatsApp Automations & Lifecycle Triggers
        </h1>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
          Automate routine operational alerts, customer follow-ups, and engagement workflows.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {automations.map((auto) => (
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
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "0.5rem",
                  backgroundColor: auto.enabled ? "#f0fdf4" : "#f1f5f9",
                  color: auto.enabled ? "#16a34a" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
                  {auto.title}
                </h3>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.825rem", color: "#64748b" }}>
                  {auto.description}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "#475569" }}>
                  <span>
                    Trigger: <strong style={{ color: "#1e293b" }}>{auto.trigger}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Channel: <strong style={{ color: "#16a34a" }}>{auto.channel}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => toggleAutomation(auto.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: auto.enabled ? "#16a34a" : "#94a3b8",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                {auto.enabled ? (
                  <>
                    <ToggleRight size={28} />
                    <span>Enabled</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft size={28} />
                    <span>Disabled</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
