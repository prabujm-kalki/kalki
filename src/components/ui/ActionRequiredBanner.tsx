"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Check, X, RefreshCw, AlertCircle, FileCheck, AlertTriangle } from "lucide-react";
import type { GlobalPendingTaskItem } from "@/app/actions/pending-tasks";
import { auditSpotPurchase } from "@/app/purchasing/actions";

interface ActionRequiredBannerProps {
  initialTasks?: GlobalPendingTaskItem[];
  tasks?: GlobalPendingTaskItem[];
  onTaskResolved?: (taskId: string) => void;
  style?: React.CSSProperties;
}

export function ActionRequiredBanner({
  initialTasks,
  tasks: controlledTasks,
  onTaskResolved,
  style,
}: ActionRequiredBannerProps) {
  const [localTasks, setLocalTasks] = useState<GlobalPendingTaskItem[]>(initialTasks || []);
  const [reviewingPo, setReviewingPo] = useState<{ id: string; poNumber?: string; publicToken?: string | null; vendorName?: string } | null>(null);
  const [reviewLines, setReviewLines] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState<boolean>(false);
  const [submittingApproval, setSubmittingApproval] = useState<boolean>(false);

  // Allow either controlled props or internal state
  const tasks = controlledTasks !== undefined ? controlledTasks : localTasks;

  if (!tasks || tasks.length === 0) {
    return null;
  }

  const openApprovalModal = async (poId: string, title?: string, publicToken?: string | null) => {
    setReviewingPo({ id: poId, poNumber: title, publicToken });
    setLoadingLines(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/receive-details`);
      if (res.ok) {
        const data = await res.json();
        const lines = data.lines || [];
        setReviewLines(
          lines.map((l: any) => ({
            ...l,
            editQuantity: l.orderedQuantity != null ? String(l.orderedQuantity) : "1",
            unitRate: l.unitRate != null ? String(l.unitRate) : "0",
          }))
        );
        if (data.vendorName) {
          setReviewingPo({
            id: poId,
            poNumber: data.po?.poNumber || title,
            publicToken: data.po?.publicToken || publicToken,
            vendorName: data.vendorName,
          });
        }
      } else if (publicToken) {
        const pubRes = await fetch(`/api/public/po?token=${publicToken}`);
        if (pubRes.ok) {
          const data = await pubRes.json();
          const lines = data.lines || [];
          setReviewLines(
            lines.map((l: any) => ({
              ...l,
              editQuantity: l.orderedQuantity != null ? String(l.orderedQuantity) : "1",
              unitRate: l.unitRate != null ? String(l.unitRate) : "0",
            }))
          );
        } else {
          alert("Unable to fetch PO line items.");
        }
      } else {
        alert("Failed to load PO details for review.");
      }
    } catch (err: any) {
      console.error("Error opening approval modal:", err);
      alert("Error loading PO items.");
    } finally {
      setLoadingLines(false);
    }
  };

  const handleApproveAction = async (action: "accept" | "reject") => {
    if (!reviewingPo) return;
    setSubmittingApproval(true);
    try {
      const apiLines = reviewLines.map((l) => ({
        itemId: l.itemId,
        orderedQuantity: l.editQuantity,
        unitRate: l.unitRate,
      }));

      const res = await fetch(`/api/purchase-orders/${reviewingPo.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: apiLines, action }),
      });

      if (res.ok) {
        const finishedPoId = reviewingPo.id;
        setReviewingPo(null);
        // Remove task from state
        setLocalTasks((prev) => prev.filter((t) => t.poId !== finishedPoId && t.id !== `po-approval-${finishedPoId}`));
        if (onTaskResolved) {
          onTaskResolved(`po-approval-${finishedPoId}`);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Failed to ${action} PO.`);
      }
    } catch (err: any) {
      console.error(`Error during PO ${action}:`, err);
      alert(`An error occurred while trying to ${action} PO.`);
    } finally {
      setSubmittingApproval(false);
    }
  };

  return (
    <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px", ...style }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#991b1b" }}>
          <Bell size={16} />
          <span>Action Required / Pending Tasks</span>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            padding: "2px 8px",
            borderRadius: "99px",
          }}
        >
          {tasks.length} {tasks.length === 1 ? "Action" : "Actions"}
        </span>
      </div>

      {/* Task cards list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {tasks.map((task) => {
          const isTaskEscalated = Boolean(task.isEscalated || (task.type === "ROUTINE" && task.priority === "HIGH"));
          const isHigh = task.priority === "HIGH" || isTaskEscalated;
          const displayType = isTaskEscalated ? "ESCALATED" : task.type;

          return (
            <div
              key={task.id}
              style={{
                backgroundColor: isHigh ? "#fef2f2" : "#fffbeb",
                border: `1px solid ${isHigh ? "#fecaca" : "#fde68a"}`,
                borderLeft: `4px solid ${isHigh ? "#dc2626" : "#d97706"}`,
                padding: "14px 18px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    {task.title}
                  </h3>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: isHigh ? "#fee2e2" : "#fde68a",
                      color: isHigh ? "#dc2626" : "#92400e",
                      border: isHigh ? "1px solid #fca5a5" : "1px solid #fcd34d",
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    {isTaskEscalated && <AlertTriangle size={11} style={{ color: "#dc2626" }} />}
                    {displayType}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: isHigh ? "#7f1d1d" : "#475569", margin: "4px 0 0 0" }}>
                  {task.description}
                </p>
              </div>

              {task.type === "APPROVAL" && task.poId ? (
                <button
                  type="button"
                  onClick={() => openApprovalModal(task.poId!, task.title, task.publicToken)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: "#ffffff",
                    color: isHigh ? "#dc2626" : "#b45309",
                    border: `1px solid ${isHigh ? "#fecaca" : "#fde68a"}`,
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    borderRadius: "6px",
                    cursor: "pointer",
                    flexShrink: 0,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <span>{task.actionLabel}</span>
                  <ChevronRight size={13} />
                </button>
              ) : (
                <Link
                  href={task.actionUrl}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: "#ffffff",
                    color: isHigh ? "#dc2626" : "#b45309",
                    border: `1px solid ${isHigh ? "#fecaca" : "#fde68a"}`,
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    borderRadius: "6px",
                    textDecoration: "none",
                    flexShrink: 0,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <span>{task.actionLabel}</span>
                  <ChevronRight size={13} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* In-Modal Review & Approval Flow */}
      {reviewingPo && (
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
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Review & Approve Purchase Order
                </h2>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  PO: <strong>{reviewingPo.poNumber || reviewingPo.id.slice(0, 8)}</strong>
                  {reviewingPo.vendorName ? ` • Vendor: ${reviewingPo.vendorName}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingPo(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Items table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {loadingLines ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <RefreshCw
                    size={24}
                    style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px auto", display: "block" }}
                  />
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>Loading PO line items...</div>
                </div>
              ) : reviewLines.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <AlertCircle size={28} style={{ margin: "0 auto 8px auto", color: "#f59e0b" }} />
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>No items found in this purchase order.</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "12px", fontSize: "12px", color: "#64748b" }}>
                    Verify the ordered items and quantities before granting approval:
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Item Name</th>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569", width: "120px" }}>
                          Quantity
                        </th>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569", textAlign: "right", width: "100px" }}>
                          Unit Rate
                        </th>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569", textAlign: "right", width: "100px" }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewLines.map((line, idx) => {
                        const lineTotal = (Number(line.editQuantity) || 0) * (Number(line.unitRate) || 0);
                        return (
                          <tr key={line.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px", fontWeight: 500, color: "#0f172a" }}>
                              {line.itemName || "Item"}
                            </td>
                            <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line.editQuantity}
                                  onChange={(e) => {
                                    const next = [...reviewLines];
                                    next[idx].editQuantity = e.target.value;
                                    setReviewLines(next);
                                  }}
                                  style={{
                                    width: "70px",
                                    padding: "4px 8px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    textAlign: "right",
                                  }}
                                />
                                <span style={{ fontSize: "11px", color: "#64748b" }}>{line.unitOfMeasure || ""}</span>
                              </div>
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", color: "#64748b" }}>
                              ₹{Number(line.unitRate || 0).toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                              ₹{lineTotal.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #e2e8f0" }}>
                        <td colSpan={3} style={{ padding: "12px 10px", fontWeight: 700, textAlign: "right", color: "#0f172a" }}>
                          Total Amount:
                        </td>
                        <td style={{ padding: "12px 10px", fontWeight: 700, textAlign: "right", color: "#0f172a", fontSize: "14px" }}>
                          ₹
                          {reviewLines
                            .reduce((acc, l) => acc + (Number(l.editQuantity) || 0) * (Number(l.unitRate) || 0), 0)
                            .toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setReviewingPo(null)}
                style={{
                  padding: "7px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleApproveAction("reject")}
                  disabled={submittingApproval || loadingLines}
                  style={{
                    padding: "7px 16px",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    backgroundColor: "#fef2f2",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#dc2626",
                    cursor: submittingApproval || loadingLines ? "not-allowed" : "pointer",
                  }}
                >
                  {submittingApproval ? "Processing..." : "Reject PO"}
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveAction("accept")}
                  disabled={submittingApproval || loadingLines || reviewLines.length === 0}
                  style={{
                    padding: "7px 20px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#16a34a",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: submittingApproval || loadingLines || reviewLines.length === 0 ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 3px rgba(22, 163, 74, 0.3)",
                  }}
                >
                  {submittingApproval ? "Approving..." : "Approve PO"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
