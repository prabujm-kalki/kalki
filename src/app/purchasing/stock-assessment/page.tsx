"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { buildPoWhatsappMessage, formatIndianCurrency, openWhatsAppUrl, resolveWhatsappPreferences } from "@/lib/whatsapp-po";
import { MessageSquare, Check, X, AlertTriangle } from "lucide-react";

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
  const [assignedVendorName, setAssignedVendorName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mobileFilter, setMobileFilter] = useState<"ALL" | "REORDER" | "PENDING">("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

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
      const list = data.items || [];
      setVendors(list);
      if (urlVendorId) {
        const found = list.find((v: any) => v.id === urlVendorId);
        if (found) {
          setAssignedVendorName(found.name);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchVendorItems = async (vendorId: string) => {
    const { org, loc } = getOrgAndLoc();
    if (!org) return;
    setLoading(true);
    try {
      let res = await fetch(`/api/vendor-items?organizationId=${org}&locationId=${loc}&vendorId=${vendorId}`);
      let data = res.ok ? await res.json() : null;
      let itemsList = data?.items || [];

      // If no items returned for the current session/url location and an assigned vendorId exists,
      // fallback to querying without the strict location filter or inspect all vendor catalogs
      if (itemsList.length === 0 && vendorId) {
        try {
          const allVendorsRes = await fetch(`/api/vendors?organizationId=${org}`);
          if (allVendorsRes.ok) {
            const allVendorsData = await allVendorsRes.json();
            const targetVendor = (allVendorsData.items || []).find((v: any) => v.id === vendorId);
            if (targetVendor) {
              setAssignedVendorName(targetVendor.name);
              if (targetVendor.locationId && targetVendor.locationId !== loc) {
                const fallbackRes = await fetch(`/api/vendor-items?organizationId=${org}&locationId=${targetVendor.locationId}&vendorId=${vendorId}`);
                if (fallbackRes.ok) {
                  const fallbackData = await fallbackRes.json();
                  itemsList = fallbackData?.items || [];
                }
              }
            }
          }
        } catch {
          // Keep whatever items were found
        }
      }

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
    
    // Validate that ALL items in the assessment list have a value entered
    const unenteredItems: string[] = [];
    const inputs = vendorItems.map(item => {
      const { total, hasEntered } = computeTotalStock(item);
      if (!hasEntered) {
        unenteredItems.push(item.itemName);
        return null;
      }
      return {
        itemId: item.itemId,
        currentStock: total
      };
    });

    if (unenteredItems.length > 0) {
      setError(
        `All items must be assessed. Please enter the available stock (or 0) for: ${unenteredItems.slice(0, 3).join(", ")}${
          unenteredItems.length > 3 ? ` and ${unenteredItems.length - 3} more` : ""
        }.`
      );
      setSubmitting(false);
      return;
    }

    const validInputs = inputs.filter((entry): entry is { itemId: string; currentStock: number } => entry !== null);

    if (validInputs.length === 0) {
      setError("No items available to assess for this vendor.");
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
          stockInputs: validInputs,
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
      <div style={{ padding: "16px", maxWidth: "1100px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 6px 0", color: "var(--kalki-text-primary, #0f172a)" }}>
            Daily Stock Assessment
          </h1>
          <p style={{ color: "var(--text-muted, #64748b)", margin: 0, fontSize: "13px" }}>
            Enter current available stock. Purchase Orders are automatically generated for items that reach or fall below reorder levels.
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#b91c1c",
                padding: "2px",
                display: "flex",
                alignItems: "center"
              }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "var(--kalki-text-secondary, #334155)" }}>
            Vendor
          </label>
          {urlVendorId ? (
            <div style={{ 
              padding: "8px 12px", 
              borderRadius: "6px", 
              border: "1px solid var(--border-color, #e2e8f0)", 
              backgroundColor: "#f8fafc", 
              color: "#0f172a", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "14px"
            }}>
              <span>{assignedVendorName || vendors.find(v => v.id === selectedVendorId)?.name || "Assigned Vendor"}</span>
              <span style={{ fontSize: "0.75rem", backgroundColor: "#e2e8f0", color: "#475569", padding: "2px 8px", borderRadius: "12px", fontWeight: 500 }}>
                Assigned Task
              </span>
            </div>
          ) : (
            <select 
              value={selectedVendorId} 
              onChange={(e) => setSelectedVendorId(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", fontSize: "14px" }}
            >
              <option value="">-- Choose a vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p style={{ color: "#64748b", fontSize: "14px" }}>Loading items...</p>
        ) : vendorItems.length > 0 ? (
          <div style={{ backgroundColor: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table className="desktop-only" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ backgroundColor: "var(--background, #f8fafc)", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
                  <tr>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Item</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "90px", fontWeight: 600 }}>Reorder (Min)</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "90px", fontWeight: 600 }}>Target</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", minWidth: "220px", fontWeight: 600 }}>Available Stock Input</th>
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
                    const isMissing = !hasEntered;

                    return (
                      <tr key={item.id} style={{ borderBottom: idx === vendorItems.length - 1 ? "none" : "1px solid var(--border-color, #f1f5f9)", backgroundColor: isUnder ? "#fff1f2" : isMissing ? "#fffbeb" : undefined }}>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, color: "var(--kalki-text-primary, #0f172a)" }}>{item.itemName}</span>
                            <span style={{ fontSize: "11px", color: "#64748b", backgroundColor: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>
                              {item.unitOfMeasure}
                            </span>
                            {item.roundToWhole && (
                              <span style={{ fontSize: "10px", background: "#f3e8ff", color: "#7c3aed", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>
                                Whole
                              </span>
                            )}
                            {isMissing && (
                              <span style={{ fontSize: "10px", color: "#b45309", backgroundColor: "#fef3c7", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                Required *
                              </span>
                            )}
                          </div>
                          {activeSurgePct > 0 && (
                            <div style={{ marginTop: "2px" }}>
                              <span style={{ fontSize: "10px", backgroundColor: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                ⚡ +{activeSurgePct}% {dayOfWeek === 5 ? 'Fri' : 'Sat'} Surge
                              </span>
                            </div>
                          )}
                          {hasPrep && (
                            <div style={{ fontSize: "11px", color: "#0284c7", marginTop: "2px" }}>
                              1 {item.prepUnit} = {item.prepUnitConversion} {item.unitOfMeasure}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle", color: activeSurgePct > 0 ? "#b45309" : "var(--text-muted, #64748b)", fontWeight: activeSurgePct > 0 ? 600 : "normal" }}>
                          {min} {item.unitOfMeasure}
                          {activeSurgePct > 0 && <div style={{ fontSize: "10px", color: "#94a3b8" }}>(Base {baseMin})</div>}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle", color: activeSurgePct > 0 ? "#b45309" : "var(--text-muted, #64748b)", fontWeight: activeSurgePct > 0 ? 600 : "normal" }}>
                          {effectiveTarget} {item.unitOfMeasure}
                          {activeSurgePct > 0 && <div style={{ fontSize: "10px", color: "#94a3b8" }}>(Base {baseTarget})</div>}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                          {hasPrep ? (
                            <div style={{ display: "inline-flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <input 
                                    type="number"
                                    min="0"
                                    step={item.roundToWhole ? "1" : "0.01"}
                                    value={stockInputs[item.itemId] || ""}
                                    onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                                    placeholder="0"
                                    style={{ width: "70px", padding: "5px 6px", borderRadius: "4px", border: "1px solid var(--border-color, #cbd5e1)", textAlign: "center", fontSize: "13px" }}
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
                                    style={{ width: "70px", padding: "5px 6px", borderRadius: "4px", border: "1px solid #38bdf8", backgroundColor: "#f0f9ff", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#0369a1" }}
                                  />
                                  <span style={{ fontSize: "10px", color: "#0369a1", marginTop: "2px" }}>Prep ({item.prepUnit})</span>
                                </div>
                              </div>
                              {hasEntered && (
                                <div style={{ fontSize: "11px", fontWeight: 700, color: isUnder ? "#dc2626" : "#15803d", backgroundColor: isUnder ? "#fee2e2" : "#f0fdf4", padding: "1px 8px", borderRadius: "10px", border: `1px solid ${isUnder ? "#fca5a5" : "#bbf7d0"}` }}>
                                  Total: {total} {item.unitOfMeasure}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <input 
                                type="number"
                                min="0"
                                step={item.roundToWhole ? "1" : "0.01"}
                                value={stockInputs[item.itemId] || ""}
                                onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                                placeholder="0"
                                style={{ width: "80px", padding: "6px 8px", borderRadius: "4px", border: "1px solid var(--border-color, #cbd5e1)", textAlign: "center", fontSize: "13px", fontWeight: 600 }}
                              />
                              <span style={{ fontSize: "12px", color: "#64748b" }}>{item.unitOfMeasure}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Kitchen-Floor Controls & Card View (<= 768px) */}
            <div className="mobile-only" style={{ padding: "12px 12px 100px 12px" }}>
              {/* Quick Search & Category Filter Chips */}
              <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search item name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    backgroundColor: "#f8fafc",
                    boxSizing: "border-box"
                  }}
                />
                
                {/* Filter Chips */}
                <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setMobileFilter("ALL")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "none",
                      backgroundColor: mobileFilter === "ALL" ? "#0f172a" : "#e2e8f0",
                      color: mobileFilter === "ALL" ? "#ffffff" : "#475569",
                      whiteSpace: "nowrap",
                      cursor: "pointer"
                    }}
                  >
                    All ({vendorItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFilter("REORDER")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "none",
                      backgroundColor: mobileFilter === "REORDER" ? "#dc2626" : "#fee2e2",
                      color: mobileFilter === "REORDER" ? "#ffffff" : "#991b1b",
                      whiteSpace: "nowrap",
                      cursor: "pointer"
                    }}
                  >
                    ⚡ Needs Reorder ({vendorItems.filter(i => {
                      const { total, hasEntered } = computeTotalStock(i);
                      const baseMin = Number(i.minimumStock || i.baseMinStock || 0);
                      return hasEntered && total < baseMin;
                    }).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFilter("PENDING")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "none",
                      backgroundColor: mobileFilter === "PENDING" ? "#d97706" : "#fef3c7",
                      color: mobileFilter === "PENDING" ? "#ffffff" : "#92400e",
                      whiteSpace: "nowrap",
                      cursor: "pointer"
                    }}
                  >
                    Uncounted ({vendorItems.filter(i => !computeTotalStock(i).hasEntered).length})
                  </button>
                </div>
              </div>

              {vendorItems
                .filter((item) => {
                  if (searchTerm && !item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                  }
                  const { total, hasEntered } = computeTotalStock(item);
                  const baseMin = Number(item.minimumStock || item.baseMinStock || 0);
                  if (mobileFilter === "REORDER") return hasEntered && total < baseMin;
                  if (mobileFilter === "PENDING") return !hasEntered;
                  return true;
                })
                .map((item) => {
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
                const isMissingMobile = !hasEntered;

                return (
                  <div
                    key={item.id}
                    className="kalki-mobile-card"
                    style={{
                      borderLeft: isUnderStock ? "5px solid #ef4444" : isMissingMobile ? "5px solid #f59e0b" : "5px solid #16a34a",
                      marginBottom: "12px",
                      backgroundColor: isUnderStock ? "#fff5f5" : isMissingMobile ? "#fffbeb" : "#ffffff",
                      borderRadius: "10px",
                      padding: "14px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      borderTop: "1px solid #f1f5f9",
                      borderRight: "1px solid #f1f5f9",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>{item.itemName}</div>
                          {isMissingMobile && (
                            <span style={{ fontSize: "10px", color: "#b45309", backgroundColor: "#fef3c7", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                              Count Needed *
                            </span>
                          )}
                        </div>
                        {activeSurgePct > 0 && (
                          <div style={{ marginTop: "3px" }}>
                            <span style={{ fontSize: "11px", backgroundColor: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                              ⚡ +{activeSurgePct}% Weekend Surge
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                          Base Unit: <strong>{item.unitOfMeasure}</strong>
                          {hasPrep && ` • 1 ${item.prepUnit} = ${item.prepUnitConversion} ${item.unitOfMeasure}`}
                          {item.roundToWhole && ` • Whole units`}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          backgroundColor: isUnderStock ? "#fee2e2" : isMissingMobile ? "#f1f5f9" : "#dcfce7",
                          color: isUnderStock ? "#b91c1c" : isMissingMobile ? "#475569" : "#15803d",
                        }}
                      >
                        {isUnderStock ? "Reorder Triggered" : isMissingMobile ? "Pending" : "Sufficient"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "8px 10px", borderRadius: "8px", fontSize: "12px", marginBottom: "12px" }}>
                      <div>
                        <span style={{ color: "#64748b" }}>Min Reorder: </span>
                        <strong>{min} {item.unitOfMeasure}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Target Stock: </span>
                        <strong>{target} {item.unitOfMeasure}</strong>
                      </div>
                    </div>

                    {hasPrep ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Raw ({item.unitOfMeasure}):</span>
                          <input
                            type="number"
                            min="0"
                            step={item.roundToWhole ? "1" : "0.01"}
                            value={stockInputs[item.itemId] || ""}
                            onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                            placeholder="0"
                            style={{
                              width: "100px",
                              height: "40px",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              textAlign: "center",
                              fontSize: "15px",
                              fontWeight: 700,
                              backgroundColor: "#ffffff",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#0369a1" }}>Prepped ({item.prepUnit}):</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={prepInputs[item.itemId] || ""}
                            onChange={(e) => handlePrepChange(item.itemId, e.target.value)}
                            placeholder="0"
                            style={{
                              width: "100px",
                              height: "40px",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #38bdf8",
                              textAlign: "center",
                              fontSize: "15px",
                              fontWeight: 700,
                              backgroundColor: "#f0f9ff",
                              color: "#0369a1",
                            }}
                          />
                        </div>
                        {hasEntered && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>Total Equivalent Stock:</span>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: isUnderStock ? "#dc2626" : "#15803d" }}>
                              {total} {item.unitOfMeasure}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Counted Quantity:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(0, rawVal - 1);
                                handleStockChange(item.itemId, next.toString());
                              }}
                              style={{
                                width: "42px",
                                height: "42px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                borderRadius: "8px",
                                fontSize: "18px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              step={item.roundToWhole ? "1" : "0.01"}
                              value={stockInputs[item.itemId] || ""}
                              onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                              placeholder="0"
                              style={{
                                width: "80px",
                                height: "42px",
                                padding: "4px 8px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                textAlign: "center",
                                fontSize: "16px",
                                fontWeight: 700,
                                backgroundColor: "#ffffff"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = rawVal + 1;
                                handleStockChange(item.itemId, next.toString());
                              }}
                              style={{
                                width: "42px",
                                height: "42px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                borderRadius: "8px",
                                fontSize: "18px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Quick Preset Buttons (0, Target) */}
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => handleStockChange(item.itemId, "0")}
                            style={{
                              padding: "4px 10px",
                              fontSize: "11px",
                              borderRadius: "4px",
                              border: "1px solid #fecaca",
                              backgroundColor: "#fef2f2",
                              color: "#dc2626",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Out of Stock (0)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockChange(item.itemId, target.toString())}
                            style={{
                              padding: "4px 10px",
                              fontSize: "11px",
                              borderRadius: "4px",
                              border: "1px solid #bbf7d0",
                              backgroundColor: "#f0fdf4",
                              color: "#16a34a",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Full Target ({target})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Floating Bottom Kitchen Action Bar */}
              <div style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                zIndex: 999
              }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Assessment Progress</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    {vendorItems.filter(i => computeTotalStock(i).hasEntered).length} / {vendorItems.length} Counted
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "12px 22px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 4px rgba(37, 99, 235, 0.3)"
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Assessment"}
                </button>
              </div>
            </div>
            
            <div className="desktop-only" style={{ padding: "16px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
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

        {/* Kalki BOS Error / Warning Popup Modal */}
        {error && (
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
              zIndex: 99999,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "480px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                overflow: "hidden",
                border: "1px solid #fee2e2",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "18px 20px",
                  borderBottom: "1px solid #fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#fef2f2",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#991b1b" }}>
                      Assessment Incomplete
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c" }}>
                      Action required before submitting
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#991b1b",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "4px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "20px" }}>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", color: "#334155" }}>
                  {error}
                </p>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "14px 20px",
                  backgroundColor: "#f8fafc",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setError("")}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}
                >
                  Understood, Continue
                </button>
              </div>
            </div>
          </div>
        )}

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
