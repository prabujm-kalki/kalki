"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, PackageCheck } from "lucide-react";

interface ReceiveLineItem {
  id: string;
  itemId: string;
  itemName: string;
  orderedQuantity: string;
  receivedQuantity: string;
  isZero: boolean;
  acknowledged: boolean;
  actionTaken: "OK" | "ZERO" | "MODIFIED" | null;
}

export default function POReceivePage() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();

  const id = typeof routeParams?.id === "string" ? routeParams.id : "";
  const organizationId = searchParams?.get("organizationId") || "";
  const locationId = searchParams?.get("locationId") || "";

  const tenantQuery = organizationId
    ? `?organizationId=${organizationId}${locationId && locationId !== "ALL" ? `&locationId=${locationId}` : ""}`
    : "";

  const [po, setPo] = useState<any>(null);
  const [vendorName, setVendorName] = useState("");
  const [lines, setLines] = useState<ReceiveLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchPODetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/purchase-orders/${id}/receive-details`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load PO details");
      }
      const data = await res.json();
      setPo(data.po);
      setVendorName(data.vendorName || "Direct Vendor");
      
      // Initialize items as UNACKNOWLEDGED by default so employees must verify each item
      const initializedLines: ReceiveLineItem[] = (data.lines || []).map((l: any) => ({
        id: l.id,
        itemId: l.itemId,
        itemName: l.itemName,
        orderedQuantity: l.orderedQuantity,
        receivedQuantity: l.orderedQuantity,
        isZero: false,
        acknowledged: false,
        actionTaken: null,
      }));
      setLines(initializedLines);
    } catch (err: any) {
      setError(err.message || "Failed to load PO details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPODetails();
  }, [fetchPODetails]);

  const handleQtyChange = (index: number, value: string) => {
    const newLines = [...lines];
    const isZero = Number(value) === 0;
    const isFull = Number(value) === Number(newLines[index].orderedQuantity);
    newLines[index].receivedQuantity = value;
    newLines[index].isZero = isZero;
    newLines[index].acknowledged = true;
    newLines[index].actionTaken = isFull ? "OK" : (isZero ? "ZERO" : "MODIFIED");
    setLines(newLines);
  };

  const handleSetZero = (index: number) => {
    const newLines = [...lines];
    newLines[index].receivedQuantity = "0";
    newLines[index].isZero = true;
    newLines[index].acknowledged = true;
    newLines[index].actionTaken = "ZERO";
    setLines(newLines);
  };

  const handleSetOk = (index: number) => {
    const newLines = [...lines];
    newLines[index].receivedQuantity = newLines[index].orderedQuantity;
    newLines[index].isZero = false;
    newLines[index].acknowledged = true;
    newLines[index].actionTaken = "OK";
    setLines(newLines);
  };

  const totalItemsCount = lines.length;
  const acknowledgedCount = useMemo(() => {
    return lines.filter(l => l.acknowledged).length;
  }, [lines]);

  const allAcknowledged = totalItemsCount > 0 && acknowledgedCount === totalItemsCount;

  const handleSubmit = async () => {
    if (!id || !allAcknowledged) return;
    setSubmitting(true);
    setError("");
    
    try {
      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedLines: lines.map(l => ({
            id: l.id,
            orderedQuantity: l.orderedQuantity,
            receivedQuantity: l.receivedQuantity
          }))
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to submit goods receipt");
      }

      alert("Goods received successfully.");
      router.push(`/purchasing/reports?type=goods_received${organizationId ? `&organizationId=${organizationId}` : ""}${locationId ? `&locationId=${locationId}` : ""}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while confirming receipt");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "#64748b", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "16px", fontWeight: 600 }}>Loading Purchase Order details...</div>
      </div>
    );
  }

  if (error && !po) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "600px", margin: "40px auto", textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "24px" }}>
          <AlertCircle size={36} color="#dc2626" style={{ margin: "0 auto 12px auto" }} />
          <h2 style={{ fontSize: "18px", color: "#991b1b", margin: "0 0 8px 0" }}>Failed to Load Purchase Order</h2>
          <p style={{ fontSize: "13px", color: "#7f1d1d", margin: "0 0 16px 0" }}>{error}</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={fetchPODetails}
              style={{
                padding: "8px 16px",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              Retry
            </button>
            <Link
              href={`/purchasing/reports${tenantQuery}`}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "12px",
                textDecoration: "none"
              }}
            >
              Back to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const poNumberDisplay = po?.poNumber || `#${(po?.id || "").substring(0, 8).toUpperCase()}`;

  return (
    <div style={{
      backgroundColor: "#f8fafc",
      minHeight: "100vh",
      padding: "24px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Back Link */}
        <div style={{ marginBottom: "16px" }}>
          <Link
            href={`/purchasing/reports?type=pending_receipts${organizationId ? `&organizationId=${organizationId}` : ""}${locationId ? `&locationId=${locationId}` : ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#64748b",
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0"
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Pending Receipts</span>
          </Link>
        </div>

        {/* Header Card */}
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #edf2f7",
          borderRadius: "10px",
          padding: "20px 24px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <PackageCheck size={22} color="#2563eb" />
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Receive Goods Against PO
              </h1>
            </div>
            <p style={{ color: "#64748b", fontSize: "13px", margin: "4px 0 0 0" }}>
              PO: <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>{poNumberDisplay}</strong> • Vendor: <strong style={{ color: "#0f172a" }}>{vendorName}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              padding: "5px 12px",
              backgroundColor: allAcknowledged ? "#dcfce7" : "#fff7ed",
              color: allAcknowledged ? "#16a34a" : "#c2410c",
              border: allAcknowledged ? "1px solid #bbf7d0" : "1px solid #fed7aa",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px"
            }}>
              {allAcknowledged ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>All Items Verified</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} />
                  <span>Verification: {acknowledgedCount} / {totalItemsCount}</span>
                </>
              )}
            </span>

            <div style={{
              padding: "5px 12px",
              backgroundColor: "#dbeafe",
              color: "#1d4ed8",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase"
            }}>
              Status: {(po?.status || "").replace(/_/g, " ").toUpperCase()}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {/* Lines Table Card */}
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #edf2f7",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#fafbfc"
          }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
              Purchase Order Items Verification
            </span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Please check each item individually to unlock confirmation
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <tr>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Item Name</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Ordered Qty</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Received Qty</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Verification Status</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const isAck = line.acknowledged;
                const action = line.actionTaken;

                return (
                  <tr 
                    key={line.id} 
                    style={{ 
                      borderBottom: idx === lines.length - 1 ? "none" : "1px solid #f1f5f9",
                      backgroundColor: !isAck ? "#ffffff" : (action === "OK" ? "#f0fdf4" : (action === "ZERO" ? "#fef2f2" : "#fffbeb")),
                      transition: "background-color 0.15s ease"
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b" }}>
                      {line.itemName}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#0f172a" }}>
                      {line.orderedQuantity}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.receivedQuantity}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        style={{ 
                          width: "110px", 
                          padding: "7px 10px", 
                          borderRadius: "6px", 
                          border: line.isZero ? "1px solid #f87171" : (isAck ? "1px solid #86efac" : "1px solid #cbd5e1"), 
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 600,
                          backgroundColor: line.isZero ? "#fee2e2" : "#ffffff",
                          color: line.isZero ? "#b91c1c" : "#0f172a"
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {!isAck ? (
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          fontSize: "11px",
                          fontWeight: 600
                        }}>
                          Pending Check
                        </span>
                      ) : action === "OK" ? (
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#dcfce7",
                          color: "#16a34a",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          ✓ All OK ({line.receivedQuantity})
                        </span>
                      ) : action === "ZERO" ? (
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          ✕ Not Received (0)
                        </span>
                      ) : (
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#fef3c7",
                          color: "#b45309",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          ✎ Modified ({line.receivedQuantity})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button 
                          type="button"
                          onClick={() => handleSetOk(idx)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: action === "OK" ? "#16a34a" : "#dcfce7",
                            color: action === "OK" ? "#ffffff" : "#16a34a",
                            border: action === "OK" ? "1px solid #15803d" : "1px solid #bbf7d0",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 700,
                            boxShadow: action === "OK" ? "0 1px 3px rgba(22, 163, 74, 0.3)" : "none",
                            transition: "all 0.15s ease"
                          }}
                        >
                          All OK
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleSetZero(idx)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: action === "ZERO" ? "#dc2626" : "#fee2e2",
                            color: action === "ZERO" ? "#ffffff" : "#dc2626",
                            border: action === "ZERO" ? "1px solid #b91c1c" : "1px solid #fecaca",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 700,
                            boxShadow: action === "ZERO" ? "0 1px 3px rgba(220, 38, 38, 0.3)" : "none",
                            transition: "all 0.15s ease"
                          }}
                        >
                          Not Received
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div style={{
            padding: "16px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            backgroundColor: "#fafbfc"
          }}>
            {!allAcknowledged ? (
              <span style={{ fontSize: "12px", color: "#c2410c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={15} />
                <span>Please acknowledge all {totalItemsCount} items ({totalItemsCount - acknowledgedCount} remaining) before confirming receipt.</span>
              </span>
            ) : (
              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={15} />
                <span>All {totalItemsCount} items verified. Ready to record in inventory ledger.</span>
              </span>
            )}

            <button 
              type="button"
              onClick={handleSubmit}
              disabled={!allAcknowledged || submitting}
              style={{
                backgroundColor: allAcknowledged ? "#2563eb" : "#cbd5e1",
                color: allAcknowledged ? "#ffffff" : "#64748b",
                padding: "10px 24px",
                borderRadius: "6px",
                border: "none",
                cursor: (!allAcknowledged || submitting) ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "13px",
                boxShadow: allAcknowledged ? "0 2px 4px rgba(37, 99, 235, 0.25)" : "none",
                transition: "all 0.2s ease"
              }}
              title={!allAcknowledged ? `Please verify all ${totalItemsCount} items to enable confirmation` : "Confirm Goods Receipt"}
            >
              {submitting ? "Processing..." : (
                allAcknowledged 
                  ? "Confirm Goods Receipt" 
                  : `Verify All Items to Confirm (${acknowledgedCount}/${totalItemsCount})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
