"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSessionView } from "@/components/AppShell";
import {
  MessageSquare,
  Search,
  Send,
  User,
  RefreshCw,
  Phone,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
} from "lucide-react";

interface ChatMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  messageType: string;
  content: string;
  senderNumber: string;
  recipientNumber: string;
  metaMessageId?: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  vendorName?: string | null;
  metadata?: any;
}

interface GroupedThread {
  contactKey: string;
  contactPhone: string;
  contactName: string;
  latestMessage: ChatMessage;
  messages: ChatMessage[];
  hasInbound: boolean;
}

export default function MarketingInboxPage() {
  const { selected } = useSessionView();
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactKey, setSelectedContactKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = async () => {
    if (!selected?.organizationId) return;
    try {
      const res = await fetch(`/api/settings/whatsapp/communications?organizationId=${selected.organizationId}&limit=100`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConversations(json.data);
      }
    } catch (e) {
      console.error("[Fetch Conversations Error]:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 6000); // 6-second live polling
    return () => clearInterval(interval);
  }, [selected?.organizationId]);

  // Group raw messages into Contact Conversation Threads
  const groupedThreads = useMemo<GroupedThread[]>(() => {
    const threadMap = new Map<string, GroupedThread>();

    for (const msg of conversations) {
      const rawPhone = msg.direction === "INBOUND" ? msg.senderNumber : msg.recipientNumber;
      if (!rawPhone) continue;
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const key = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

      const name = msg.customerName || msg.vendorName || msg.metadata?.senderName || rawPhone;

      if (!threadMap.has(key)) {
        threadMap.set(key, {
          contactKey: key,
          contactPhone: rawPhone,
          contactName: name,
          latestMessage: msg,
          messages: [msg],
          hasInbound: msg.direction === "INBOUND",
        });
      } else {
        const th = threadMap.get(key)!;
        th.messages.push(msg);
        if (new Date(msg.createdAt).getTime() > new Date(th.latestMessage.createdAt).getTime()) {
          th.latestMessage = msg;
          if (name && name !== rawPhone) {
            th.contactName = name;
          }
        }
        if (msg.direction === "INBOUND") {
          th.hasInbound = true;
        }
      }
    }

    // Sort messages in each thread chronologically (oldest -> newest)
    for (const th of threadMap.values()) {
      th.messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    // Sort threads by most recent message first
    return Array.from(threadMap.values()).sort(
      (a, b) =>
        new Date(b.latestMessage.createdAt).getTime() -
        new Date(a.latestMessage.createdAt).getTime()
    );
  }, [conversations]);

  // Handle URL query params or initial selection
  useEffect(() => {
    if (groupedThreads.length === 0) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetPhone = params.get("phone");
      if (targetPhone) {
        const clean = targetPhone.replace(/\D/g, "").slice(-10);
        const match = groupedThreads.find((t) => t.contactKey.includes(clean));
        if (match) {
          setSelectedContactKey(match.contactKey);
          return;
        }
      }
    }
    if (!selectedContactKey) {
      setSelectedContactKey(groupedThreads[0].contactKey);
    }
  }, [groupedThreads, selectedContactKey]);

  // Active Thread
  const activeThread = useMemo(() => {
    if (!selectedContactKey) return groupedThreads[0] || null;
    return groupedThreads.find((t) => t.contactKey === selectedContactKey) || groupedThreads[0] || null;
  }, [groupedThreads, selectedContactKey]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeThread?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread?.messages?.length, selectedContactKey]);

  // Filtered threads list for search
  const filteredThreads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return groupedThreads;
    return groupedThreads.filter(
      (t) =>
        t.contactName.toLowerCase().includes(q) ||
        t.contactPhone.includes(q) ||
        t.messages.some((m) => (m.content || "").toLowerCase().includes(q))
    );
  }, [groupedThreads, searchQuery]);

  // Handle Reply Submission
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim() || !selected?.organizationId) return;

    const messageText = replyText.trim();
    const destinationPhone = activeThread.contactPhone;

    setSending(true);
    setSendSuccess(null);
    setSendError(null);

    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      direction: "OUTBOUND",
      status: "SENT",
      messageType: "text",
      content: messageText,
      senderNumber: "Kalki",
      recipientNumber: destinationPhone,
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) => [optimisticMsg, ...prev]);
    setReplyText("");

    try {
      const res = await fetch("/api/settings/whatsapp/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected.organizationId,
          to: destinationPhone,
          text: messageText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSendSuccess("Reply sent!");
        setTimeout(() => setSendSuccess(null), 3000);
        fetchConversations();
      } else {
        setSendError(json.error || "Failed to deliver WhatsApp message.");
      }
    } catch (err: any) {
      setSendError(err?.message || "Network exception sending reply.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div
      style={{
        maxWidth: "1380px",
        margin: "0 auto",
        height: "calc(100vh - 170px)",
        minHeight: "540px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.85rem",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Two-Way WhatsApp Inbox
          </h1>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.825rem", color: "#64748b" }}>
            Real-time chat desk for customer service, order inquiries, and broadcast replies.
          </p>
        </div>
        <button
          onClick={fetchConversations}
          style={{
            padding: "0.45rem 0.85rem",
            borderRadius: "0.5rem",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#475569",
            fontSize: "0.825rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.15s ease",
          }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Inbox
        </button>
      </div>

      {/* Main Split View Container */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: "#ffffff",
          borderRadius: "0.875rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          overflow: "hidden",
        }}
      >
        {/* =========================================================================
            LEFT COLUMN: Grouped Contact Threads List
           ========================================================================= */}
        <div
          style={{
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f8fafc",
            minHeight: 0,
            height: "100%",
          }}
        >
          {/* Search Bar */}
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contact or message..."
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.825rem",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>
          </div>

          {/* Contact Threads List Items */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {filteredThreads.length === 0 ? (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                No conversations found.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = activeThread?.contactKey === thread.contactKey;
                const latest = thread.latestMessage;
                const isLatestInbound = latest.direction === "INBOUND";

                return (
                  <div
                    key={thread.contactKey}
                    onClick={() => {
                      setSelectedContactKey(thread.contactKey);
                      setSendError(null);
                      setSendSuccess(null);
                    }}
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isSelected ? "#e0f2fe" : "#ffffff",
                      borderLeft: isSelected ? "3px solid #0284c7" : "3px solid transparent",
                      cursor: "pointer",
                      transition: "background-color 0.12s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: isSelected ? 700 : 600,
                          fontSize: "0.875rem",
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "190px",
                        }}
                      >
                        {thread.contactName}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {new Date(latest.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.35rem",
                          borderRadius: "0.25rem",
                          backgroundColor: isLatestInbound ? "#22c55e" : "#3b82f6",
                          color: "#ffffff",
                          flexShrink: 0,
                        }}
                      >
                        {isLatestInbound ? "IN" : "OUT"}
                      </span>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.775rem",
                          color: "#64748b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {latest.content || "<Empty / Media>"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: Full Active Conversation History & Pinned Reply Bar
           ========================================================================= */}
        {activeThread ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
              backgroundColor: "#ffffff",
              overflow: "hidden",
            }}
          >
            {/* Thread Header */}
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8fafc",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#e2e8f0",
                    color: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  {activeThread.contactName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    {activeThread.contactName}
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Phone size={11} />
                    <span>+{activeThread.contactPhone.replace(/\D/g, "")}</span>
                    <span>• {activeThread.messages.length} messages</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "1rem",
                    backgroundColor: "#dcfce7",
                    color: "#15803d",
                  }}
                >
                  WhatsApp Connected
                </span>
              </div>
            </div>

            {/* Chat Body (Full Message Stream) */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                padding: "1.25rem 1.5rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                backgroundColor: "#fcfdfe",
              }}
            >
              {activeThread.messages.map((msg, index) => {
                const isInbound = msg.direction === "INBOUND";

                return (
                  <div
                    key={msg.id || index}
                    style={{
                      alignSelf: isInbound ? "flex-start" : "flex-end",
                      maxWidth: "70%",
                      backgroundColor: isInbound ? "#f0fdf4" : "#eff6ff",
                      border: `1px solid ${isInbound ? "#bbf7d0" : "#bfdbfe"}`,
                      borderRadius: isInbound ? "1rem 1rem 1rem 0.25rem" : "1rem 1rem 0.25rem 1rem",
                      padding: "0.75rem 1rem",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    {/* Message Bubble Content */}
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#1e293b",
                        lineHeight: "1.45",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content}
                    </div>

                    {/* Metadata & Status */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "0.35rem",
                        fontSize: "0.685rem",
                        color: "#94a3b8",
                        marginTop: "0.15rem",
                      }}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!isInbound && (
                        <span>
                          {msg.status === "READ" ? (
                            <CheckCheck size={13} color="#2563eb" />
                          ) : msg.status === "DELIVERED" ? (
                            <CheckCheck size={13} color="#64748b" />
                          ) : (
                            <Check size={13} color="#64748b" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Pinned Reply Form */}
            <form
              onSubmit={handleSendReply}
              style={{
                flexShrink: 0,
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              {sendSuccess && (
                <div
                  style={{
                    padding: "0.35rem 0.65rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "#dcfce7",
                    color: "#15803d",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  ✓ {sendSuccess}
                </div>
              )}
              {sendError && (
                <div
                  style={{
                    padding: "0.35rem 0.65rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  ⚠ {sendError}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
                <input
                  ref={inputRef}
                  type="text"
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Type a reply to ${activeThread.contactName} (+${activeThread.contactPhone.replace(/\D/g, "")})...`}
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: "0.65rem 0.95rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.875rem",
                    outline: "none",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    backgroundColor: sending || !replyText.trim() ? "#94a3b8" : "#16a34a",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Send size={15} />
                  {sending ? "Sending..." : "Reply"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            Select a conversation on the left to view messages and reply.
          </div>
        )}
      </div>
    </div>
  );
}
