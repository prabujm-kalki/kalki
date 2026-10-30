"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Check, Save, Tag, DollarSign, Layers, AlertCircle } from "lucide-react";
import {
  getPricingTierSettings,
  updatePricingTierSettings,
} from "@/app/settings/master-data/pricing-actions";
import {
  PricingTierSettingsConfig,
  DEFAULT_PRICING_CONFIG,
} from "@/app/settings/master-data/pricing-types";
import { KalkiButton } from "@/components/ui/KalkiButton";

export function PricingTiersDashboard({ orgId }: { orgId: string }) {
  const [settings, setSettings] = useState<PricingTierSettingsConfig>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchConfig() {
      if (!orgId) return;
      try {
        setLoading(true);
        const data = await getPricingTierSettings(orgId);
        setSettings(data);
      } catch (err) {
        console.error("Failed loading pricing tier settings", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [orgId]);

  const handleSave = () => {
    setError(null);
    setSavedSuccess(false);

    startTransition(async () => {
      const res = await updatePricingTierSettings(orgId, settings);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to save pricing settings");
      }
    });
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        Loading pricing tier settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "880px" }}>
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
          <span>Pricing tier settings saved successfully! Changes apply to Purchasing & Sales.</span>
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
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div
            style={{
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Tag size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Master Multi-Tier Pricing Architecture
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
              Configure trade pricing levels for your entire product catalog, purchase orders, and sales quotes.
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div
          style={{
            padding: "16px",
            backgroundColor: settings.multiPricingEnabled ? "#f0fdf4" : "#f8fafc",
            borderRadius: "8px",
            border: `1px solid ${settings.multiPricingEnabled ? "#bbf7d0" : "#e2e8f0"}`,
            marginBottom: "20px",
            transition: "all 0.2s ease",
          }}
        >
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(settings.multiPricingEnabled)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  multiPricingEnabled: e.target.checked,
                })
              }
              style={{ width: "18px", height: "18px", marginTop: "2px", cursor: "pointer" }}
            />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                Enable Multi-Tier Pricing across Organization
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                When enabled, 4 custom pricing tiers will be active. Staff can update tier selling rates during purchase inward entry, and sales billing can select an active tier in 1 click.
              </p>
            </div>
          </label>
        </div>

        {/* Tier Customization Box */}
        {settings.multiPricingEnabled && (
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "14px" }}>
              Custom Tier Labels (4 Trade Levels)
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Tier 1 (Retail / Base)
                </label>
                <input
                  type="text"
                  value={settings.pricingTiers?.tier1 || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricingTiers: {
                        ...settings.pricingTiers,
                        tier1: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Customer / Retail"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Tier 2 (Wholesale)
                </label>
                <input
                  type="text"
                  value={settings.pricingTiers?.tier2 || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricingTiers: {
                        ...settings.pricingTiers,
                        tier2: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Wholesale Supplies"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Tier 3 (Dealers)
                </label>
                <input
                  type="text"
                  value={settings.pricingTiers?.tier3 || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricingTiers: {
                        ...settings.pricingTiers,
                        tier3: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Dealers"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Tier 4 (Special / Custom)
                </label>
                <input
                  type="text"
                  value={settings.pricingTiers?.tier4 || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pricingTiers: {
                        ...settings.pricingTiers,
                        tier4: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Special / Institutional"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>
            </div>

            {/* Default Active Tier */}
            <div style={{ marginTop: "18px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Default Pricing Tier for New Invoices & Quotations
              </label>
              <select
                value={settings.defaultPricingTier || "tier1"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultPricingTier: e.target.value as any,
                  })
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  backgroundColor: "#ffffff",
                  maxWidth: "320px",
                  width: "100%",
                }}
              >
                <option value="tier1">{settings.pricingTiers?.tier1 || "Tier 1"} (Tier 1)</option>
                <option value="tier2">{settings.pricingTiers?.tier2 || "Tier 2"} (Tier 2)</option>
                <option value="tier3">{settings.pricingTiers?.tier3 || "Tier 3"} (Tier 3)</option>
                <option value="tier4">{settings.pricingTiers?.tier4 || "Tier 4"} (Tier 4)</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <KalkiButton
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Save size={16} />
            {isPending ? "Saving..." : "Save Pricing Tier Settings"}
          </KalkiButton>
        </div>
      </div>
    </div>
  );
}
