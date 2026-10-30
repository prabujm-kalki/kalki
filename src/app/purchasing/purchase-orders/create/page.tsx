"use client";

import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";

import { ArrowLeft, ShoppingCart, Send, Package, Clock, CheckCircle2, AlertCircle, FileText, Check } from "lucide-react";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { KalkiSelect } from "@/components/ui/KalkiSelect";
import { KalkiInput } from "@/components/ui/KalkiInput";
import { KalkiSection } from "@/components/ui/KalkiSection";
import { buildPoWhatsappMessage, openWhatsAppUrl, resolveWhatsappPreferences } from "@/lib/whatsapp-po";

export default function CreatePOPage() {
  const { session, selected } = useSessionView();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isOwner = session?.isOwner;
  const permissions = selected?.permissions || [];
  const canCreatePO = isOwner || permissions.includes("purchasing.create_po:create");
  
  const scheduleId = searchParams.get('scheduleId');
  const queryVendorId = searchParams.get('vendorId');
  const isRoutineMode = !!scheduleId;
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorItems, setVendorItems] = useState<any[]>([]);
  
  const [selectedVendorId, setSelectedVendorId] = useState(queryVendorId || "");
  const [paymentMethod, setPaymentMethod] = useState("credit");
  
  const [error, setError] = useState<string | null>(null);
  const [recentPOs, setRecentPOs] = useState<any[]>([]);

  const fetchRecentPOs = () => {
    if (!selected || !canCreatePO) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      limit: "5"
    });
    apiGet<{ purchaseOrders: any[] }>(`/api/purchase-orders?${query.toString()}`).then(res => {
      setRecentPOs(res.purchaseOrders || []);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchRecentPOs();
  }, [selected, canCreatePO]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selected || !canCreatePO) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    apiGet<{ items: any[] }>(`/api/vendors?${query.toString()}`).then(res => {
      setVendors(res.items || []);
    }).catch(err => {
      console.error(err);
    });
  }, [selected, canCreatePO]);

  useEffect(() => {
    if (!selected || !selectedVendorId || !canCreatePO) {
      setVendorItems([]);
      return;
    }
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      vendorId: selectedVendorId
    });
    apiGet<{ items: any[] }>(`/api/vendor-items?${query.toString()}`).then(res => {
      setVendorItems(res.items.map(i => ({ 
        ...i, 
        orderedQuantity: 0, 
        availableStock: '', // Used for routine mode (raw)
        availablePrepStock: '', // Used for routine mode (prep/half-boiled)
        calculatedQty: '', // Used for manual override
        unitRate: i.lastRate || 0 
      })));
    }).catch(console.error);
  }, [selected, selectedVendorId]);

  function recalcRoutineQty(itemsList: any[], index: number) {
    const item = itemsList[index];
    const rawStr = item.availableStock ?? '';
    const prepStr = item.availablePrepStock ?? '';

    if (rawStr === '' && prepStr === '') {
      item.calculatedQty = '';
      return;
    }

    const rawVal = parseFloat(rawStr) || 0;
    const prepVal = parseFloat(prepStr) || 0;
    const prepRatio = Number(item.prepUnitConversion) || 0;
    const avail = rawVal + (prepVal * prepRatio);

    // Demand Surge Multipliers: Check if today is Friday (5) or Saturday (6)
    const dayOfWeek = new Date().getDay();
    let surgePct = 0;
    if (dayOfWeek === 5) {
      surgePct = Number(item.fridaySurge || 0);
    } else if (dayOfWeek === 6) {
      surgePct = Number(item.saturdaySurge || 0);
    }
    const surgeMultiplier = surgePct > 0 ? 1 + (surgePct / 100) : 1;

    const baseMin = Number(item.minimumStock || item.baseMinStock || 0);
    const minStock = Number((baseMin * surgeMultiplier).toFixed(3));
    if (avail <= minStock) {
      if (item.replenishmentStrategy === 'fixed') {
        let reorderQty = Number(item.reorderQuantity || 1) * surgeMultiplier;
        if (item.purchaseUnit && item.purchaseUnit !== item.unitOfMeasure && item.purchaseUnitConversion && item.purchaseUnitConversion > 0) {
          reorderQty = Number((reorderQty / item.purchaseUnitConversion).toFixed(3));
        }
        if (item.roundToWhole && reorderQty > 0) {
          reorderQty = Math.ceil(reorderQty);
        }
        item.calculatedQty = Number(reorderQty.toFixed(3));
      } else {
        const target = Number(item.normalQuantity || item.targetStock || 0) * surgeMultiplier;
        let shortfall = Math.max(0, target - avail);
        if (item.purchaseUnit && item.purchaseUnit !== item.unitOfMeasure && item.purchaseUnitConversion && item.purchaseUnitConversion > 0) {
          shortfall = Number((shortfall / item.purchaseUnitConversion).toFixed(3));
        }
        if (item.roundToWhole && shortfall > 0) {
          shortfall = Math.ceil(shortfall);
        }
        item.calculatedQty = Number(shortfall.toFixed(3));
      }
    } else {
      item.calculatedQty = 0;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const linesToSubmit = isRoutineMode ? 
        vendorItems
        : vendorItems.filter(item => Number(item.orderedQuantity) > 0);

      const lines = linesToSubmit.map(item => {
        if (!item.itemId) {
          throw new Error(`Item "${item.itemName}" must be mapped to a master catalog item before it can be purchased.`);
        }
        return {
          itemId: item.itemId,
          orderedQuantity: isRoutineMode ? Number(item.calculatedQty || 0) : Number(item.orderedQuantity),
          unitRate: Number(item.unitRate)
        };
      });

      if (lines.length === 0) {
        throw new Error("You must have at least 1 item in the purchase order.");
      }

      const payload: any = {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        vendorId: selectedVendorId,
        paymentMethod: paymentMethod,
        lines: lines
      };
      
      if (scheduleId) {
        payload.scheduleId = scheduleId;
      }

      const createdRes: any = await apiSend('/api/purchase-orders', 'POST', payload);
      const createdPo = createdRes?.purchaseOrder;

      // Find the selected vendor details
      const currentVendor = vendors.find(v => v.id === selectedVendorId);
      const vendorPhoneRaw = currentVendor?.contactDetails?.phone || currentVendor?.contactDetails?.whatsapp || currentVendor?.contactDetails?.mobile || "";
      const phoneDigits = vendorPhoneRaw.replace(/\D/g, "");

      const isApprovedOrSent = createdPo?.status === "approved" || createdPo?.status === "sent_to_vendor";
      const resolvedPolicy = resolveWhatsappPreferences({
        orgDispatchMode: createdRes?.whatsappDispatchMode,
        orgContentFormat: createdRes?.whatsappContentFormat,
        vendorPreference: currentVendor?.poWhatsappPreference,
        vendorDeliveryMethod: currentVendor?.poDeliveryMethod,
      });

      if (isApprovedOrSent && !resolvedPolicy.isGloballyDisabled && phoneDigits && createdPo?.publicToken) {
        const poNumber = createdPo.poNumber || `PO-${createdPo.id.slice(0, 8).toUpperCase()}`;

        if (resolvedPolicy.dispatchMode === "API_AUTOMATED") {
          try {
            await apiSend(`/api/purchase-orders/${createdPo.id}/send-whatsapp`, "POST", {});
            alert(`Purchase Order #${poNumber} created and dispatched automatically to ${currentVendor.name} via WhatsApp API.`);
          } catch (e) {
            console.error("Failed to auto-send PO via WhatsApp API", e);
            alert(`Purchase Order #${poNumber} created successfully.`);
          }
        } else if (resolvedPolicy.dispatchMode === "WEB_LINK_POPUP") {
          const confirmSend = window.confirm(
            `Purchase Order created successfully!\n\nWould you like to send this PO via WhatsApp to ${currentVendor.name} (${vendorPhoneRaw || "Vendor"}) now?`
          );

          if (confirmSend) {
            const poLinesForMsg = linesToSubmit.map(item => ({
              itemName: item.itemName,
              orderedQuantity: isRoutineMode ? item.calculatedQty : item.orderedQuantity,
              unitOfMeasure: item.purchaseUnit || item.unitOfMeasure || ""
            }));

            const { whatsappUrl } = buildPoWhatsappMessage({
              poNumber,
              totalAmount: createdPo.totalAmount,
              publicToken: createdPo.publicToken,
              lines: poLinesForMsg,
              vendorPhone: phoneDigits,
              poWhatsappPreference: resolvedPolicy.contentFormat,
              whatsappPoTemplate: createdRes?.whatsappPoTemplate || null
            });

            try {
              await apiSend(`/api/purchase-orders/${createdPo.id}/mark-sent`, "POST", {});
            } catch (e) {
              console.error("Failed to mark as sent", e);
            }

            openWhatsAppUrl(whatsappUrl);
          }
        }
      } else if (createdPo?.status === "pending_approval") {
        alert(
          `Purchase Order #${createdPo.poNumber || createdPo.id.slice(0, 8).toUpperCase()} created successfully!\n\nIt has been submitted for approval and will be available to dispatch once approved by the reporting manager.`
        );
      } else if (!createdPo) {
        alert("Stock assessment completed. All items are currently above reorder levels, so no purchase order was required.");
      } else {
        alert("Purchase Order created successfully!");
      }

      router.push(`/purchasing${selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : ''}`);
    } catch (err: any) {
      setError(err.message || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Please select a location.</StatusMessage>;

  const locationParams = `?organizationId=${selected.organizationId}&locationId=${selected.locationId}`;

  if (!canCreatePO) {
    return (
      <div className="kalki-main-content" style={{ maxWidth: '640px', margin: '48px auto' }}>
        <div style={{ 
          padding: '40px 32px', 
          textAlign: 'center', 
          backgroundColor: '#ffffff', 
          borderRadius: '12px', 
          border: '1px solid var(--kalki-border)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            margin: '0 auto 16px', 
            borderRadius: '50%', 
            backgroundColor: '#fee2e2', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#dc2626' 
          }}>
            <AlertCircle size={26} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--kalki-text-primary)', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--kalki-text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6', maxWidth: '440px', margin: '0 auto 24px' }}>
            Your role does not have permission to create purchase orders. Please contact your administrator if you need access.
          </p>
          <Link
            href={`/purchasing${locationParams}`}
            style={{ textDecoration: 'none' }}
          >
            <KalkiButton variant="primary">
              &larr; Return to Purchasing
            </KalkiButton>
          </Link>
        </div>
      </div>
    );
  }

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  return (
    <div className="kalki-main-content">
      {/* Page Header */}
      <div className="kalki-page-header" style={{ marginBottom: "20px" }}>
        <Link 
          href={`/purchasing/dashboard${locationParams}`} 
          className="kalki-breadcrumbs" 
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px", textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 className="kalki-page-title" style={{ fontSize: "22px", margin: 0 }}>
              {isRoutineMode ? "Routine Stock Assessment PO" : "Create Purchase Order"}
            </h1>
            <p className="kalki-page-description" style={{ marginTop: "4px" }}>
              Select a vendor to populate catalog items and dispatch POs directly ({selected.organizationName} · {selected.locationName})
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        {/* Vendor & Payment Terms Selection Card */}
        <KalkiSection title="Order Parameters & Vendor" icon={<ShoppingCart size={16} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            <KalkiSelect 
              label="Select Vendor" 
              required 
              value={selectedVendorId} 
              onChange={e => setSelectedVendorId(e.target.value)} 
              disabled={submitting || isRoutineMode}
            >
              <option value="" disabled>Choose vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.creditLimitAmount ? `(Limit: ₹${Number(v.creditLimitAmount).toLocaleString("en-IN")})` : ''}
                </option>
              ))}
            </KalkiSelect>

            <KalkiSelect 
              label="Payment Method" 
              required 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)} 
              disabled={submitting || isRoutineMode}
            >
              <option value="credit">Standard Credit (Uses Vendor Limit)</option>
              <option value="cash">Cash Upfront / Due on Receipt (Bypasses Limit)</option>
            </KalkiSelect>
          </div>

          {selectedVendor && (
            <div style={{ marginTop: "16px", padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--kalki-border)", display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "13px" }}>
              <div>
                <span style={{ color: "var(--kalki-text-secondary)" }}>Terms: </span>
                <strong>{selectedVendor.paymentTerms ? selectedVendor.paymentTerms.replace(/_/g, " ") : "Net 30"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--kalki-text-secondary)" }}>Dispatch Method: </span>
                <strong>{selectedVendor.poDeliveryMethod || "WhatsApp"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--kalki-text-secondary)" }}>Expected Lead Time: </span>
                <strong>{selectedVendor.expectedDeliveryDays ? `${selectedVendor.expectedDeliveryDays} Days` : "2 Days"}</strong>
              </div>
            </div>
          )}
        </KalkiSection>

        {/* Items to Order Table */}
        {selectedVendorId && vendorItems.length > 0 && (
          <KalkiSection 
            title={isRoutineMode ? "Assess Inventory Shortfall" : "Items to Order"} 
            icon={<Package size={16} />}
          >
            <div className="kalki-table-container">
              <table className="kalki-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Item</th>
                    <th style={{ width: "15%" }}>UoM</th>
                    {isRoutineMode ? (
                      <>
                        <th style={{ width: "20%" }}>Inventory Targets</th>
                        <th style={{ width: "15%" }}>Available Stock</th>
                        <th style={{ width: "15%" }}>Calculated Order</th>
                      </>
                    ) : (
                      <th style={{ width: "20%" }}>Order Quantity</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {vendorItems.map((item, index) => {
                    const purchaseUnitDisplay = item.purchaseUnit ? ` ${item.purchaseUnit}` : '';
                    const dayOfWeek = new Date().getDay();
                    const activeSurgePct = dayOfWeek === 5 ? Number(item.fridaySurge || 0) : dayOfWeek === 6 ? Number(item.saturdaySurge || 0) : 0;
                    const surgeMult = activeSurgePct > 0 ? 1 + (activeSurgePct / 100) : 1;
                    const baseMin = Number(item.minimumStock || item.baseMinStock || 0);
                    const effectiveMin = Number((baseMin * surgeMult).toFixed(2));
                    const baseTarget = Number(item.normalQuantity || item.targetStock || 0);
                    const effectiveTarget = Number((baseTarget * surgeMult).toFixed(2));
                    
                    return (
                      <tr key={item.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--kalki-text-primary)" }}>{item.itemName}</span>
                          {activeSurgePct > 0 && (
                            <div style={{ marginTop: '2px' }}>
                              <span style={{ fontSize: '10px', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                ⚡ +{activeSurgePct}% {dayOfWeek === 5 ? 'Fri' : 'Sat'} Surge
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ padding: "2px 8px", backgroundColor: "#f1f5f9", borderRadius: "4px", fontSize: "12px", fontWeight: 500, color: "var(--kalki-text-secondary)" }}>
                            {item.unitOfMeasure}
                          </span>
                        </td>
                        {isRoutineMode ? (
                          <>
                            <td style={{ fontSize: '12px', color: 'var(--kalki-text-secondary)' }}>
                              Min: {effectiveMin} {item.unitOfMeasure} {activeSurgePct > 0 && <span style={{ color: '#d97706', fontSize: '10px' }}>(Base {baseMin})</span>} <br/>
                              {item.replenishmentStrategy === 'fixed' 
                                ? `Reorder: ${Number((Number(item.reorderQuantity || 1) * surgeMult).toFixed(2))}${purchaseUnitDisplay}`
                                : `Target: ${effectiveTarget} ${item.unitOfMeasure}`
                              }
                            </td>
                            <td>
                              {item.prepUnit && item.prepUnitConversion && Number(item.prepUnitConversion) > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        step="any"
                                        placeholder="0"
                                        value={item.availableStock} 
                                        className="kalki-input"
                                        onChange={e => {
                                          const next = [...vendorItems];
                                          next[index].availableStock = e.target.value;
                                          recalcRoutineQty(next, index);
                                          setVendorItems(next);
                                        }} 
                                        style={{ width: "80px", height: "32px", fontSize: "12px", textAlign: "center" }}
                                      />
                                      <span style={{ fontSize: "10px", color: "var(--kalki-text-secondary)" }}>Raw ({item.unitOfMeasure})</span>
                                    </div>
                                    <span style={{ fontWeight: 700, color: "#94a3b8" }}>+</span>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        step="any"
                                        placeholder="0"
                                        value={item.availablePrepStock} 
                                        className="kalki-input"
                                        onChange={e => {
                                          const next = [...vendorItems];
                                          next[index].availablePrepStock = e.target.value;
                                          recalcRoutineQty(next, index);
                                          setVendorItems(next);
                                        }} 
                                        style={{ width: "80px", height: "32px", fontSize: "12px", textAlign: "center", backgroundColor: "#f0f9ff", borderColor: "#38bdf8", color: "#0369a1" }}
                                      />
                                      <span style={{ fontSize: "10px", color: "#0369a1" }}>Prep ({item.prepUnit})</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <input 
                                  type="number" 
                                  min="0" 
                                  step="any"
                                  placeholder={`In ${item.unitOfMeasure}`}
                                  value={item.availableStock} 
                                  className="kalki-input"
                                  onChange={e => {
                                    const next = [...vendorItems];
                                    next[index].availableStock = e.target.value;
                                    recalcRoutineQty(next, index);
                                    setVendorItems(next);
                                  }} 
                                  style={{ width: "120px", height: "36px", fontSize: "13px" }}
                                />
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.calculatedQty}
                                  className="kalki-input"
                                  onChange={e => {
                                    const next = [...vendorItems];
                                    next[index].calculatedQty = e.target.value;
                                    setVendorItems(next);
                                  }}
                                  style={{ width: "90px", height: "36px", fontSize: "13px", fontWeight: Number(item.calculatedQty) > 0 ? 'bold' : 'normal' }}
                                />
                                <span style={{ color: 'var(--kalki-text-secondary)', fontSize: '12px' }}>{purchaseUnitDisplay}</span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <td>
                            <input 
                              type="number" 
                              min="0" 
                              step="any"
                              value={item.orderedQuantity} 
                              className="kalki-input"
                              onChange={e => {
                                const next = [...vendorItems];
                                next[index].orderedQuantity = e.target.value;
                                setVendorItems(next);
                              }} 
                              style={{ width: "110px", height: "36px", fontSize: "13px" }}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </KalkiSection>
        )}

        {selectedVendorId && vendorItems.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", backgroundColor: "#fff", border: "1px solid var(--kalki-border)", borderRadius: "8px", color: "var(--kalki-text-secondary)" }}>
            This vendor does not have any items linked in their catalog. Assign items from the Vendor Profile first.
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 20px", backgroundColor: "#fff", border: "1px solid var(--kalki-border)", borderRadius: "8px" }}>
          <KalkiButton type="button" variant="secondary" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </KalkiButton>
          <KalkiButton type="submit" variant="primary" disabled={submitting || !selectedVendorId} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Check size={16} />
            {submitting ? "Submitting..." : "Submit PO"}
          </KalkiButton>
        </div>
      </form>

      {/* Recent History Table Card */}
      <div style={{ marginTop: '24px' }}>
        <KalkiSection title="Recent Purchase Orders (Verification)" icon={<Clock size={16} />}>
          {recentPOs.length > 0 ? (
            <div className="kalki-table-container">
              <table className="kalki-table">
                <thead>
                  <tr>
                    <th>PO ID</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPOs.map(po => {
                    const statusCapsule = () => {
                      const s = (po.status || "").toLowerCase();
                      if (s === "completed") {
                        return <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, backgroundColor: "#dcfce7", color: "#16a34a" }}>Completed</span>;
                      }
                      if (s === "approved") {
                        return <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, backgroundColor: "#f0fdf4", color: "#15803d" }}>Approved</span>;
                      }
                      if (s === "audited") {
                        return <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, backgroundColor: "#f3e8ff", color: "#7e22ce" }}>Audited</span>;
                      }
                      if (s === "rejected" || s === "cancelled") {
                        return <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, backgroundColor: "#fee2e2", color: "#dc2626" }}>{s === "cancelled" ? "Cancelled" : "Rejected"}</span>;
                      }
                      if (s === "received") {
                        return <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, backgroundColor: "#e0e7ff", color: "#4338ca" }}>Received</span>;
                      }
                      if (s === "sent_to_vendor") {
                        return <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, backgroundColor: "#fef3c7", color: "#d97706" }}>Sent to Vendor</span>;
                      }
                      return <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, backgroundColor: "#f1f5f9", color: "#64748b", textTransform: "capitalize" }}>{po.status}</span>;
                    };

                    return (
                      <tr key={po.id}>
                        <td style={{ fontWeight: 600, color: "var(--kalki-text-primary)" }}>
                          {po.poNumber || `${po.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td>{po.vendorName}</td>
                        <td style={{ color: "var(--kalki-text-secondary)" }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                        <td>{statusCapsule()}</td>
                        <td style={{ fontWeight: 600 }}>
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(po.totalAmount))}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {(po.status === 'approved' || po.status === 'sent_to_vendor') && (
                              <button 
                                type="button"
                                onClick={async () => {
                                  const resolvedPolicy = resolveWhatsappPreferences({
                                    orgDispatchMode: po.whatsappDispatchMode,
                                    orgContentFormat: po.whatsappContentFormat,
                                    vendorPreference: po.poWhatsappPreference,
                                    vendorDeliveryMethod: po.poDeliveryMethod,
                                  });

                                  if (resolvedPolicy.isGloballyDisabled || resolvedPolicy.dispatchMode === "NO_WHATSAPP") {
                                    alert("WhatsApp dispatch is currently disabled for this organization/vendor.");
                                    return;
                                  }

                                  if (resolvedPolicy.dispatchMode === "API_AUTOMATED") {
                                    try {
                                      await apiSend(`/api/purchase-orders/${po.id}/send-whatsapp`, "POST", {});
                                      alert(`PO #${po.poNumber || po.id.slice(0, 8).toUpperCase()} dispatched successfully via WhatsApp API.`);
                                      fetchRecentPOs();
                                    } catch (err: any) {
                                      alert(err?.message || "Failed to dispatch via WhatsApp API.");
                                    }
                                    return;
                                  }

                                  let fetchedLines = null;
                                  try {
                                    if (po.publicToken) {
                                      const poRes = await fetch(`/api/public/po?token=${po.publicToken}`);
                                      if (poRes.ok) {
                                        const poData = await poRes.json();
                                        fetchedLines = poData.lines;
                                      }
                                    }
                                  } catch (err) {
                                    console.error("Error fetching lines for WhatsApp message:", err);
                                  }

                                  const { whatsappUrl } = buildPoWhatsappMessage({
                                    poNumber: po.poNumber || po.id.slice(0, 8).toUpperCase(),
                                    totalAmount: po.totalAmount,
                                    publicToken: po.publicToken,
                                    lines: fetchedLines,
                                    vendorPhone: po.vendorPhone?.phone || "",
                                    poWhatsappPreference: resolvedPolicy.contentFormat,
                                    whatsappPoTemplate: po.whatsappPoTemplate
                                  });
                                  
                                  try {
                                    await apiSend(`/api/purchase-orders/${po.id}/mark-sent`, "POST", {});
                                    openWhatsAppUrl(whatsappUrl);
                                    fetchRecentPOs();
                                  } catch (e) {
                                    console.error("Failed to mark as sent", e);
                                    openWhatsAppUrl(whatsappUrl);
                                  }
                                }}
                                className="kalki-button kalki-button--secondary"
                                style={{ padding: "4px 8px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <Send size={12} color="#16a34a" /> {po.status === 'sent_to_vendor' ? 'Resend WA' : 'Send WA'}
                              </button>
                            )}
                            {(po.status === 'sent_to_vendor' || po.status === 'pending_receipt') && (
                              <Link 
                                href={`/purchasing/receive/${po.id}`}
                                className="kalki-button kalki-button--primary"
                                style={{ padding: "4px 8px", fontSize: "12px", textDecoration: "none" }}
                              >
                                Receive
                              </Link>
                            )}
                            {po.status === 'received' && (
                              <Link 
                                href={`/purchasing/cashier/${po.id}`}
                                className="kalki-button kalki-button--secondary"
                                style={{ padding: "4px 8px", fontSize: "12px", textDecoration: "none", color: "#d97706", borderColor: "#fde68a", backgroundColor: "#fffbeb" }}
                              >
                                Cashier Verify
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--kalki-text-secondary)", fontSize: "13px" }}>
              No recent purchase orders found.
            </div>
          )}
        </KalkiSection>
      </div>
    </div>
  );
}
