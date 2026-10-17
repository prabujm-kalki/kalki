"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Settings2, 
  Save, 
  Check, 
  Search, 
  Layers 
} from "lucide-react";
import { updateBranchPurchasePolicy, updateItemSpotPurchaseConfig } from "@/app/purchasing/actions";

interface PolicyData {
  id: string;
  organizationId: string;
  locationId: string;
  maxSpotPurchaseTransactionLimit: string | number;
  maxDailySpotPurchaseTotal: string | number;
  maxItemDailyFrequency: number;
  requirePhotoEvidence: boolean;
  slaHours?: number;
  reviewRoleId?: string | null;
  escalationRoleId?: string | null;
  autoEscalateToOwner?: boolean;
}

interface ItemConfig {
  id: string;
  nameEn: string;
  nameTa: string;
  unit: string;
  currentPrice: string | number;
  allowSpotPurchase: boolean;
  spotPurchasePriceLimit: string | number | null;
  isInventoryTracked: boolean;
}

interface LocationOption {
  id: string;
  name: string;
  organizationId: string;
}

interface RoleOption {
  id: string;
  name: string;
  identifier: string;
}

export function PurchasingSettingsClient({
  organizationId,
  locationId,
  locations,
  initialPolicy,
  initialItems,
  roles = [],
}: {
  organizationId: string;
  locationId: string;
  locations: LocationOption[];
  initialPolicy: PolicyData;
  initialItems: ItemConfig[];
  roles?: RoleOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Branch Policy Form State
  const [txLimit, setTxLimit] = useState(parseFloat(initialPolicy.maxSpotPurchaseTransactionLimit.toString()) || 2000);
  const [dailyLimit, setDailyLimit] = useState(parseFloat(initialPolicy.maxDailySpotPurchaseTotal.toString()) || 5000);
  const [dailyFreq, setDailyFreq] = useState(initialPolicy.maxItemDailyFrequency || 3);
  const [requirePhoto, setRequirePhoto] = useState(initialPolicy.requirePhotoEvidence ?? true);
  const [slaHours, setSlaHours] = useState<number>(initialPolicy.slaHours ?? 4);
  const [reviewRoleId, setReviewRoleId] = useState<string>(initialPolicy.reviewRoleId || "");
  const [escalationRoleId, setEscalationRoleId] = useState<string>(initialPolicy.escalationRoleId || "");
  const [autoEscalateToOwner, setAutoEscalateToOwner] = useState<boolean>(initialPolicy.autoEscalateToOwner ?? true);
  const [policySaved, setPolicySaved] = useState(false);

  // Items Toggle Matrix State
  const [itemsList, setItemsList] = useState<ItemConfig[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const handleLocationChange = (newLocId: string) => {
    router.push(`/settings/purchasing?organizationId=${organizationId}&locationId=${newLocId}`);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await updateBranchPurchasePolicy(organizationId, locationId, {
        maxSpotPurchaseTransactionLimit: txLimit,
        maxDailySpotPurchaseTotal: dailyLimit,
        maxItemDailyFrequency: dailyFreq,
        requirePhotoEvidence: requirePhoto,
        slaHours: Number(slaHours) || 4,
        reviewRoleId: reviewRoleId || null,
        escalationRoleId: escalationRoleId || null,
        autoEscalateToOwner: autoEscalateToOwner,
      });
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
    });
  };

  const handleToggleSpotPurchase = async (item: ItemConfig) => {
    const nextAllowed = !item.allowSpotPurchase;
    setSavingItemId(item.id);
    
    // Default limit = 1.5x current price or standard 500 if unset
    const nextLimit = item.spotPurchasePriceLimit 
      ? parseFloat(item.spotPurchasePriceLimit.toString()) 
      : (parseFloat(item.currentPrice.toString()) > 0 ? parseFloat(item.currentPrice.toString()) * 1.5 : 500);

    try {
      await updateItemSpotPurchaseConfig(item.id, organizationId, {
        allowSpotPurchase: nextAllowed,
        spotPurchasePriceLimit: nextAllowed ? nextLimit : null,
        isInventoryTracked: item.isInventoryTracked,
      });

      setItemsList(prev => prev.map(i => i.id === item.id ? {
        ...i,
        allowSpotPurchase: nextAllowed,
        spotPurchasePriceLimit: nextAllowed ? nextLimit : null,
      } : i));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleUpdateItemLimit = async (itemId: string, newLimit: number) => {
    const item = itemsList.find(i => i.id === itemId);
    if (!item) return;
    setSavingItemId(itemId);
    try {
      await updateItemSpotPurchaseConfig(itemId, organizationId, {
        allowSpotPurchase: item.allowSpotPurchase,
        spotPurchasePriceLimit: newLimit,
        isInventoryTracked: item.isInventoryTracked,
      });

      setItemsList(prev => prev.map(i => i.id === itemId ? {
        ...i,
        spotPurchasePriceLimit: newLimit,
      } : i));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleToggleInventoryTracked = async (item: ItemConfig) => {
    const nextTracked = !item.isInventoryTracked;
    setSavingItemId(item.id);
    try {
      await updateItemSpotPurchaseConfig(item.id, organizationId, {
        allowSpotPurchase: item.allowSpotPurchase,
        spotPurchasePriceLimit: item.spotPurchasePriceLimit ? parseFloat(item.spotPurchasePriceLimit.toString()) : null,
        isInventoryTracked: nextTracked,
      });

      setItemsList(prev => prev.map(i => i.id === item.id ? {
        ...i,
        isInventoryTracked: nextTracked,
      } : i));
    } finally {
      setSavingItemId(null);
    }
  };

  const filteredItems = itemsList.filter(item => 
    item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nameTa && item.nameTa.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Branch Selector Bar */}
      <div className="card" style={{ padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-color)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Settings2 size={18} style={{ color: "var(--accent-color)" }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Active Branch Policy:</span>
          <select 
            value={locationId} 
            onChange={(e) => handleLocationChange(e.target.value)}
            style={{ 
              padding: "0.4rem 0.85rem", 
              borderRadius: "6px", 
              border: "1px solid var(--border-color)", 
              fontSize: "0.85rem",
              fontWeight: 500,
              background: "var(--background-color)",
              color: "var(--text-color)"
            }}
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <ShieldCheck size={16} style={{ color: "#10b981" }} />
          <span>Multi-tenant Isolation Enforced</span>
        </div>
      </div>

      {/* Ex-Ante Policy Limits Card */}
      <div className="card" style={{ padding: "1.25rem", background: "var(--surface-color)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} style={{ color: "#3b82f6" }} />
              Branch Ex-Ante Guardrails & Spending Caps
            </h3>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Automated financial controls that block cashiers and staff from submitting rogue or excessive spot purchases.
            </p>
          </div>
          {policySaved && (
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
              <Check size={16} /> Saved Successfully
            </span>
          )}
        </div>

        <form onSubmit={handleSavePolicy}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            {/* Max Transaction Limit */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Max Per-Transaction Limit (₹)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={txLimit}
                  onChange={(e) => setTxLimit(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.75rem 0.45rem 1.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.875rem",
                    background: "var(--background-color)",
                    color: "var(--text-color)"
                  }}
                  required
                />
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Hard ceiling for a single quick purchase voucher.</span>
            </div>

            {/* Max Daily Total */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Max Daily Cumulative Total (₹)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.75rem 0.45rem 1.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.875rem",
                    background: "var(--background-color)",
                    color: "var(--text-color)"
                  }}
                  required
                />
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Daily combined ceiling across all spot purchases.</span>
            </div>

            {/* Item Daily Frequency */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Max Daily Frequency per Item
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={dailyFreq}
                onChange={(e) => setDailyFreq(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.875rem",
                  background: "var(--background-color)",
                  color: "var(--text-color)"
                }}
                required
              />
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Limits repeated spot buys of the same SKU per day.</span>
            </div>

            {/* Require Photo Evidence */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Proof / Photo Evidence
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0", cursor: "pointer", fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={requirePhoto}
                  onChange={(e) => setRequirePhoto(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500 }}>Require receipt photo upload</span>
              </label>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Mandates cashier to snap vendor slip or weighment slip.</span>
            </div>

            {/* Designated Review Role Target */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Designated Reviewer / Audit Role
              </label>
              <select
                value={reviewRoleId}
                onChange={(e) => setReviewRoleId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.875rem",
                  background: "var(--background-color)",
                  color: "var(--text-color)"
                }}
              >
                <option value="">Default: Submitter's Reporting Manager</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.identifier})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Role authorized to audit and approve shift spot purchases (never the cashier themselves).</span>
            </div>

            {/* Audit SLA Timeout (Hours) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Manager Audit SLA (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={slaHours}
                onChange={(e) => setSlaHours(parseInt(e.target.value, 10) || 4)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.875rem",
                  background: "var(--background-color)",
                  color: "var(--text-color)"
                }}
                required
              />
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Time window for supervisor to clear shift-end spot purchases.</span>
            </div>

            {/* Escalation Role Target */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Escalation Target Role (When SLA Exceeds)
              </label>
              <select
                value={escalationRoleId}
                onChange={(e) => setEscalationRoleId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.875rem",
                  background: "var(--background-color)",
                  color: "var(--text-color)"
                }}
              >
                <option value="">Default: Next Reporting Supervisor</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.identifier})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Designated role or executive to receive audit task if supervisor misses SLA.</span>
            </div>

            {/* Auto-escalate to System Owner if Vacant */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                System Owner Fallback
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0", cursor: "pointer", fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={autoEscalateToOwner}
                  onChange={(e) => setAutoEscalateToOwner(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500 }}>Escalate to Owner if supervisor is vacant</span>
              </label>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Ensures zero unreviewed vouchers if no supervisor is currently assigned.</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                border: "none",
                background: "var(--primary-color, #2563eb)",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                opacity: isPending ? 0.7 : 1
              }}
            >
              <Save size={16} />
              {isPending ? "Saving..." : "Save Branch Policy"}
            </button>
          </div>
        </form>
      </div>

      {/* Item Eligibility Matrix */}
      <div className="card" style={{ padding: "1.25rem", background: "var(--surface-color)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={18} style={{ color: "#f59e0b" }} />
              Item Spot Purchase Matrix & SKU Caps
            </h3>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Toggle which items are eligible for local emergency spot procurement (e.g. Banana leaves, Fresh coriander, 20L Water Cans) and configure their price limit.
            </p>
          </div>

          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Filter items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "0.4rem 0.85rem 0.4rem 2rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                fontSize: "0.825rem",
                background: "var(--background-color)",
                color: "var(--text-color)",
                width: "220px"
              }}
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                <th style={{ padding: "0.65rem 0.85rem", fontWeight: 600 }}>Item Name</th>
                <th style={{ padding: "0.65rem 0.85rem", fontWeight: 600 }}>UOM</th>
                <th style={{ padding: "0.65rem 0.85rem", fontWeight: 600 }}>Current Price</th>
                <th style={{ padding: "0.65rem 0.85rem", fontWeight: 600 }}>Spot Purchase Eligible</th>
                <th style={{ padding: "0.65rem 0.85rem", fontWeight: 600 }}>Spot Price Limit (₹)</th>
                <th style={{ padding: "0.65rem 0.85rem", fontWeight: 600 }}>Track in Inventory</th>
                <th style={{ padding: "0.65rem 0.85rem", fontWeight: 600, textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const isSaving = savingItemId === item.id;
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)", opacity: isSaving ? 0.6 : 1 }}>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <div style={{ fontWeight: 600 }}>{item.nameEn}</div>
                      {item.nameTa && <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{item.nameTa}</div>}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-muted)" }}>{item.unit}</td>
                    <td style={{ padding: "0.65rem 0.85rem", fontWeight: 500 }}>
                      ₹{parseFloat(item.currentPrice.toString()).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", gap: "0.4rem" }}>
                        <input
                          type="checkbox"
                          checked={item.allowSpotPurchase}
                          onChange={() => handleToggleSpotPurchase(item)}
                          disabled={isSaving}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "0.8rem", color: item.allowSpotPurchase ? "#10b981" : "var(--text-muted)", fontWeight: 500 }}>
                          {item.allowSpotPurchase ? "Enabled ⚡" : "Disabled"}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      {item.allowSpotPurchase ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>₹</span>
                          <input
                            type="number"
                            step="10"
                            defaultValue={item.spotPurchasePriceLimit ? parseFloat(item.spotPurchasePriceLimit.toString()) : ""}
                            placeholder="No limit"
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val > 0) {
                                handleUpdateItemLimit(item.id, val);
                              }
                            }}
                            style={{
                              width: "110px",
                              padding: "0.3rem 0.5rem",
                              borderRadius: "4px",
                              border: "1px solid var(--border-color)",
                              fontSize: "0.8rem",
                              background: "var(--background-color)",
                              color: "var(--text-color)"
                            }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", gap: "0.4rem" }}>
                        <input
                          type="checkbox"
                          checked={item.isInventoryTracked}
                          onChange={() => handleToggleInventoryTracked(item)}
                          disabled={isSaving}
                          style={{ width: "15px", height: "15px", cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {item.isInventoryTracked ? "Yes (Auto stock increment)" : "No (Expense only)"}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", textAlign: "right" }}>
                      {item.allowSpotPurchase ? (
                        <span style={{ 
                          display: "inline-block", 
                          padding: "0.2rem 0.55rem", 
                          borderRadius: "999px", 
                          background: "rgba(16, 185, 129, 0.12)", 
                          color: "#10b981", 
                          fontSize: "0.725rem", 
                          fontWeight: 600 
                        }}>
                          Active
                        </span>
                      ) : (
                        <span style={{ 
                          display: "inline-block", 
                          padding: "0.2rem 0.55rem", 
                          borderRadius: "999px", 
                          background: "rgba(100, 116, 139, 0.12)", 
                          color: "#64748b", 
                          fontSize: "0.725rem" 
                        }}>
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
