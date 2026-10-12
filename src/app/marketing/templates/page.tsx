"use client";

import { useState } from "react";
import { LayoutTemplate, Plus, CheckCircle, Smartphone, Eye, Sparkles } from "lucide-react";

export default function MarketingTemplateStudioPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("hello_world");
  const [previewVars, setPreviewVars] = useState({ name: "Valued Customer", discount: "20%" });

  const templates = [
    {
      name: "hello_world",
      status: "APPROVED",
      category: "UTILITY",
      language: "en_US",
      body: "Welcome and congratulations! This message confirms that your WhatsApp Business account is active and connected.",
      type: "Standard Template",
    },
    {
      name: "po_vendor_dispatch",
      status: "APPROVED",
      category: "TRANSACTIONAL",
      language: "en",
      body: "Hello, please find Purchase Order #{poId} for {amount}. Please confirm delivery schedule.",
      type: "Purchasing",
    },
    {
      name: "diwali_festival_special",
      status: "APPROVED",
      category: "MARKETING",
      language: "en",
      body: "Happy Festival season from Kalki! Enjoy an exclusive {discount} discount on your next banquet or catering booking.",
      type: "Promotional",
    },
    {
      name: "payment_due_reminder",
      status: "APPROVED",
      category: "UTILITY",
      language: "en",
      body: "Gentle reminder: Invoice #{invoiceNo} for ₹{amount} has reached due date. Tap the link below to view or settle.",
      type: "Finance Alert",
    },
  ];

  const active = templates.find((t) => t.name === selectedTemplate) || templates[0];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            WhatsApp Template Studio & Catalog
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Review approved WhatsApp Cloud API message templates and preview customer rendering.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem" }}>
        {/* Left: Template Catalog List */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
            Registered Meta Templates ({templates.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {templates.map((tpl) => {
              const isSelected = tpl.name === selectedTemplate;
              return (
                <div
                  key={tpl.name}
                  onClick={() => setSelectedTemplate(tpl.name)}
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
                    <code style={{ fontSize: "0.85rem", fontWeight: 700, color: isSelected ? "#15803d" : "#0f172a" }}>
                      {tpl.name}
                    </code>
                    <span
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                      }}
                    >
                      {tpl.status}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.825rem", color: "#475569" }}>
                    {tpl.body}
                  </p>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Category: {tpl.category} • Language: {tpl.language}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Phone Preview Mockup */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Smartphone size={18} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
              Mobile Device Preview
            </h3>
          </div>

          {/* Smartphone Frame */}
          <div
            style={{
              width: "280px",
              minHeight: "440px",
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
            <div style={{ flex: 1, padding: "1rem" }}>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.5rem 0.5rem 0.5rem 0",
                  padding: "0.75rem",
                  fontSize: "0.8rem",
                  color: "#1e293b",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  lineHeight: "1.4",
                }}
              >
                {active.body}
                <div style={{ textAlign: "right", fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.3rem" }}>
                  12:00 PM ✓✓
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
