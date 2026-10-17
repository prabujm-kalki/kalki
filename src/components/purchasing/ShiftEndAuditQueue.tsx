"use client";

import React, { useState, useTransition } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  FileCheck 
} from "lucide-react";
import { auditSpotPurchase } from "@/app/purchasing/actions";
import { useRouter } from "next/navigation";

export interface SpotPurchaseAuditItem {
  id: string;
  voucherNumber: string;
  itemId: string;
  itemName: string | null;
  vendorName: string;
  quantity: string | number;
  uom: string;
  unitPrice: string | number;
  totalAmount: string | number;
  paymentSource: string;
  receiptPhotoUrl: string | null;
  submittedByUserId: string;
  auditStatus: string;
  auditedByUserId: string | null;
  auditNotes: string | null;
  createdAt: Date | string;
}

interface ShiftEndAuditQueueProps {
  purchases: SpotPurchaseAuditItem[];
  organizationId: string;
  locationId: string;
  currentUserId: string;
  onAuditComplete?: () => void;
}

export function ShiftEndAuditQueue({
  purchases,
  organizationId,
  locationId,
  currentUserId,
  onAuditComplete,
}: ShiftEndAuditQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"PENDING_AUDIT" | "ALL">("PENDING_AUDIT");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Modal notes dialog
  const [flagModalItem, setFlagModalItem] = useState<SpotPurchaseAuditItem | null>(null);
  const [flagNotes, setFlagNotes] = useState("");

  const filteredPurchases = activeTab === "PENDING_AUDIT" 
    ? purchases.filter(p => p.auditStatus === "PENDING_AUDIT")
    : purchases;

  const handleAuditAction = async (
    purchaseId: string, 
    status: "AUDITED_CLEARED" | "FLAGGED_DISCREPANCY", 
    notes?: string
  ) => {
    setActioningId(purchaseId);
    startTransition(async () => {
      try {
        await auditSpotPurchase(
          purchaseId,
          organizationId,
          locationId,
          status,
          currentUserId,
          notes
        );
        router.refresh();
        if (onAuditComplete) {
          onAuditComplete();
        }
      } finally {
        setActioningId(null);
        setFlagModalItem(null);
        setFlagNotes("");
      }
    });
  };

  const pendingCount = purchases.filter(p => p.auditStatus === "PENDING_AUDIT").length;

  return (
    <div className="card" style={{
      padding: "1rem 1.25rem",
      background: "var(--surface-color)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      gap: "0.85rem"
    }}>
      {/* Header & Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileCheck size={18} style={{ color: "#2563eb" }} />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Shift-End Spot Purchase Audit Queue
            </h3>
            {pendingCount > 0 && (
              <span style={{
                background: "#f97316",
                color: "#ffffff",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: "999px"
              }}>
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Ex-Post physical receipt reconciliation & cashier voucher verification
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "0.25rem", background: "rgba(0,0,0,0.04)", padding: "0.2rem", borderRadius: "6px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("PENDING_AUDIT")}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "4px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "PENDING_AUDIT" ? "var(--surface-color)" : "transparent",
              color: activeTab === "PENDING_AUDIT" ? "var(--text-color)" : "var(--text-muted)",
              boxShadow: activeTab === "PENDING_AUDIT" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            Pending Audit ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "4px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "ALL" ? "var(--surface-color)" : "transparent",
              color: activeTab === "ALL" ? "var(--text-color)" : "var(--text-muted)",
              boxShadow: activeTab === "ALL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            All Activity ({purchases.length})
          </button>
        </div>
      </div>

      {/* Queue Table */}
      {filteredPurchases.length === 0 ? (
        <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.825rem" }}>
          {activeTab === "PENDING_AUDIT" ? "🎉 All today's spot purchases have been audited and cleared!" : "No spot purchase records found for this branch."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>Voucher #</th>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>Item</th>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>Vendor</th>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>Qty / Rate</th>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>Amount</th>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>Receipt Proof</th>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>Audit Status</th>
                <th style={{ padding: "0.55rem 0.75rem", fontWeight: 600, textAlign: "right" }}>Manager Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((item) => {
                const isItemActioning = actioningId === item.id;
                const formattedDate = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      <div style={{ fontWeight: 700, color: "#ea580c" }}>{item.voucherNumber}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{formattedDate}</div>
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>
                      {item.itemName || "Item"}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)" }}>
                      {item.vendorName}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      {parseFloat(item.quantity.toString()).toFixed(1)} {item.uom} @ ₹{parseFloat(item.unitPrice.toString()).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700 }}>
                      ₹{parseFloat(item.totalAmount.toString()).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      {item.receiptPhotoUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(item.receiptPhotoUrl)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            cursor: "pointer",
                            fontSize: "0.725rem",
                            fontWeight: 600
                          }}
                        >
                          <Eye size={12} /> View Slip
                        </button>
                      ) : (
                        <span style={{ color: "#ef4444", fontSize: "0.725rem", fontWeight: 500 }}>No Photo</span>
                      )}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      {item.auditStatus === "PENDING_AUDIT" ? (
                        <span style={{
                          display: "inline-block",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "999px",
                          background: "rgba(249, 115, 22, 0.12)",
                          color: "#ea580c",
                          fontSize: "0.725rem",
                          fontWeight: 600
                        }}>
                          Pending Audit
                        </span>
                      ) : item.auditStatus === "AUDITED_CLEARED" ? (
                        <span style={{
                          display: "inline-block",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "999px",
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#10b981",
                          fontSize: "0.725rem",
                          fontWeight: 600
                        }}>
                          Cleared ✓
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-block",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "999px",
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#ef4444",
                          fontSize: "0.725rem",
                          fontWeight: 600
                        }}>
                          Flagged ⚠
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem", textAlign: "right" }}>
                      {item.auditStatus === "PENDING_AUDIT" ? (
                        <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                          <button
                            type="button"
                            disabled={isPending || isItemActioning}
                            onClick={() => handleAuditAction(item.id, "AUDITED_CLEARED", "Cleared at shift end")}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.3rem 0.65rem",
                              borderRadius: "4px",
                              border: "none",
                              background: "#10b981",
                              color: "#ffffff",
                              fontSize: "0.725rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              opacity: isItemActioning ? 0.6 : 1
                            }}
                          >
                            <CheckCircle size={13} /> Clear
                          </button>
                          <button
                            type="button"
                            disabled={isPending || isItemActioning}
                            onClick={() => setFlagModalItem(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.3rem 0.65rem",
                              borderRadius: "4px",
                              border: "1px solid #ef4444",
                              background: "rgba(239, 68, 68, 0.08)",
                              color: "#ef4444",
                              fontSize: "0.725rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              opacity: isItemActioning ? 0.6 : 1
                            }}
                          >
                            <AlertTriangle size={13} /> Flag
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>
                          {item.auditNotes || "Reconciled"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slip Photo Preview Modal */}
      {selectedPhoto && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "1.5rem"
        }}>
          <div style={{
            background: "var(--surface-color)",
            borderRadius: "10px",
            maxWidth: "480px",
            width: "100%",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Receipt Slip Evidence</h4>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1rem" }}
              >
                ✕
              </button>
            </div>
            <div style={{
              background: "#0f172a",
              color: "#f8fafc",
              borderRadius: "6px",
              padding: "2rem 1rem",
              textAlign: "center",
              fontSize: "0.85rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <FileCheck size={36} style={{ color: "#38bdf8" }} />
              <div>Proof Evidence Image</div>
              <div style={{ fontSize: "0.725rem", color: "#94a3b8", wordBreak: "break-all" }}>
                {selectedPhoto}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              style={{
                padding: "0.45rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--surface-color)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.8rem"
              }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Flag Discrepancy Modal */}
      {flagModalItem && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "1.5rem"
        }}>
          <div style={{
            background: "var(--surface-color)",
            borderRadius: "10px",
            maxWidth: "420px",
            width: "100%",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}>
            <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertTriangle size={18} /> Flag Discrepancy: {flagModalItem.voucherNumber}
            </h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Provide the discrepancy reason (e.g. missing physical slip, amount mismatch against weighment scale, unverified vendor).
            </p>

            <textarea
              placeholder="Describe discrepancy reason..."
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                fontSize: "0.825rem",
                background: "var(--background-color)",
                color: "var(--text-color)"
              }}
              required
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setFlagModalItem(null)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!flagNotes.trim() || isPending}
                onClick={() => handleAuditAction(flagModalItem.id, "FLAGGED_DISCREPANCY", flagNotes)}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Confirm Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
