"use client";

import React, { useEffect, useState } from "react";
import { fetchCreditNotesByLocation } from "@/app/sales/actions"; 
import { MoreVertical, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import SearchFilterBar from "@/components/sales/SearchFilterBar";
import Pagination from "@/components/sales/Pagination";
import ApplyCreditModal from "./ApplyCreditModal";
import ProcessRefundModal from "./ProcessRefundModal";

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  totalAmount: string;
  remainingBalance: string;
  status: string;
  issueDate: string | Date;
  customerId: string;
  applications?: any[];
}

interface CreditNotesListProps {
  locationId: string;
  organizationId: string;
}

export default function CreditNotesList({ locationId, organizationId }: CreditNotesListProps) {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [noteToRefund, setNoteToRefund] = useState<CreditNote | null>(null);

  const searchParams = useSearchParams();
  const [total, setTotal] = useState(0);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const handleRefund = async (noteId: string) => {
    try {
      setRefundingId(noteId);
      // const res = await refundCreditNote(noteId); // Ensure this function is correctly imported if needed, skipping for now
      // if (res.success) {
      //   loadData();
      // }
    } catch (err: any) {
      alert(err.message || "Failed to process refund");
    } finally {
      setRefundingId(null);
      setActionMenuOpen(null);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const q = searchParams.get('q') || undefined;
      const page = parseInt(searchParams.get('page') || '1', 10);
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;

      let finalStartDate = startDate;
      let finalEndDate = endDate;
      if (!finalStartDate || !finalEndDate) {
        const dEnd = new Date();
        const dStart = new Date();
        dStart.setDate(dEnd.getDate() - 15);
        finalStartDate = finalStartDate || dStart.toISOString().split('T')[0];
        finalEndDate = finalEndDate || dEnd.toISOString().split('T')[0];
      }

      const res = await fetchCreditNotesByLocation(locationId, organizationId, q, page, 10, finalStartDate, finalEndDate);
      if (res.success) {
        setCreditNotes(res.data);
        setTotal(res.total || 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load credit notes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (locationId && organizationId) {
      loadData();
    }
  }, [locationId, organizationId, searchParams]);

  const getStatusBadge = (status: string) => {
    let bgColor = "#f3f4f6";
    let color = "#4b5563";
    let label = status;

    if (status === "OPEN") {
      bgColor = "#dcfce7";
      color = "#166534";
      label = "Open";
    } else if (status === "PARTIALLY_APPLIED") {
      bgColor = "#fef08a";
      color = "#854d0e";
      label = "Partially Applied";
    } else if (status === "CLOSED" || status === "VOID") {
      bgColor = "#fee2e2";
      color = "#991b1b";
      label = status === "CLOSED" ? "Closed" : "Void";
    }

    return (
      <span
        style={{
          padding: "0.25rem 0.6rem",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: "600",
          backgroundColor: bgColor,
          color: color,
        }}
      >
        {label}
      </span>
    );
  };

  const formatCurrency = (amount: string | number) => {
    return `₹ ${Number(amount).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div style={{ padding: "3rem", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "1rem", color: "#6b7280" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
        <p>Loading credit notes...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ margin: "1.5rem", padding: "1rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "0.375rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <AlertCircle size={20} />
        <p style={{ margin: 0, fontWeight: "500" }}>{error}</p>
      </div>
    );
  }

  if (creditNotes.length === 0) {
    return (
      <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", color: "#6b7280", margin: "1.5rem" }}>
        <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: "500" }}>No Credit Notes Found</p>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>There are currently no credit notes associated with this location.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", width: "100%", boxSizing: "border-box" }}>
      <div className="card" style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)", overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontSize: "0.75rem", textTransform: "uppercase" }}>
            <tr>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Date</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Credit Note #</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Total Amount</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Remaining Balance</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Status</th>
              <th style={{ padding: "1rem", fontWeight: "600", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {creditNotes.map((note, idx) => (
              <React.Fragment key={note.id}>
                <tr style={{ borderBottom: "1px solid #f3f4f6", color: "#374151" }}>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button 
                        onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 0 }}
                      >
                        {expandedNoteId === note.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      {new Date(note.issueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "500", color: "#111827" }}>
                    {note.creditNoteNumber}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {formatCurrency(note.totalAmount)}
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "500" }}>
                    {formatCurrency(note.remainingBalance)}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {getStatusBadge(note.status)}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === note.id ? null : note.id)}
                        style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "0.25rem" }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {actionMenuOpen === note.id && (
                        <div style={{ position: "absolute", right: "0", top: "100%", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.375rem", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 10, width: "160px", display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
                          <button
                            onClick={() => {
                              setSelectedCreditNote(note);
                              setIsApplyModalOpen(true);
                              setActionMenuOpen(null);
                            }}
                            style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: note.status === "CLOSED" || note.status === "VOID" || note.status === "REFUNDED" ? "not-allowed" : "pointer", fontSize: "0.875rem", color: note.status === "CLOSED" || note.status === "VOID" || note.status === "REFUNDED" ? "#9ca3af" : "#374151", width: "100%" }}
                            disabled={note.status === "CLOSED" || note.status === "VOID" || note.status === "REFUNDED"}
                          >
                            Apply to Invoice
                          </button>
                          <button
                            onClick={() => {
                              setNoteToRefund(note as any);
                              setIsRefundModalOpen(true);
                              setActionMenuOpen(null);
                            }}
                            style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: Number(note.remainingBalance) <= 0 || note.status === "REFUNDED" ? "not-allowed" : "pointer", fontSize: "0.875rem", color: Number(note.remainingBalance) <= 0 || note.status === "REFUNDED" ? "#9ca3af" : "#d97706", width: "100%", borderTop: "1px solid #f3f4f6" }}
                            disabled={Number(note.remainingBalance) <= 0 || note.status === "REFUNDED"}
                          >
                            Process Refund
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedNoteId === note.id && (
                  <tr style={{ backgroundColor: "#f9fafb" }}>
                    <td colSpan={6} style={{ padding: "1.5rem" }}>
                      <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Audit Trail - Applications</h4>
                      {note.applications && note.applications.length > 0 ? (
                        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
                          <thead style={{ backgroundColor: "#f3f4f6", fontSize: "0.75rem", color: "#4b5563" }}>
                            <tr>
                              <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "500" }}>Date Applied</th>
                              <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "500" }}>Invoice ID</th>
                              <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "500" }}>Amount Applied</th>
                            </tr>
                          </thead>
                          <tbody>
                            {note.applications.map(app => (
                              <tr key={app.id} style={{ borderTop: "1px solid #e5e7eb", fontSize: "0.875rem", color: "#374151" }}>
                                <td style={{ padding: "0.75rem" }}>{new Date(app.appliedAt).toLocaleString()}</td>
                                <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>{app.appliedToInvoiceId}</td>
                                <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "500" }}>{formatCurrency(app.appliedAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>No applications found for this credit note yet.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <Pagination totalPages={Math.ceil(total / 10)} currentPage={parseInt(searchParams.get("page") || "1", 10)} />
      </div>
      
      <ApplyCreditModal 
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        creditNote={selectedCreditNote}
        onSuccess={() => {
          loadData(); 
        }}
        organizationId={organizationId}
        locationId={locationId}
      />

      <ProcessRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        creditNote={noteToRefund as any}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
