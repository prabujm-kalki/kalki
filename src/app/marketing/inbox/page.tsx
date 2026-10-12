"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import {
  MessageSquare,
  Search,
  Send,
  User,
  Building,
  RefreshCw,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function MarketingInboxPage() {
  const { selected } = useSessionView();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const fetchConversations = async () => {
    if (!selected?.organizationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/whatsapp/communications?organizationId=${selected.organizationId}&limit=50`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConversations(json.data);
        if (!selectedThread && json.data.length > 0) {
          setSelectedThread(json.data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // 10s live inbox poller
    return () => clearInterval(interval);
  }, [selected?.organizationId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim() || !selected?.organizationId) return;

    const targetPhone = selectedThread.direction === "INBOUND" ? selectedThread.senderNumber : selectedThread.recipientNumber;

    setSending(true);
    setSendSuccess(null);
    try {
      const res = await fetch("/api/settings/whatsapp/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected.organizationId,
          to: targetPhone,
          text: replyText.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSendSuccess("Message sent!");
        setReplyText("");
        setTimeout(() => {
          fetchConversations();
          setSendSuccess(null);
        }, 1000);
      } else {
        alert(json.error || "Failed to deliver message.");
      }
    } catch (err: any) {
      alert(err?.message || "Network error");
    } finally {
      setSending(false);
    }
  };

  const filteredLogs = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.senderNumber && c.senderNumber.includes(q)) ||
      (c.recipientNumber && c.recipientNumber.includes(q)) ||
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.vendorName && c.vendorName.toLowerCase().includes(q)) ||
      (c.content && c.content.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Two-Way WhatsApp Inbox
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Real-time chat desk for customer service, order inquiries, and broadcast replies.
          </p>
        </div>
        <button
          onClick={fetchConversations}
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
          Refresh Inbox
        </button>
      </div>

      {/* Split View Container */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          overflow: "hidden",
        }}
      >
        {/* Left Pane: Conversations List */}
        <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
          {/* Search Bar */}
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone or customer..."
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* List Items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredLogs.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                No conversations found.
              </div>
            ) : (
              filteredLogs.map((item) => {
                const isSelected = selectedThread?.id === item.id;
                const isInbound = item.direction === "INBOUND";
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedThread(item)}
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isSelected ? "#e2e8f0" : "#ffffff",
                      cursor: "pointer",
                      transition: "background-color 0.1s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>
                        {item.customerName || item.vendorName || (isInbound ? item.senderNumber : item.recipientNumber)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.3rem",
                          borderRadius: "0.2rem",
                          backgroundColor: isInbound ? "#22c55e" : "#3b82f6",
                          color: "#ffffff",
                        }}
                      >
                        {item.direction}
                      </span>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.content || "<Media / Empty>"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread Chat View */}
        {selectedThread ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#ffffff" }}>
            {/* Thread Header */}
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                  {selectedThread.customerName
                    ? `${selectedThread.customerName} (${selectedThread.customerPhone})`
                    : selectedThread.vendorName
                    ? `Vendor: ${selectedThread.vendorName}`
                    : selectedThread.direction === "INBOUND"
                    ? `From: ${selectedThread.senderNumber}`
                    : `To: ${selectedThread.recipientNumber}`}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Status: <strong>{selectedThread.status}</strong> • Type: {selectedThread.messageType}
                </span>
              </div>
            </div>

            {/* Chat Body Bubble */}
            <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  alignSelf: selectedThread.direction === "INBOUND" ? "flex-start" : "flex-end",
                  maxWidth: "75%",
                  backgroundColor: selectedThread.direction === "INBOUND" ? "#f0fdf4" : "#eff6ff",
                  border: `1px solid ${selectedThread.direction === "INBOUND" ? "#bbf7d0" : "#bfdbfe"}`,
                  padding: "0.875rem 1.25rem",
                  borderRadius: "1rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ fontSize: "0.9rem", color: "#1e293b", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                  {selectedThread.content}
                </div>
                <div style={{ textAlign: "right", fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.4rem" }}>
                  {new Date(selectedThread.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>

            {/* Quick Reply Form */}
            <form onSubmit={handleSendReply} style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              {sendSuccess && (
                <div style={{ padding: "0.4rem 0.6rem", borderRadius: "0.375rem", backgroundColor: "#dcfce7", color: "#15803d", fontSize: "0.75rem", marginBottom: "0.5rem" }}>
                  {sendSuccess}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  type="text"
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply via WhatsApp to ${selectedThread.direction === "INBOUND" ? selectedThread.senderNumber : selectedThread.recipientNumber}...`}
                  style={{
                    flex: 1,
                    padding: "0.6rem 0.85rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    backgroundColor: sending || !replyText.trim() ? "#94a3b8" : "#16a34a",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Send size={14} />
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
            Select a conversation on the left to view messages and reply.
          </div>
        )}
      </div>
    </div>
  );
}
