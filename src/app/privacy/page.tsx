import React from "react";

export const metadata = {
  title: "Privacy Policy - Kalki BOS",
  description: "Privacy Policy and Data Protection Terms for Kalki Business Operating System (Kalki BOS)",
};

export default function PrivacyPolicyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d1117",
        color: "#c9d1d9",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: "48px 20px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "840px",
          width: "100%",
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "12px",
          padding: "40px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ borderBottom: "1px solid #30363d", paddingBottom: "24px", marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#58a6ff",
              marginBottom: "8px",
            }}
          >
            Kalki Business Operating System
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#f0f6fc",
              margin: "0 0 12px 0",
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#8b949e" }}>
            Last updated: October 11, 2026 • Effective Date: October 11, 2026
          </p>
        </div>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "18px", color: "#f0f6fc", marginBottom: "12px" }}>
            1. Overview
          </h2>
          <p style={{ lineHeight: "1.6", fontSize: "14px", margin: 0 }}>
            Kalki Business Operating System (&quot;Kalki BOS&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides enterprise
            resource planning, customer relationship management, operational workflow automation,
            and messaging integrations. This Privacy Policy explains how we collect, use, disclose,
            and safeguard information when you interact with our platform and associated communication
            channels, including the Meta WhatsApp Cloud API.
          </p>
        </section>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "18px", color: "#f0f6fc", marginBottom: "12px" }}>
            2. Information We Collect
          </h2>
          <p style={{ lineHeight: "1.6", fontSize: "14px", marginBottom: "12px" }}>
            When businesses and end-users communicate through Kalki BOS, we may collect and process:
          </p>
          <ul style={{ paddingLeft: "20px", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
            <li>
              <strong>Contact Data:</strong> Phone number, WhatsApp Display Name, and associated customer contact details.
            </li>
            <li>
              <strong>Communication Records:</strong> Inbound and outbound message text, delivery timestamps, and status receipts (sent, delivered, read) to facilitate business inquiries and order coordination.
            </li>
            <li>
              <strong>Business Transactions:</strong> Invoices, purchase orders, reservation confirmations, and status updates communicated via automated alerts.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "18px", color: "#f0f6fc", marginBottom: "12px" }}>
            3. How We Use Information
          </h2>
          <p style={{ lineHeight: "1.6", fontSize: "14px", marginBottom: "12px" }}>
            We process communication and customer data strictly for legitimate operational purposes:
          </p>
          <ul style={{ paddingLeft: "20px", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
            <li>Delivering operational alerts, order status updates, and customer support responses.</li>
            <li>Routing incoming inquiries to authorized staff members and linking chats to customer accounts.</li>
            <li>Maintaining audit logs and service delivery compliance.</li>
            <li>We do not sell, rent, or trade your personal information to third parties or data brokers.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "18px", color: "#f0f6fc", marginBottom: "12px" }}>
            4. Third-Party Services (Meta WhatsApp Cloud API)
          </h2>
          <p style={{ lineHeight: "1.6", fontSize: "14px", margin: 0 }}>
            Our messaging features utilize Meta Platforms, Inc. (&quot;Meta&quot;) and the WhatsApp Cloud API.
            Messages sent or received are processed in compliance with Meta&apos;s Business Terms and WhatsApp
            Business Policy. Data transferred through Meta infrastructure is encrypted in transit.
          </p>
        </section>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "18px", color: "#f0f6fc", marginBottom: "12px" }}>
            5. Data Retention &amp; Security
          </h2>
          <p style={{ lineHeight: "1.6", fontSize: "14px", margin: 0 }}>
            Communication logs are stored securely using industry-standard encrypted databases.
            We retain message histories for the duration of the active customer relationship or as required
            by applicable tax and statutory accounting regulations.
          </p>
        </section>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "18px", color: "#f0f6fc", marginBottom: "12px" }}>
            6. Your Rights &amp; Opt-Out
          </h2>
          <p style={{ lineHeight: "1.6", fontSize: "14px", margin: 0 }}>
            Recipients can opt out of automated WhatsApp communications at any time by replying
            &quot;STOP&quot; or by contacting the business directly. You may also request deletion or review
            of your contact records by contacting our data protection officer.
          </p>
        </section>

        <section style={{ borderTop: "1px solid #30363d", paddingTop: "24px", marginTop: "32px" }}>
          <h2 style={{ fontSize: "18px", color: "#f0f6fc", marginBottom: "12px" }}>
            7. Contact Information
          </h2>
          <p style={{ lineHeight: "1.6", fontSize: "14px", margin: 0 }}>
            If you have questions regarding this Privacy Policy or our messaging practices, please contact us at:
            <br />
            <strong>Email:</strong> support@kalkibos.com
            <br />
            <strong>Platform:</strong> Kalki Business Operating System
          </p>
        </section>
      </div>
    </div>
  );
}
