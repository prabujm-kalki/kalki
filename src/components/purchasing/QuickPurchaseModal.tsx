"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { 
  Zap, 
  X, 
  CheckCircle2, 
  Camera, 
  ShieldAlert,
  Loader2,
  Upload,
  Image as ImageIcon,
  Trash2
} from "lucide-react";
import { 
  executeQuickPurchase, 
  validateQuickPurchase, 
  getSpotPurchaseItems 
} from "@/app/purchasing/actions";
import { useRouter } from "next/navigation";

interface SpotItem {
  id: string;
  nameEn: string;
  nameTa: string;
  unit: string;
  currentPrice: string | number;
  allowSpotPurchase: boolean;
  spotPurchasePriceLimit: string | number | null;
  isInventoryTracked: boolean;
}

interface QuickPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  locationId: string;
  currentUserId: string;
  onSuccess?: () => void;
}

export function QuickPurchaseModal({
  isOpen,
  onClose,
  organizationId,
  locationId,
  currentUserId,
  onSuccess,
}: QuickPurchaseModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [itemsList, setItemsList] = useState<SpotItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [vendorName, setVendorName] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<"PETTY_CASH" | "CASH_DRAWER">("PETTY_CASH");
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<string>("");

  // Validation State
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [successVoucher, setSuccessVoucher] = useState<string | null>(null);

  // Load items callback
  useEffect(() => {
    let active = true;
    if (isOpen && organizationId && locationId) {
      getSpotPurchaseItems(organizationId, locationId).then((data) => {
        if (!active) return;
        const spotEligible = data.filter(i => i.allowSpotPurchase);
        setItemsList(spotEligible);
        if (spotEligible.length > 0) {
          setSelectedItemId(spotEligible[0].id);
          setUnitPrice(parseFloat(spotEligible[0].currentPrice.toString()) || 0);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isOpen, organizationId, locationId]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const selectedItem = itemsList.find(i => i.id === selectedItemId);
  const totalAmount = (quantity || 0) * (unitPrice || 0);

  // Handle Item Switch
  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = itemsList.find(i => i.id === itemId);
    if (item) {
      setUnitPrice(parseFloat(item.currentPrice.toString()) || 0);
    }
    setPolicyError(null);
  };

  // Real-time Ex-Ante validation check
  useEffect(() => {
    if (!selectedItemId || totalAmount <= 0) {
      const timer = setTimeout(() => setPolicyError(null), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const check = await validateQuickPurchase(
          organizationId,
          locationId,
          selectedItemId,
          totalAmount,
          receiptPhotoUrl,
          unitPrice
        );
        if (!check.allowed) {
          setPolicyError(check.reason || "Policy limit exceeded");
        } else {
          setPolicyError(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to validate policy limits";
        setPolicyError(message);
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedItemId, totalAmount, unitPrice, receiptPhotoUrl, organizationId, locationId]);

  // Real file / camera upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload photo");
      }

      const data = await res.json();
      const uploadedUrl = data.urls?.["receipt"] || Object.values(data.urls || {})[0] as string;
      if (uploadedUrl) {
        setReceiptPhotoUrl(uploadedUrl);
      } else {
        throw new Error("No URL returned from upload server");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setReceiptPhotoUrl("");
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (policyError) return;
    if (!selectedItem) return;

    startTransition(async () => {
      try {
        const result = await executeQuickPurchase({
          organizationId,
          locationId,
          itemId: selectedItemId,
          vendorName: vendorName.trim() || "Local Spot Vendor",
          quantity,
          uom: selectedItem.unit,
          unitPrice,
          totalAmount,
          paymentSource,
          receiptPhotoUrl: receiptPhotoUrl || null,
          submittedByUserId: currentUserId,
          notes: notes.trim() || undefined,
        });

        setSuccessVoucher(result.voucherNumber);
        setTimeout(() => {
          setSuccessVoucher(null);
          onClose();
          if (onSuccess) onSuccess();
          router.refresh();
        }, 1800);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Submission failed";
        setPolicyError(message);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
        background: "var(--surface-color, #ffffff)",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "520px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
        border: "1px solid var(--border-color, #e2e8f0)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color, #e2e8f0)",
          background: "linear-gradient(135deg, rgba(234, 88, 12, 0.08) 0%, rgba(249, 115, 22, 0.02) 100%)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#ea580c",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-color, #0f172a)" }}>
                Quick Purchase ⚡ (Micro-Procurement)
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted, #64748b)" }}>
                Ex-Ante Guardrail Protected Emergency Cashier Terminal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted, #64748b)",
              padding: "0.25rem"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Banner */}
        {successVoucher ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <CheckCircle2 size={48} style={{ color: "#10b981" }} />
            <h4 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Spot Purchase Created!</h4>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ea580c", letterSpacing: "1px" }}>
              {successVoucher}
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Inventory updated, expense ledger posted, and queued for shift-end manager audit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Item Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Select Emergency Item <span style={{ color: "#ef4444" }}>*</span>
              </label>
              {itemsList.length === 0 ? (
                <div style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  fontSize: "0.8rem",
                  color: "#b91c1c"
                }}>
                  No items configured for spot purchase! Enable items under <strong>Settings → Quick Purchasing</strong>.
                </div>
              ) : (
                <select
                  value={selectedItemId}
                  onChange={(e) => handleItemChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.875rem",
                    background: "var(--background-color)",
                    color: "var(--text-color)",
                    fontWeight: 500
                  }}
                  required
                >
                  {itemsList.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nameEn} {item.nameTa ? `(${item.nameTa})` : ""} - Unit: {item.unit} (Limit: ₹{item.spotPurchasePriceLimit || 'Branch Cap'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Vendor Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Spot Vendor / Shop Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Local Market / Daily Fresh / Sundar Stores"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.875rem",
                  background: "var(--background-color)",
                  color: "var(--text-color)"
                }}
                required
              />
            </div>

            {/* Quantity & Unit Price Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                  Quantity ({selectedItem?.unit || 'Units'})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.875rem",
                    background: "var(--background-color)",
                    color: "var(--text-color)"
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                  Unit Price (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.875rem",
                    background: "var(--background-color)",
                    color: "var(--text-color)"
                  }}
                  required
                />
              </div>
            </div>

            {/* Amount Summary & Payment Source */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.03)",
              border: "1px solid var(--border-color)"
            }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Voucher Amount</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ea580c" }}>
                  ₹{totalAmount.toFixed(2)}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Payment Source</span>
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value as "PETTY_CASH" | "CASH_DRAWER")}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background: "var(--background-color)",
                    color: "var(--text-color)"
                  }}
                >
                  <option value="PETTY_CASH">Petty Cash Drawer</option>
                  <option value="CASH_DRAWER">Cashier Till Drawer</option>
                </select>
              </div>
            </div>

            {/* Receipt Photo Evidence */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Receipt / Weighment Slip Photo</span>
                {receiptPhotoUrl ? (
                  <span style={{ color: "#10b981", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                    <CheckCircle2 size={13} /> Attached
                  </span>
                ) : (
                  <span style={{ color: "var(--muted-color)", fontSize: "0.72rem" }}>Camera / Gallery or File</span>
                )}
              </label>

              {/* Hidden HTML5 File Input supporting mobile camera & gallery as well as desktop file explorer */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Receipt photo URL or capture..."
                  value={receiptPhotoUrl}
                  onChange={(e) => setReceiptPhotoUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.45rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.825rem",
                    background: "var(--background-color)",
                    color: "var(--text-color)"
                  }}
                />
                
                {receiptPhotoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    title="Remove attachment"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #ef444430",
                      background: "#ef444410",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  disabled={isUploading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    background: isUploading ? "var(--muted-color)" : "var(--surface-color)",
                    cursor: isUploading ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    whiteSpace: "nowrap"
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Uploading...
                    </>
                  ) : (
                    <>
                      <Camera size={15} /> Attach
                    </>
                  )}
                </button>
              </div>

              {uploadError && (
                <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.2rem" }}>
                  {uploadError}
                </div>
              )}

              {/* Thumbnail preview if an image is attached */}
              {receiptPhotoUrl && receiptPhotoUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) && (
                <div style={{ marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <a
                    href={receiptPhotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.75rem",
                      color: "var(--primary-color, #2563eb)",
                      textDecoration: "underline"
                    }}
                  >
                    <ImageIcon size={13} /> View Attached Photo
                  </a>
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-color)" }}>
                Emergency Notes / Purpose
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch rush banana leaves shortage"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.825rem",
                  background: "var(--background-color)",
                  color: "var(--text-color)"
                }}
              />
            </div>

            {/* Ex-Ante Policy Error Message */}
            {policyError && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 0.85rem",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#dc2626",
                fontSize: "0.8rem",
                fontWeight: 500
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <span>{policyError}</span>
              </div>
            )}

            {/* Actions Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-color)",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || Boolean(policyError) || itemsList.length === 0 || isValidating}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.5rem 1.35rem",
                  borderRadius: "6px",
                  border: "none",
                  background: policyError ? "#94a3b8" : "#ea580c",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: policyError ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.7 : 1
                }}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {isPending ? "Executing..." : "Submit Quick Purchase"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
