"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { buildPoWhatsappMessage, formatIndianCurrency, openWhatsAppUrl } from "@/lib/whatsapp-po";
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (urlVendorId) {
      setSelectedVendorId(urlVendorId);
    }
  }, [urlVendorId]);

  useEffect(() => {
    if (selected) {
      fetchVendors();
    }
  }, [selected]);

  useEffect(() => {
    if (selectedVendorId && selected) {
      fetchVendorItems(selectedVendorId);
    } else {
      setVendorItems([]);
    }
  }, [selectedVendorId, selected]);

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
      itemsList.forEach((i: VendorItem) => {
        initInputs[i.itemId] = "";
      });
      setStockInputs(initInputs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (itemId: string, value: string) => {
    setStockInputs(prev => ({ ...prev, [itemId]: value }));
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
    
    // Prepare payload
    const inputs = Object.entries(stockInputs)
      .filter(([_, val]) => val !== "")
      .map(([itemId, val]) => ({
        itemId,
        currentStock: Number(val)
      }));

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
        const shouldSendWhatsApp = isApprovedOrSent && (currentVendor?.poDeliveryMethod === "WHATSAPP" || phoneDigits) && createdPo?.publicToken;

        if (shouldSendWhatsApp) {
          const poNumber = createdPo.poNumber || `PO-${createdPo.id.slice(0, 8).toUpperCase()}`;

          const { whatsappUrl } = buildPoWhatsappMessage({
            poNumber,
            totalAmount: createdPo.totalAmount,
            publicToken: createdPo.publicToken,
            lines: result.lines || null,
            vendorPhone: phoneDigits,
            poWhatsappPreference: currentVendor?.poWhatsappPreference,
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
                {vendorItems.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: idx === vendorItems.length - 1 ? "none" : "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px" }}>{item.itemName}</td>
                    <td style={{ padding: "12px" }}>{item.unitOfMeasure}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)" }}>{Number(item.minimumStock || item.baseMinStock || 0)}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)" }}>{Number(item.normalQuantity || item.targetStock || 0)}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={stockInputs[item.itemId] || ""}
                        onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                        placeholder="Qty"
                        style={{ width: "120px", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", textAlign: "center" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View (<= 768px) */}
            <div className="mobile-only" style={{ padding: "12px" }}>
              {vendorItems.map((item) => {
                const currentVal = stockInputs[item.itemId] ?? "";
                const numVal = parseFloat(currentVal) || 0;
                const min = Number(item.minimumStock || item.baseMinStock || 0);
                const target = Number(item.normalQuantity || item.targetStock || 0);
                const isUnderStock = currentVal !== "" && numVal < min;

                return (
                  <div
                    key={item.id}
                    className="kalki-mobile-card"
                    style={{
                      borderLeft: isUnderStock ? "4px solid #ef4444" : "4px solid #3b82f6",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>{item.itemName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>Unit: {item.unitOfMeasure}</div>
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
                      <div><span style={{ color: "#64748b" }}>Min Reorder: </span><strong>{min}</strong></div>
                      <div><span style={{ color: "#64748b" }}>Target Stock: </span><strong>{target}</strong></div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Counted Stock:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.max(0, numVal - 1);
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
                            const next = numVal + 1;
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
