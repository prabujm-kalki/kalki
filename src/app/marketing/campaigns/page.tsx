"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import {
  Megaphone,
  Plus,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  X,
  Clock,
} from "lucide-react";

export default function MarketingCampaignsPage() {
  const { selected } = useSessionView();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for New Campaign
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateName, setTemplateName] = useState("hello_world");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [audienceType, setAudienceType] = useState("ALL_CUSTOMERS");
  const [customPhones, setCustomPhones] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    if (!selected?.organizationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/campaigns?organizationId=${selected.organizationId}`);
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [selected?.organizationId]);

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !templateName.trim() || !selected?.organizationId) return;

    setLaunching(true);
    setLaunchError(null);
    setLaunchSuccess(null);

    const phones = customPhones
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 10);

    try {
      const res = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          name: name.trim(),
          description: description.trim(),
          templateName: templateName.trim(),
          templateLanguage,
          targetAudienceType: audienceType,
          customPhoneNumbers: phones.length > 0 ? phones : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setLaunchSuccess(`Campaign launched! ${json.data.sentCount} messages dispatched.`);
        setTimeout(() => {
          setIsModalOpen(false);
          setName("");
          setDescription("");
          setCustomPhones("");
          setLaunchSuccess(null);
          fetchCampaigns();
        }, 1500);
      } else {
        setLaunchError(json.error || "Failed to launch campaign.");
      }
    } catch (err: any) {
      setLaunchError(err?.message || "Execution exception");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            WhatsApp Campaigns & Broadcasts
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Broadcast marketing templates and seasonal offers directly to your customer base.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={fetchCampaigns}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
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
            New Broadcast Campaign
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
            All Broadcast Campaigns ({campaigns.length})
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
            <Megaphone size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem auto" }} />
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.25rem" }}>
              No marketing campaigns launched yet
            </div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
              Create your first campaign to broadcast announcements or promotional offers.
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Launch First Campaign
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "0.75rem 1.25rem" }}>Campaign Name</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Template</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Recipients</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Delivered</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Read</th>
                  <th style={{ padding: "0.75rem 1.25rem" }}>Launched At</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((camp) => (
                  <tr key={camp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <strong style={{ color: "#0f172a", display: "block" }}>{camp.name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{camp.targetAudienceType}</span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <code style={{ padding: "0.2rem 0.4rem", borderRadius: "0.25rem", backgroundColor: "#f1f5f9", color: "#16a34a", fontSize: "0.8rem" }}>
                        {camp.templateName}
                      </code>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          backgroundColor: camp.status === "COMPLETED" ? "#dcfce7" : "#eff6ff",
                          color: camp.status === "COMPLETED" ? "#15803d" : "#1d4ed8",
                        }}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 600, color: "#1e293b" }}>
                      {camp.totalRecipients}
                    </td>
                    <td style={{ padding: "1rem", color: "#0284c7", fontWeight: 600 }}>
                      {camp.deliveredCount}
                    </td>
                    <td style={{ padding: "1rem", color: "#16a34a", fontWeight: 600 }}>
                      {camp.readCount}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: "#64748b", fontSize: "0.8rem" }}>
                      {new Date(camp.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Launch Campaign Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              width: "100%",
              maxWidth: "560px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Megaphone size={18} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                  Launch WhatsApp Broadcast Campaign
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLaunchCampaign} style={{ padding: "1.25rem 1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Diwali Mega Sale Announcement"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Pre-Approved Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="hello_world"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                  Use pre-approved template name registered in Meta WhatsApp Business Account (e.g. <code>hello_world</code>).
                </span>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Target Audience
                </label>
                <select
                  value={audienceType}
                  onChange={(e) => setAudienceType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                    outline: "none",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="ALL_CUSTOMERS">All Registered ERP Customers</option>
                  <option value="CUSTOM_LIST">Custom Phone Numbers List</option>
                </select>
              </div>

              {audienceType === "CUSTOM_LIST" && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Paste Phone Numbers (comma or newline separated)
                  </label>
                  <textarea
                    rows={3}
                    value={customPhones}
                    onChange={(e) => setCustomPhones(e.target.value)}
                    placeholder="9790014356, 9842771993"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              {launchError && (
                <div style={{ padding: "0.6rem 0.75rem", borderRadius: "0.5rem", backgroundColor: "#fee2e2", color: "#991b1b", fontSize: "0.8rem", marginBottom: "1rem" }}>
                  {launchError}
                </div>
              )}

              {launchSuccess && (
                <div style={{ padding: "0.6rem 0.75rem", borderRadius: "0.5rem", backgroundColor: "#dcfce7", color: "#15803d", fontSize: "0.8rem", marginBottom: "1rem" }}>
                  {launchSuccess}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={launching}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    backgroundColor: launching ? "#94a3b8" : "#16a34a",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: launching ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Send size={14} />
                  {launching ? "Dispatching..." : "Launch Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
