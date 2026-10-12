"use client";

import { useState, useEffect } from "react";
import {
  LayoutTemplate,
  Plus,
  CheckCircle,
  Smartphone,
  Eye,
  Sparkles,
  Send,
  RefreshCw,
  AlertCircle,
  X,
  Bot,
  Globe,
  Tag,
  MessageSquare,
  HelpCircle,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useSessionView } from "@/components/AppShell";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import "../marketing.css";

interface WhatsAppTemplateItem {
  id: string;
  name: string;
  displayName: string | null;
  category: string;
  language: string;
  status: string;
  bodyText: string;
  headerType: string | null;
  headerText: string | null;
  footerText: string | null;
  variableCount: number;
  metaTemplateId: string | null;
  createdAt: string;
}

const DEFAULT_STARTER_TEMPLATES = [
  {
    id: "default-1",
    name: "hello_world",
    displayName: "Hello World (Meta Default)",
    category: "UTILITY",
    language: "en_US",
    status: "APPROVED",
    bodyText: "Welcome and congratulations! This message confirms that your WhatsApp Business account is active and connected.",
    headerType: "NONE",
    headerText: null,
    footerText: null,
    variableCount: 0,
    metaTemplateId: null,
    createdAt: new Date().toISOString(),
  },
];

export default function MarketingTemplateStudioPage() {
  const { selected } = useSessionView();
  const [templates, setTemplates] = useState<WhatsAppTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("hello_world");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create Template Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newCategory, setNewCategory] = useState<"MARKETING" | "UTILITY">("MARKETING");
  const [newLanguage, setNewLanguage] = useState("en");
  const [newHeaderText, setNewHeaderText] = useState("");
  const [newBodyText, setNewBodyText] = useState("");
  const [newFooterText, setNewFooterText] = useState("");
  const [newExamples, setNewExamples] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Close modal on Escape key press
  useEscapeKey(() => setIsCreateModalOpen(false), isCreateModalOpen);

  const fetchTemplates = async () => {
    if (!selected?.organizationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/templates?organizationId=${selected.organizationId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setTemplates(json.data);
        if (!json.data.some((t: any) => t.name === selectedTemplateName)) {
          setSelectedTemplateName(json.data[0].name);
        }
      } else {
        setTemplates(DEFAULT_STARTER_TEMPLATES);
      }
    } catch (e) {
      console.error(e);
      setTemplates(DEFAULT_STARTER_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selected?.organizationId]);

  // Handle Sync from Meta
  const handleSyncFromMeta = async () => {
    if (!selected?.organizationId) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/marketing/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SYNC_FROM_META",
          organizationId: selected.organizationId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSyncMessage({
          type: "success",
          text: json.message || "Templates successfully synchronized from Meta!",
        });
        fetchTemplates();
      } else {
        setSyncMessage({
          type: "error",
          text: json.error || "Failed to sync templates from Meta.",
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: "error",
        text: err?.message || "Network error syncing with Meta API.",
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 8000);
    }
  };

  // Handle Submit Template for Meta Approval
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBodyText.trim() || !selected?.organizationId) return;

    setSubmitting(true);
    setCreateError(null);
    setCreateSuccess(null);

    const examplesArray = newExamples
      .split(",")
      .map((ex) => ex.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/marketing/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_META_TEMPLATE",
          organizationId: selected.organizationId,
          name: newName.trim(),
          displayName: newDisplayName.trim() || undefined,
          category: newCategory,
          language: newLanguage,
          headerType: newHeaderText.trim() ? "TEXT" : "NONE",
          headerText: newHeaderText.trim() || undefined,
          bodyText: newBodyText.trim(),
          footerText: newFooterText.trim() || undefined,
          exampleVariables: examplesArray,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCreateSuccess("Template submitted successfully! Approval usually takes 2-5 minutes.");
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setNewName("");
          setNewDisplayName("");
          setNewHeaderText("");
          setNewBodyText("");
          setNewFooterText("");
          setNewExamples("");
          setCreateSuccess(null);
          fetchTemplates();
        }, 1500);
      } else {
        setCreateError(json.error || "Failed to submit template to Meta.");
      }
    } catch (err: any) {
      setCreateError(err?.message || "Network exception during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Save Template Directly to Local Catalog
  const handleSaveLocalTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selected?.organizationId) return;
    if (!newName.trim() || !newBodyText.trim()) {
      setCreateError("Template Slug Name and Body Message Content are required.");
      return;
    }

    setSubmitting(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const res = await fetch("/api/marketing/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_LOCAL",
          organizationId: selected.organizationId,
          name: newName.trim(),
          displayName: newDisplayName.trim() || undefined,
          category: newCategory,
          language: newLanguage,
          headerType: newHeaderText.trim() ? "TEXT" : "NONE",
          headerText: newHeaderText.trim() || undefined,
          bodyText: newBodyText.trim(),
          footerText: newFooterText.trim() || undefined,
          status: "APPROVED",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCreateSuccess("Template saved successfully to your catalog!");
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setNewName("");
          setNewDisplayName("");
          setNewHeaderText("");
          setNewBodyText("");
          setNewFooterText("");
          setNewExamples("");
          setCreateSuccess(null);
          fetchTemplates();
        }, 1200);
      } else {
        setCreateError(json.error || "Failed to save template to catalog.");
      }
    } catch (err: any) {
      setCreateError(err?.message || "Network exception during save.");
    } finally {
      setSubmitting(false);
    }
  };

  const active =
    templates.find((t) => t.name === selectedTemplateName) ||
    templates[0] ||
    DEFAULT_STARTER_TEMPLATES[0];

  const query = selected
    ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}`
    : "";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            WhatsApp Template Studio & Meta Approval Hub
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Design, submit, and auto-sync official WhatsApp Cloud API templates without opening Meta Business Manager.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* 1-Click Sync from Meta */}
          <button
            onClick={handleSyncFromMeta}
            disabled={syncing}
            style={{
              padding: "0.5rem 0.95rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: syncing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.15s ease",
            }}
            title="Import all approved templates directly from your WhatsApp Business Account"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing Meta..." : "Sync from Meta"}
          </button>

          {/* Create & Submit Template */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
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
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
            }}
          >
            <Plus size={16} />
            Create Template
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            marginBottom: "1.25rem",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: syncMessage.type === "success" ? "#dcfce7" : "#fee2e2",
            color: syncMessage.type === "success" ? "#15803d" : "#b91c1c",
            border: `1px solid ${syncMessage.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {syncMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* Main 2-Column Catalog & Smartphone Live Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem" }}>
        {/* Left: Template Catalog */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              Registered Templates ({templates.length})
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Active in Kalki BOS Broadcast Engine
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {templates.map((tpl) => {
              const isSelected = tpl.name === active.name;
              return (
                <div
                  key={`${tpl.name}-${tpl.language}`}
                  onClick={() => setSelectedTemplateName(tpl.name)}
                  style={{
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${isSelected ? "#16a34a" : "#e2e8f0"}`,
                    backgroundColor: isSelected ? "#f0fdf4" : "#f8fafc",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <code style={{ fontSize: "0.85rem", fontWeight: 700, color: isSelected ? "#15803d" : "#0f172a" }}>
                        {tpl.name}
                      </code>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          backgroundColor: "#ffffff",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "0.25rem",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {tpl.language}
                      </span>
                    </div>

                    <span
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        backgroundColor:
                          tpl.status === "APPROVED"
                            ? "#dcfce7"
                            : tpl.status === "PENDING"
                            ? "#fef3c7"
                            : "#fee2e2",
                        color:
                          tpl.status === "APPROVED"
                            ? "#15803d"
                            : tpl.status === "PENDING"
                            ? "#b45309"
                            : "#b91c1c",
                      }}
                    >
                      {tpl.status}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "0.8rem",
                      color: "#475569",
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {tpl.bodyText}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.72rem", color: "#64748b" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Tag size={11} /> {tpl.category}
                    </span>
                    <span>•</span>
                    <span>Variables: {tpl.variableCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Smartphone Live Simulation Preview */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", width: "100%" }}>
            <Smartphone size={18} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              Customer WhatsApp Device Preview
            </h3>
          </div>

          {/* Smartphone Frame */}
          <div
            style={{
              width: "290px",
              minHeight: "450px",
              backgroundColor: "#ece5dd",
              borderRadius: "2rem",
              border: "8px solid #1e293b",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Phone Top Notch */}
            <div style={{ backgroundColor: "#075e54", padding: "0.75rem 1rem", color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold" }}>
                K
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>Kalki BOS</div>
                <div style={{ fontSize: "0.6rem", opacity: 0.8 }}>Official Business Account</div>
              </div>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.5rem 0.5rem 0.5rem 0",
                  padding: "0.85rem",
                  fontSize: "0.825rem",
                  color: "#1e293b",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  lineHeight: "1.45",
                }}
              >
                {active.headerText && (
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.35rem", color: "#0f172a" }}>
                    {active.headerText}
                  </div>
                )}

                <div style={{ whiteSpace: "pre-wrap" }}>
                  {active.bodyText}
                </div>

                {active.footerText && (
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.4rem" }}>
                    {active.footerText}
                  </div>
                )}

                <div style={{ textAlign: "right", fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.3rem" }}>
                  12:00 PM ✓✓
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action: Launch Broadcast with this Template */}
          <Link
            href={`/marketing/campaigns${query}&template=${active.name}`}
            style={{
              marginTop: "1.25rem",
              width: "290px",
              padding: "0.65rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <Send size={14} />
            Broadcast with This Template →
          </Link>
        </div>
      </div>

      {/* =========================================================================
          CREATE & SUBMIT TEMPLATE MODAL (Direct to Meta)
          ========================================================================= */}
      {isCreateModalOpen && (
        <div className="kalki-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="kalki-modal-content" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="kalki-modal-header">
              <h3 className="kalki-modal-title">
                <Sparkles size={20} color="#16a34a" />
                Create WhatsApp Message Template
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="kalki-modal-close-btn"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="kalki-modal-form">
              <div className="kalki-modal-body">
                {/* Row: Template Name & Category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="kalki-form-group">
                    <label className="kalki-form-label">Template Slug Name *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. pongal_special_blast"
                      className="kalki-form-input"
                    />
                    <span className="kalki-form-hint">Lowercase letters, numbers, underscores only.</span>
                  </div>

                  <div className="kalki-form-group">
                    <label className="kalki-form-label">Category *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="kalki-form-select"
                    >
                      <option value="MARKETING">Marketing (Discounts, Offers, Promotions)</option>
                      <option value="UTILITY">Utility (Receipts, Invoices, Alerts)</option>
                    </select>
                  </div>
                </div>

                {/* Language Selector */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Language *</label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="kalki-form-select"
                  >
                    <option value="en">en (English)</option>
                    <option value="en_US">en_US (English - US)</option>
                    <option value="en_GB">en_GB (English - UK)</option>
                    <option value="ta">ta (Tamil)</option>
                    <option value="hi">hi (Hindi)</option>
                  </select>
                </div>

                {/* Optional Header Text */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Header Title (Optional)</label>
                  <input
                    type="text"
                    value={newHeaderText}
                    onChange={(e) => setNewHeaderText(e.target.value)}
                    placeholder="e.g. Exclusive Festive Celebration!"
                    className="kalki-form-input"
                  />
                </div>

                {/* Body Message */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Body Message Content *</label>
                  <textarea
                    required
                    rows={4}
                    value={newBodyText}
                    onChange={(e) => setNewBodyText(e.target.value)}
                    placeholder="Hello {{1}}, celebrate with Kalki! Enjoy an exclusive {{2}} discount on your next visit."
                    className="kalki-form-textarea"
                  />
                  <span className="kalki-form-hint">
                    Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; for variable placeholders.
                  </span>
                </div>

                {/* Example Values for Meta */}
                {newBodyText.includes("{{") && (
                  <div className="kalki-form-group">
                    <label className="kalki-form-label">Sample Values for Variables *</label>
                    <input
                      type="text"
                      required
                      value={newExamples}
                      onChange={(e) => setNewExamples(e.target.value)}
                      placeholder="e.g. Prabhu, 20% OFF (comma-separated for {{1}}, {{2}})"
                      className="kalki-form-input"
                    />
                    <span className="kalki-form-hint">
                      Meta review requires sample values to test the message.
                    </span>
                  </div>
                )}

                {/* Footer Text */}
                <div className="kalki-form-group">
                  <label className="kalki-form-label">Footer Note (Optional)</label>
                  <input
                    type="text"
                    value={newFooterText}
                    onChange={(e) => setNewFooterText(e.target.value)}
                    placeholder="e.g. Reply STOP to unsubscribe"
                    className="kalki-form-input"
                  />
                </div>

                {createError && (
                  <div className="kalki-alert-error">
                    <AlertCircle size={16} />
                    <span>{createError}</span>
                  </div>
                )}

                {createSuccess && (
                  <div className="kalki-alert-success">
                    <CheckCircle size={16} />
                    <span>{createSuccess}</span>
                  </div>
                )}
              </div>

              <div className="kalki-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="kalki-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLocalTemplate}
                  disabled={submitting}
                  style={{
                    padding: "0.55rem 0.95rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#334155",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s ease",
                  }}
                  title="Save directly into Kalki BOS Template Library without waiting for Meta review"
                >
                  <Save size={15} color="#0284c7" />
                  Save to Catalog
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="kalki-btn-primary"
                  title="Submit to Meta Cloud API for official approval"
                >
                  <Send size={15} />
                  {submitting ? "Submitting to Meta..." : "Submit for Meta Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
