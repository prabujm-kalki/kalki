"use client";

import { useState } from "react";
import { Save, Check, Loader2, RefreshCw } from "lucide-react";
import { QuotationSettingsConfig, updateQuotationSettings } from "./actions";

interface Props {
  orgId: string;
  initialSettings: QuotationSettingsConfig;
}

export function QuotationSettingsClient({ orgId, initialSettings }: Props) {
  const [settings, setSettings] = useState<QuotationSettingsConfig>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    const res = await updateQuotationSettings(orgId, settings);
    setSaving(false);

    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      setError(res.error || "Failed to save quotation settings.");
    }
  };

  const resetToStandard = () => {
    setSettings({
      defaultValidityDays: 15,
      defaultPaymentTerms: "Payment within 15 days of invoice",
      defaultNotes: "Thank you for your business inquiry!",
      defaultTermsAndConditions:
        "1. Goods once sold will be accepted under warranty policy.\n2. Rates quoted are valid until the validity date specified.\n3. Taxes as applicable at time of invoicing.",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {savedSuccess && (
        <div
          style={{
            backgroundColor: "#dcfce7",
            border: "1px solid #86efac",
            color: "#166534",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Check size={18} />
          <span>Quotation settings saved successfully! New quotations will automatically default to these terms.</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13.5px",
          }}
        >
          {error}
        </div>
      )}

      {/* Main Settings Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
          Default Commercial Quotation Presets
        </h2>

        {/* Validity & Payment Terms */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
              Default Validity Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.defaultValidityDays}
              onChange={(e) => setSettings({ ...settings, defaultValidityDays: Number(e.target.value) })}
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
            <p style={{ margin: "4px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
              Auto-sets the "Valid Until" date when creating a quotation.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
              Default Payment Terms
            </label>
            <input
              type="text"
              value={settings.defaultPaymentTerms}
              onChange={(e) => setSettings({ ...settings, defaultPaymentTerms: e.target.value })}
              required
              placeholder="e.g. 50% Advance, Balance on delivery"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
            <p style={{ margin: "4px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
              Payment milestone defaults for new proposals.
            </p>
          </div>
        </div>

        {/* Default Quotation Notes */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
            Default Quotation Notes
          </label>
          <textarea
            rows={3}
            value={settings.defaultNotes}
            onChange={(e) => setSettings({ ...settings, defaultNotes: e.target.value })}
            placeholder="Greeting or notes to display at bottom of quotation..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              resize: "vertical",
            }}
          />
          <p style={{ margin: "4px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
            This note is automatically prefilled when starting a new quotation or proforma invoice.
          </p>
        </div>

        {/* Default Terms & Conditions */}
        <div>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
            Default Terms & Conditions
          </label>
          <textarea
            rows={5}
            value={settings.defaultTermsAndConditions}
            onChange={(e) => setSettings({ ...settings, defaultTermsAndConditions: e.target.value })}
            placeholder="Standard contractual terms, warranty clauses, tax notes..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <p style={{ margin: "4px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
            These terms will be displayed on client quotation sheets and public PDF links.
          </p>
        </div>

        {/* WhatsApp & Document Dispatch Policy */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
            Quotation Dispatch & WhatsApp Mode
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
            {[
              {
                id: "NO_WHATSAPP",
                title: "No WhatsApp (Direct Save & Print / PDF)",
                desc: "Hides WhatsApp buttons. Uses industry standard Save & Print / Save PDF flow.",
              },
              {
                id: "WEB_LINK_POPUP",
                title: "WhatsApp Web / Pop-up Link",
                desc: "Prompts with interactive WhatsApp pop-up and customer direct link after saving.",
              },
              {
                id: "API_AUTOMATED",
                title: "Meta Cloud API (Automated)",
                desc: "Silently dispatches quotation via Meta official WhatsApp Business API.",
              },
            ].map((mode) => {
              const isSelected = (settings.whatsappDispatchMode || "WEB_LINK_POPUP") === mode.id;
              return (
                <div
                  key={mode.id}
                  onClick={() => setSettings({ ...settings, whatsappDispatchMode: mode.id as any })}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <input
                      type="radio"
                      name="quoteWhatsappDispatchMode"
                      checked={isSelected}
                      onChange={() => setSettings({ ...settings, whatsappDispatchMode: mode.id as any })}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>
                      {mode.title}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.35 }}>
                    {mode.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={resetToStandard}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#64748b",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          Reset to Factory Defaults
        </button>

        <button
          type="submit"
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 24px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(37, 99, 235, 0.25)",
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          Save Quotation Settings
        </button>
      </div>
    </form>
  );
}

