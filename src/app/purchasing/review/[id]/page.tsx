"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, X, Check } from "lucide-react";

interface POLineItem {
  id: string;
  itemId: string;
  itemName: string;
  orderedQuantity: string;
  unitRate: string;
  unitOfMeasure?: string;
  editQuantity: string;
}

export default function POReviewPage() {
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
  const [lines, setLines] = useState<POLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

      const initializedLines: POLineItem[] = (data.lines || []).map((l: any) => ({
        id: l.id,
        itemId: l.itemId,
        itemName: l.itemName || "Item",
        orderedQuantity: String(l.orderedQuantity || 0),
        unitRate: String(l.unitRate || 0),
        unitOfMeasure: l.unitOfMeasure || "",
        editQuantity: String(l.orderedQuantity || 0),
      }));

      setLines(initializedLines);
    } catch (err: any) {
      console.error("Error loading PO details:", err);
      setError(err.message || "Failed to load PO details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPODetails();
  }, [fetchPODetails]);

  const handleUpdateQty = (index: number, val: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], editQuantity: val };
      return updated;
    });
  };

  const handleDecision = async (action: "accept" | "reject") => {
    if (!id) return;
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const apiLines = lines.map((l) => ({
        itemId: l.itemId,
        orderedQuantity: l.editQuantity,
        unitRate: l.unitRate,
      }));

      const res = await fetch(`/api/purchase-orders/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: apiLines, action }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to ${action} PO`);
      }

      setSuccessMsg(action === "accept" ? "Purchase Order Approved successfully!" : "Purchase Order has been Rejected.");
      setTimeout(() => {
        router.push(`/purchasing/dashboard${tenantQuery}`);
      }, 1200);
    } catch (err: any) {
      console.error(`Error during PO ${action}:`, err);
      setError(err.message || `An error occurred while trying to ${action} PO.`);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = lines.reduce(
    (acc, l) => acc + ((Number(l.editQuantity) || 0) * (Number(l.unitRate) || 0)),
    0
  );

  return (
    <div style={{
      backgroundColor: "#f8fafc",
      minHeight: "100vh",
      padding: "24px 32px 60px 32px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Back button */}
      <div style={{ marginBottom: "16px" }}>
        <Link
          href={`/purchasing/dashboard${tenantQuery}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none"
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Purchase Dashboard</span>
        </Link>
      </div>

      {/* Main Container */}
      <div style={{
        maxWidth: "960px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Review & Approve Purchase Order
              </h1>
              {po?.status && (
                <span style={{
                  padding: "2px 8px",
                  borderRadius: "99px",
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: "#fef3c7",
                  color: "#b45309"
                }}>
                  {String(po.status).replace(/_/g, " ").toUpperCase()}
                </span>
              )}
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
              PO Number: <strong>{po?.poNumber || id}</strong> • Vendor: <strong>{vendorName}</strong>
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px" }}>
          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "13px",
              marginBottom: "20px"
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              fontSize: "13px",
              marginBottom: "20px"
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px auto", display: "block" }} />
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Loading PO line items for review...</div>
            </div>
          ) : lines.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <AlertCircle size={32} style={{ margin: "0 auto 10px auto", color: "#f59e0b" }} />
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b" }}>No line items found</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>This purchase order contains no items to review.</div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "16px", fontSize: "13px", color: "#475569" }}>
                Verify items, review or adjust quantities if needed, then confirm approval:
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Item Description</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569", width: "160px" }}>Ordered Quantity</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#475569", width: "130px" }}>Unit Rate</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#475569", width: "140px" }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineTotal = (Number(line.editQuantity) || 0) * (Number(line.unitRate) || 0);
                      return (
                        <tr key={line.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0f172a" }}>
                            {line.itemName}
                          </td>
                          <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={line.editQuantity}
                                onChange={(e) => handleUpdateQty(idx, e.target.value)}
                                style={{
                                  width: "80px",
                                  padding: "6px 8px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  textAlign: "right"
                                }}
                              />
                              <span style={{ fontSize: "12px", color: "#64748b" }}>{line.unitOfMeasure || ""}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748b" }}>
                            ₹{Number(line.unitRate || 0).toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                            ₹{lineTotal.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                      <td colSpan={3} style={{ padding: "14px 16px", fontWeight: 700, textAlign: "right", color: "#0f172a" }}>
                        Grand Total:
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, textAlign: "right", color: "#0f172a", fontSize: "16px" }}>
                        ₹{totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Action Buttons */}
              <div style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                alignItems: "center"
              }}>
                <button
                  type="button"
                  onClick={() => router.push(`/purchasing/dashboard${tenantQuery}`)}
                  style={{
                    padding: "9px 18px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("reject")}
                  disabled={submitting || loading}
                  style={{
                    padding: "9px 20px",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    backgroundColor: "#fef2f2",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#dc2626",
                    cursor: submitting || loading ? "not-allowed" : "pointer"
                  }}
                >
                  {submitting ? "Processing..." : "Reject Purchase Order"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("accept")}
                  disabled={submitting || loading || lines.length === 0}
                  style={{
                    padding: "9px 24px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#16a34a",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: submitting || loading || lines.length === 0 ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 3px rgba(22, 163, 74, 0.3)"
                  }}
                >
                  {submitting ? "Approving..." : "Approve Purchase Order"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
