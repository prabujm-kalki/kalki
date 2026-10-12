"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { validateAudienceList, createMarketingTemplate } from "@/app/crm/templates/actions";

export interface DisplayItem {
  id: string;
  name?: string;
  contact?: string;
  totalOrders?: number;
  avgBillValue?: number;
  lastVisitDate?: string;
  totalRevenue?: number;
  [key: string]: any;
}

export interface GlobalTemplateModalProps {
  organizationId: string;
  locationId?: string;
  targetEntityType: string; // e.g. 'CUSTOMER', 'ITEM', 'VENDOR', 'EMPLOYEE'
  entityIds?: string[];
  displayData?: DisplayItem[];
  // Backwards compatibility props
  customers?: DisplayItem[];
  defaultTemplateName?: string;
  onClose: () => void;
}

export function GlobalTemplateModal({
  organizationId,
  locationId,
  targetEntityType = "CUSTOMER",
  entityIds,
  displayData,
  customers,
  defaultTemplateName,
  onClose,
}: GlobalTemplateModalProps) {
  // Normalize items to display
  const items: DisplayItem[] = displayData || customers || [];
  const normalizedEntityIds: string[] = entityIds || items.map((item) => item.id);

  const [templateName, setTemplateName] = useState(defaultTemplateName || "");
  const [cycleDuration, setCycleDuration] = useState(1);
  const [validationData, setValidationData] = useState<
    Record<string, { isEligible: boolean; activeTemplateName?: string }>
  >({});
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const router = useRouter();

  useEscapeKey(onClose);

  useEffect(() => {
    if (defaultTemplateName && defaultTemplateName.endsWith("_1")) {
      const basePrefix = defaultTemplateName.substring(0, defaultTemplateName.length - 2);
      import("@/app/crm/templates/actions").then(({ getNextTemplateName }) => {
        getNextTemplateName(basePrefix).then((name) => {
          setTemplateName(name);
        });
      });
    }
  }, [defaultTemplateName]);

  useEffect(() => {
    async function checkEligibility() {
      if (normalizedEntityIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const results = await validateAudienceList(targetEntityType, normalizedEntityIds);

        const validMap: Record<string, { isEligible: boolean; activeTemplateName?: string }> = {};
        const preSelected = new Set<number>();

        results.forEach((res) => {
          validMap[res.targetEntityId] = {
            isEligible: res.isEligible,
            activeTemplateName: res.activeTemplateName,
          };
        });

        items.forEach((item, idx) => {
          if (validMap[item.id]?.isEligible) {
            preSelected.add(idx);
          }
        });

        setValidationData(validMap);
        setSelectedIndices(preSelected);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    checkEligibility();
  }, [targetEntityType, items.length]);

  const toggleItem = (idx: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedIndices(newSet);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allEligible = items
        .map((item, idx) => ({ id: item.id, idx }))
        .filter((item) => validationData[item.id]?.isEligible)
        .map((item) => item.idx);
      setSelectedIndices(new Set(allEligible));
    } else {
      setSelectedIndices(new Set());
    }
  };

  const eligibleCount = items.filter((item) => validationData[item.id]?.isEligible).length;
  const isAllSelected = eligibleCount > 0 && selectedIndices.size === eligibleCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!templateName) {
      setError("Template name is required.");
      return;
    }

    if (selectedIndices.size === 0) {
      setError(`Please select at least one ${targetEntityType.toLowerCase()}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Map selected indices back to entity UUIDs (deduplicating using Set)
      const uniqueIdsToSubmit = Array.from(
        new Set(Array.from(selectedIndices).map((idx) => items[idx]?.id || normalizedEntityIds[idx]))
      );

      await createMarketingTemplate({
        organizationId,
        locationId,
        name: templateName,
        cycleDurationWeeks: cycleDuration,
        targetEntityType,
        entityIds: uniqueIdsToSubmit,
      });

      setEnrolledCount(selectedIndices.size);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsSubmitting(false);
    }
  };

  // Human-readable labels depending on polymorphic target type
  const entityLabel =
    targetEntityType === "CUSTOMER"
      ? "Customer"
      : targetEntityType === "ITEM"
      ? "Item"
      : targetEntityType === "VENDOR"
      ? "Vendor"
      : targetEntityType === "EMPLOYEE"
      ? "Employee"
      : "Target";

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          padding: "24px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        }}
      >
        {!isSuccess && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        )}

        {isSuccess ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                backgroundColor: "#dcfce7",
                color: "#166534",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px auto",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2
              style={{
                marginTop: 0,
                color: "#1e293b",
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "12px",
              }}
            >
              Template Created!
            </h2>
            <p style={{ color: "#64748b", fontSize: "1rem", marginBottom: "32px" }}>
              Your marketing template <strong>{templateName}</strong> has been successfully created with{" "}
              {enrolledCount} {entityLabel.toLowerCase()}(s) enrolled.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  color: "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={() =>
                  router.push(
                    `/crm/templates?organizationId=${organizationId}${
                      locationId ? `&locationId=${locationId}` : ""
                    }`
                  )
                }
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "6px",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                View Templates
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0, color: "#1e293b", fontSize: "1.25rem", fontWeight: 600 }}>
              Create Marketing Template ({entityLabel})
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "24px" }}>
              Enroll targets into a new campaign cycle. Spam protection is active.
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "24px",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#334155",
                      marginBottom: "8px",
                    }}
                  >
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={`e.g., DORMANT_${entityLabel.toUpperCase()}_20261011_1`}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ width: "150px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#334155",
                      marginBottom: "8px",
                    }}
                  >
                    Cycle (Weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cycleDuration}
                    onChange={(e) => setCycleDuration(parseInt(e.target.value) || 1)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  marginBottom: "24px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "0.875rem",
                  }}
                >
                  <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: "12px 16px", width: "40px" }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          disabled={isLoading || eligibleCount === 0}
                          style={{
                            cursor: isLoading || eligibleCount === 0 ? "not-allowed" : "pointer",
                          }}
                        />
                      </th>
                      <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>
                        {entityLabel} Name
                      </th>
                      <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>
                        Contact / Details
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          color: "#475569",
                          fontWeight: 600,
                          textAlign: "center",
                        }}
                      >
                        Total Orders
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          color: "#475569",
                          fontWeight: 600,
                          textAlign: "right",
                        }}
                      >
                        Avg Bill Value
                      </th>
                      <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>
                        Last Visit / Date
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          color: "#475569",
                          fontWeight: 600,
                          textAlign: "right",
                        }}
                      >
                        Total Revenue
                      </th>
                      <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>
                        Eligibility
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ padding: "24px", textAlign: "center", color: "#64748b" }}
                        >
                          Loading eligibility status...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ padding: "24px", textAlign: "center", color: "#64748b" }}
                        >
                          No items found.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const status = validationData[item.id];
                        const isEligible = status?.isEligible ?? false;

                        return (
                          <tr
                            key={`${item.id}-${idx}`}
                            style={{
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor: isEligible ? "#ffffff" : "#f1f5f9",
                            }}
                          >
                            <td style={{ padding: "12px 16px" }}>
                              <input
                                type="checkbox"
                                checked={selectedIndices.has(idx)}
                                onChange={() => toggleItem(idx)}
                                disabled={!isEligible}
                                style={{ cursor: isEligible ? "pointer" : "not-allowed" }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: isEligible ? "#0f172a" : "#94a3b8",
                              }}
                            >
                              {item.name || "Unnamed"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: isEligible ? "#475569" : "#94a3b8",
                              }}
                            >
                              {item.contact || "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: isEligible ? "#475569" : "#94a3b8",
                                textAlign: "center",
                              }}
                            >
                              {item.totalOrders ?? "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: isEligible ? "#475569" : "#94a3b8",
                                textAlign: "right",
                              }}
                            >
                              {item.avgBillValue !== undefined
                                ? `₹${item.avgBillValue.toLocaleString("en-IN", {
                                    maximumFractionDigits: 0,
                                  })}`
                                : "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: isEligible ? "#475569" : "#94a3b8",
                              }}
                            >
                              {item.lastVisitDate || "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: isEligible ? "#0f172a" : "#94a3b8",
                                textAlign: "right",
                                fontWeight: 600,
                              }}
                            >
                              {item.totalRevenue !== undefined
                                ? `₹${item.totalRevenue.toLocaleString("en-IN", {
                                    maximumFractionDigits: 0,
                                  })}`
                                : "-"}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              {isEligible ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    backgroundColor: "#dcfce7",
                                    color: "#166534",
                                    borderRadius: "999px",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  Eligible
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "2px 8px",
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    borderRadius: "999px",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  Active in "{status?.activeTemplateName}"
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    color: "#475569",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading || selectedIndices.size === 0}
                  style={{
                    padding: "8px 16px",
                    backgroundColor:
                      isSubmitting || isLoading || selectedIndices.size === 0
                        ? "#94a3b8"
                        : "#0f172a",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontWeight: 500,
                    cursor:
                      isSubmitting || isLoading || selectedIndices.size === 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {isSubmitting
                    ? "Saving..."
                    : `Create Template (${selectedIndices.size})`}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Backwards-compatible export alias
export const AudienceSelectorModal = GlobalTemplateModal;
