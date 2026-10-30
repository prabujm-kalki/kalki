"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { buildPoWhatsappMessage, formatIndianCurrency, openWhatsAppUrl, resolveWhatsappPreferences } from "@/lib/whatsapp-po";
import { MessageSquare, Check, X } from "lucide-react";

interface VendorItem {
  id: string;
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  minimumStock: number;
  normalQuantity: number;
  lastRate: number;
  baseMinStock?: number;
  targetStock?: number;
  prepUnit?: string | null;
  prepUnitConversion?: string | number | null;
  roundToWhole?: boolean;
  fridaySurge?: string | number | null;
  saturdaySurge?: string | number | null;
}

export default function StockAssessmentPage() {
  const { selected } = useSessionView();
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const urlVendorId = searchParams.get("vendorId");

  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState(urlVendorId || "");
  const [vendorItems, setVendorItems] = useState<VendorItem[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [prepInputs, setPrepInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (urlVendorId) {
      setSelectedVendorId(urlVendorId);
    }
  }, [urlVendorId]);

  const urlOrgId = searchParams.get("organizationId");
  const urlLocId = searchParams.get("locationId");

  useEffect(() => {
    if (selected || urlOrgId) {
      fetchVendors();
    }
  }, [selected, urlOrgId, urlLocId]);

  useEffect(() => {
    if (selectedVendorId && (selected || urlOrgId)) {
      fetchVendorItems(selectedVendorId);
    } else if (!selectedVendorId) {
      setVendorItems([]);
    }
  }, [selectedVendorId, selected, urlOrgId, urlLocId]);

  const getOrgAndLoc = () => {
    const org = searchParams.get("organizationId") || selected?.organizationId || "";
    const loc = searchParams.get("locationId") || selected?.locationId || "";
    return { org, loc };
  };

  const fetchVendors = async () => {
    const { org, loc } = getOrgAndLoc();
    if (!org) return;
    try {
      const res = await fetch(`/api/vendors?organizationId=${org}&locationId=${loc}`);
      if (!res.ok) throw new Error("Failed to load vendors");
      const data = await res.json();
      setVendors(data.items || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchVendorItems = async (vendorId: string) => {
    const { org, loc } = getOrgAndLoc();
    if (!org) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor-items?organizationId=${org}&locationId=${loc}&vendorId=${vendorId}`);
      if (!res.ok) throw new Error("Failed to load items");
      const data = await res.json();
      const itemsList = data.items || [];
      setVendorItems(itemsList);
      // Initialize inputs
      const initInputs: Record<string, string> = {};
      const initPrep: Record<string, string> = {};
      itemsList.forEach((i: VendorItem) => {
        initInputs[i.itemId] = "";
        initPrep[i.itemId] = "";
      });
      setStockInputs(initInputs);
      setPrepInputs(initPrep);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (itemId: string, value: string) => {
    setStockInputs(prev => ({ ...prev, [itemId]: value }));
  };

  const handlePrepChange = (itemId: string, value: string) => {
    setPrepInputs(prev => ({ ...prev, [itemId]: value }));
  };

  // Helper to calculate total equivalent stock in base unit
  const computeTotalStock = (item: VendorItem): { total: number; hasEntered: boolean } => {
    const rawStr = stockInputs[item.itemId] ?? "";
    const prepStr = prepInputs[item.itemId] ?? "";
    const hasRaw = rawStr !== "";
    const hasPrep = prepStr !== "";

    if (!hasRaw && !hasPrep) {
      return { total: 0, hasEntered: false };
    }

    const rawVal = parseFloat(rawStr) || 0;
    const prepVal = parseFloat(prepStr) || 0;
    const prepRatio = Number(item.prepUnitConversion) || 0;

    const total = rawVal + (prepVal * prepRatio);
    return { total: Number(total.toFixed(3)), hasEntered: true };
  };

  const [whatsAppModal, setWhatsAppModal] = useState<{
    poNumber: string;
    totalAmount: number | string | null;
    vendorName: string;
    vendorPhone: string;
    whatsappUrl: string;
    poId: string;
  } | null>(null);

  const getDashboardUrl = () => {
    const org = searchParams.get("organizationId") || selected?.organizationId;
    const loc = searchParams.get("locationId") || selected?.locationId;
    const params = new URLSearchParams();
    if (org) params.set("organizationId", org);
    if (loc && loc !== "ALL") params.set("locationId", loc);
    const qs = params.toString();
    return `/purchasing/dashboard${qs ? `?${qs}` : ""}`;
  };

  const handleCloseWhatsAppModal = () => {
    setWhatsAppModal(null);
    router.push(getDashboardUrl());
  };

  const handleConfirmSendWhatsApp = async () => {
    if (!whatsAppModal) return;
    try {
      await fetch(`/api/purchase-orders/${whatsAppModal.poId}/mark-sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("Failed to mark as sent", e);
    }
    openWhatsAppUrl(whatsAppModal.whatsappUrl);
    setWhatsAppModal(null);
    router.push(getDashboardUrl());
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    
    // Prepare payload (accounting for both raw and prep units)
    const inputs = vendorItems
      .map(item => {
        const { total, hasEntered } = computeTotalStock(item);
        if (!hasEntered) return null;
        return {
          itemId: item.itemId,
          currentStock: total
        };
      })
      .filter((entry): entry is { itemId: string; currentStock: number } => entry !== null);

    if (inputs.length === 0) {
      setError("Please enter current stock for at least one item.");
      setSubmitting(false);
      return;
    }

    try {
      const activeOrgId = searchParams.get("organizationId") || selected?.organizationId;
      const activeLocId = searchParams.get("locationId") || selected?.locationId;

      const res = await fetch("/api/purchasing/stock-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendorId,
          organizationId: activeOrgId,
          locationId: activeLocId,
          stockInputs: inputs,
          taskId: taskId
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit stock assessment");
      }

      const result = await res.json();
      if (result.created && result.purchaseOrder) {
        const createdPo = result.purchaseOrder;
        const currentVendor = result.vendor;
        const vendorPhoneRaw = currentVendor?.contactDetails?.phone || currentVendor?.contactDetails?.whatsapp || currentVendor?.contactDetails?.mobile || "";
        const phoneDigits = vendorPhoneRaw.replace(/\D/g, "");

        const isApprovedOrSent = createdPo.status === "approved" || createdPo.status === "sent_to_vendor";
        const resolvedPolicy = resolveWhatsappPreferences({
          orgDispatchMode: result.whatsappDispatchMode,
          orgContentFormat: result.whatsappContentFormat,
          vendorPreference: currentVendor?.poWhatsappPreference,
          vendorDeliveryMethod: currentVendor?.poDeliveryMethod,
        });

        if (isApprovedOrSent && !resolvedPolicy.isGloballyDisabled && phoneDigits && createdPo?.publicToken) {
          const poNumber = createdPo.poNumber || `PO-${createdPo.id.slice(0, 8).toUpperCase()}`;

          if (resolvedPolicy.dispatchMode === "API_AUTOMATED") {
            // Direct Background Meta API dispatch
            fetch(`/api/purchase-orders/${createdPo.id}/send-whatsapp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            })
              .then(r => r.json())
              .then(apiRes => {
                if (apiRes.success) {
                  console.log(`[WhatsApp Automation] Dispatched PO #${poNumber} via Meta API`);
                } else {
                  console.warn(`[WhatsApp Automation] API dispatch issue:`, apiRes.error);
                }
              })
              .catch(err => console.error("[WhatsApp Automation] Network error:", err));

            router.push(getDashboardUrl());
          } else if (resolvedPolicy.dispatchMode === "WEB_LINK_POPUP") {
            const { whatsappUrl } = buildPoWhatsappMessage({
              poNumber,
              totalAmount: createdPo.totalAmount,
              publicToken: createdPo.publicToken,
              lines: result.lines || null,
              vendorPhone: phoneDigits,
              poWhatsappPreference: resolvedPolicy.contentFormat,
              whatsappPoTemplate: result.whatsappPoTemplate || null
            });

            // Show Kalki BOS styled modal instead of browser window.confirm
            setWhatsAppModal({
              poNumber,
              totalAmount: createdPo.totalAmount,
              vendorName: currentVendor?.name || "the vendor",
              vendorPhone: vendorPhoneRaw || "Vendor",
              whatsappUrl,
              poId: createdPo.id,
            });
          } else {
            router.push(getDashboardUrl());
          }
        } else {
          router.push(getDashboardUrl());
        }
      } else {
        alert(result.message || "Stock assessment completed. All items are currently above reorder levels, so no purchase order was required.");
        router.push(getDashboardUrl());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Daily Stock Assessment</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Enter the current available stock for items. The system will automatically generate Purchase Orders for items that have reached their reorder levels.
        </p>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>Vendor</label>
          {urlVendorId ? (
            <div style={{ 
              padding: "10px 14px", 
              borderRadius: "6px", 
              border: "1px solid var(--border-color)", 
              backgroundColor: "#f8fafc", 
              color: "#0f172a", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span>{vendors.find(v => v.id === selectedVendorId)?.name || "Bhavanitha Broilers"}</span>
              <span style={{ fontSize: "0.75rem", backgroundColor: "#e2e8f0", color: "#475569", padding: "2px 8px", borderRadius: "12px", fontWeight: 500 }}>
                Assigned Task
              </span>
            </div>
          ) : (
            <select 
              value={selectedVendorId} 
              onChange={(e) => setSelectedVendorId(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}
            >
              <option value="">-- Choose a vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p>Loading items...</p>
        ) : vendorItems.length > 0 ? (
          <div style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
            <table className="desktop-only" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border-color)" }}>
                <tr>
                  <th style={{ padding: "12px", textAlign: "left" }}>Item Name</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>UoM</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Reorder Level (Min)</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Target Stock</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Current Available Stock</th>
                </tr>
              </thead>
              <tbody>
                {vendorItems.map((item, idx) => {
                  const hasPrep = Boolean(item.prepUnit && item.prepUnitConversion && Number(item.prepUnitConversion) > 0);
                  const { total, hasEntered } = computeTotalStock(item);
                  const dayOfWeek = new Date().getDay();
                  const activeSurgePct = dayOfWeek === 5 ? Number(item.fridaySurge || 0) : dayOfWeek === 6 ? Number(item.saturdaySurge || 0) : 0;
                  const surgeMult = activeSurgePct > 0 ? 1 + (activeSurgePct / 100) : 1;
                  const baseMin = Number(item.minimumStock || item.baseMinStock || 0);
                  const min = Number((baseMin * surgeMult).toFixed(2));
                  const baseTarget = Number(item.normalQuantity || item.targetStock || 0);
                  const effectiveTarget = Number((baseTarget * surgeMult).toFixed(2));
                  const isUnder = hasEntered && total < min;

                  return (
                    <tr key={item.id} style={{ borderBottom: idx === vendorItems.length - 1 ? "none" : "1px solid var(--border-color)", backgroundColor: isUnder ? "#fff1f2" : undefined }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 600, color: "var(--kalki-text-primary)" }}>{item.itemName}</div>
                        {activeSurgePct > 0 && (
                          <div style={{ marginTop: "2px" }}>
                            <span style={{ fontSize: "10px", backgroundColor: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                              ⚡ +{activeSurgePct}% {dayOfWeek === 5 ? 'Fri' : 'Sat'} Surge Active
                            </span>
                          </div>
                        )}
                        {hasPrep && (
                          <div style={{ fontSize: "11px", color: "#0284c7", marginTop: "2px" }}>
                            1 {item.prepUnit} = {item.prepUnitConversion} {item.unitOfMeasure}
                          </div>
                        )}
                        {item.roundToWhole && (
                          <div style={{ fontSize: "10px", color: "#7c3aed", fontWeight: 600, marginTop: "2px" }}>
                            ⚡ Rounds up to full {item.unitOfMeasure}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div>{item.unitOfMeasure}</div>
                        {item.roundToWhole && (
                          <span style={{ fontSize: "10px", background: "#f3e8ff", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>Whole Only</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", color: activeSurgePct > 0 ? "#b45309" : "var(--text-muted)", fontWeight: activeSurgePct > 0 ? 600 : "normal" }}>
                        {min}
                        {activeSurgePct > 0 && <div style={{ fontSize: "10px", color: "#94a3b8" }}>(Base {baseMin})</div>}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", color: activeSurgePct > 0 ? "#b45309" : "var(--text-muted)", fontWeight: activeSurgePct > 0 ? 600 : "normal" }}>
                        {effectiveTarget}
                        {activeSurgePct > 0 && <div style={{ fontSize: "10px", color: "#94a3b8" }}>(Base {baseTarget})</div>}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {hasPrep ? (
                          <div style={{ display: "inline-flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={stockInputs[item.itemId] || ""}
                                  onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                                  placeholder="0"
                                  style={{ width: "85px", padding: "6px 8px", borderRadius: "4px", border: "1px solid var(--border-color)", textAlign: "center", fontSize: "13px" }}
                                />
                                <span style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Raw ({item.unitOfMeasure})</span>
                              </div>
                              <span style={{ fontWeight: 700, color: "#94a3b8" }}>+</span>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <input 
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={prepInputs[item.itemId] || ""}
                                  onChange={(e) => handlePrepChange(item.itemId, e.target.value)}
                                  placeholder="0"
                                  style={{ width: "85px", padding: "6px 8px", borderRadius: "4px", border: "1px solid #38bdf8", backgroundColor: "#f0f9ff", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#0369a1" }}
                                />
                                <span style={{ fontSize: "10px", color: "#0369a1", marginTop: "2px" }}>Prepped ({item.prepUnit})</span>
                              </div>
                            </div>
                            {hasEntered && (
                              <div style={{ fontSize: "11px", fontWeight: 700, color: isUnder ? "#dc2626" : "#15803d", backgroundColor: isUnder ? "#fee2e2" : "#f0fdf4", padding: "2px 8px", borderRadius: "12px", border: `1px solid ${isUnder ? "#fca5a5" : "#bbf7d0"}` }}>
                                Total: {total} {item.unitOfMeasure}
                              </div>
                            )}
                          </div>
                        ) : (
                          <input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={stockInputs[item.itemId] || ""}
                            onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                            placeholder="Qty"
                            style={{ width: "120px", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", textAlign: "center" }}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card View (<= 768px) */}
            <div className="mobile-only" style={{ padding: "12px" }}>
              {vendorItems.map((item) => {
                const hasPrep = Boolean(item.prepUnit && item.prepUnitConversion && Number(item.prepUnitConversion) > 0);
                const { total, hasEntered } = computeTotalStock(item);
                const rawVal = parseFloat(stockInputs[item.itemId] || "0") || 0;
                const dayOfWeek = new Date().getDay();
                const activeSurgePct = dayOfWeek === 5 ? Number(item.fridaySurge || 0) : dayOfWeek === 6 ? Number(item.saturdaySurge || 0) : 0;
                const surgeMult = activeSurgePct > 0 ? 1 + (activeSurgePct / 100) : 1;
                const baseMin = Number(item.minimumStock || item.baseMinStock || 0);
                const min = Number((baseMin * surgeMult).toFixed(2));
                const baseTarget = Number(item.normalQuantity || item.targetStock || 0);
                const target = Number((baseTarget * surgeMult).toFixed(2));
                const isUnderStock = hasEntered && total < min;

                return (
                  <div
                    key={item.id}
                    className="kalki-mobile-card"
                    style={{
                      borderLeft: isUnderStock ? "4px solid #ef4444" : "4px solid #3b82f6",
                      marginBottom: "10px",
                      backgroundColor: isUnderStock ? "#fff5f5" : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>{item.itemName}</div>
                        {activeSurgePct > 0 && (
                          <div style={{ marginTop: "2px" }}>
                            <span style={{ fontSize: "10px", backgroundColor: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                              ⚡ +{activeSurgePct}% {dayOfWeek === 5 ? 'Fri' : 'Sat'} Surge
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          Unit: {item.unitOfMeasure}
                          {hasPrep && ` • 1 ${item.prepUnit} = ${item.prepUnitConversion} ${item.unitOfMeasure}`}
                          {item.roundToWhole && ` • Full ${item.unitOfMeasure} only`}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: isUnderStock ? "#fee2e2" : "#f1f5f9",
                          color: isUnderStock ? "#b91c1c" : "#475569",
                        }}
                      >
                        {isUnderStock ? "Reorder Triggered" : "Active"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", marginBottom: "10px" }}>
                      <div>
                        <span style={{ color: "#64748b" }}>Min Reorder: </span>
                        <strong>{min}</strong> {activeSurgePct > 0 && <span style={{ fontSize: '10px', color: '#94a3b8' }}>(Base {baseMin})</span>}
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Target Stock: </span>
                        <strong>{target}</strong> {activeSurgePct > 0 && <span style={{ fontSize: '10px', color: '#94a3b8' }}>(Base {baseTarget})</span>}
                      </div>
                    </div>

                    {hasPrep ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Raw Meat ({item.unitOfMeasure}):</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={stockInputs[item.itemId] || ""}
                            onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                            placeholder="0"
                            style={{
                              width: "90px",
                              height: "32px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--border-color)",
                              textAlign: "center",
                              fontSize: "13px",
                              fontWeight: 700,
                              backgroundColor: "#ffffff",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1" }}>Prepped / Half-boiled ({item.prepUnit}):</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={prepInputs[item.itemId] || ""}
                            onChange={(e) => handlePrepChange(item.itemId, e.target.value)}
                            placeholder="0"
                            style={{
                              width: "90px",
                              height: "32px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid #38bdf8",
                              textAlign: "center",
                              fontSize: "13px",
                              fontWeight: 700,
                              backgroundColor: "#f0f9ff",
                              color: "#0369a1",
                            }}
                          />
                        </div>
                        {hasEntered && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px dashed #cbd5e1" }}>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>Total Equivalent Stock:</span>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: isUnderStock ? "#dc2626" : "#15803d" }}>
                              {total} {item.unitOfMeasure}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Counted Stock:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, rawVal - 1);
                              handleStockChange(item.itemId, next.toString());
                            }}
                            style={{
                              width: "32px",
                              height: "32px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              borderRadius: "6px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={stockInputs[item.itemId] || ""}
                            onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                            placeholder="0"
                            style={{
                              width: "70px",
                              height: "32px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--border-color)",
                              textAlign: "center",
                              fontSize: "14px",
                              fontWeight: 700,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = rawVal + 1;
                              handleStockChange(item.itemId, next.toString());
                            }}
                            style={{
                              width: "32px",
                              height: "32px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              borderRadius: "6px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div style={{ padding: "16px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "10px 24px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: 500
                }}
              >
                {submitting ? "Processing..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        ) : selectedVendorId ? (
          <p>No items configured for this vendor. Please configure items first.</p>
        ) : null}

        {/* Kalki BOS Styled WhatsApp Dispatch Modal */}
        {whatsAppModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "460px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "18px 20px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "#ecfdf5",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                      Send PO via WhatsApp
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      Purchase Order #{whatsAppModal.poNumber} created
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseWhatsAppModal}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "20px" }}>
                <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
                  The purchase order has been generated successfully. Would you like to dispatch it to the supplier now?
                </p>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Supplier:</span>
                    <strong style={{ color: "#0f172a" }}>{whatsAppModal.vendorName}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Contact:</span>
                    <span style={{ color: "#0f172a", fontFamily: "monospace" }}>{whatsAppModal.vendorPhone}</span>
                  </div>
                  {whatsAppModal.totalAmount ? (
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: "6px" }}>
                      <span style={{ color: "#64748b" }}>Est. Total:</span>
                      <strong style={{ color: "#16a34a" }}>{formatIndianCurrency(whatsAppModal.totalAmount)}</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  padding: "14px 20px",
                  backgroundColor: "#f8fafc",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseWhatsAppModal}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSendWhatsApp}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <Check size={16} />
                  Send via WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
