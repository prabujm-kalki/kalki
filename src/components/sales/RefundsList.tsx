"use client";

import React, { useEffect, useState } from "react";
import { fetchRefundsByLocation } from "@/app/sales/actions";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { KalkiStandardFilterBar } from "@/components/sales/KalkiStandardFilterBar";

interface Refund {
  id: string;
  amount: string;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  refundDate: string | Date;
  customerName: string;
  creditNoteNumber: string;
}

interface RefundsListProps {
  organizationId: string;
  locationId: string;
}

export default function RefundsList({ organizationId, locationId }: RefundsListProps) {
  const searchParams = useSearchParams();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [organizationId, locationId, searchParams]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = searchParams.get('q') || undefined;
      const startDate = searchParams.get('from') || searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('to') || searchParams.get('endDate') || undefined;

      const res = await fetchRefundsByLocation(organizationId, locationId, q, startDate, endDate);
      if (res.success && res.data) {
        setRefunds(res.data);
      } else {
        setError("Failed to fetch refunds.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while loading refunds.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Number(amount));
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#6b7280" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", color: "#b91c1c", margin: "1.5rem" }}>
        <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: "500" }}>Error</p>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>{error}</p>
        <button onClick={loadData} className="kalki-button-secondary" style={{ marginTop: "1rem" }}>Retry</button>
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div style={{ padding: "1.5rem", width: "100%", boxSizing: "border-box" }}>
        <KalkiStandardFilterBar
          searchPlaceholder="Search refunds by customer, credit note, mode..."
          showRangeFilter={true}
          showStatusFilter={false}
        />
        <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", color: "#6b7280" }}>
          <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: "500" }}>No refunds found</p>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>No processed refunds match the selected search or date filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", width: "100%", boxSizing: "border-box" }}>
      <KalkiStandardFilterBar
        searchPlaceholder="Search refunds by customer, credit note, mode..."
        showRangeFilter={true}
        showStatusFilter={false}
      />

      <div className="card" style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontSize: "0.75rem", textTransform: "uppercase" }}>
            <tr>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Date</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Customer</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Credit Note Ref</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Payment Method</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Reference</th>
              <th style={{ padding: "1rem", fontWeight: "600", textAlign: "right" }}>Amount Refunded</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((refund) => (
              <tr key={refund.id} style={{ borderBottom: "1px solid #f3f4f6", color: "#374151" }}>
                <td style={{ padding: "1rem" }}>
                  {new Date(refund.refundDate).toLocaleDateString()}
                </td>
                <td style={{ padding: "1rem", fontWeight: "500", color: "#111827" }}>
                  {refund.customerName}
                </td>
                <td style={{ padding: "1rem" }}>
                  {refund.creditNoteNumber}
                </td>
                <td style={{ padding: "1rem" }}>
                  {refund.paymentMethod.replace("_", " ")}
                </td>
                <td style={{ padding: "1rem", color: "#6b7280" }}>
                  {refund.referenceNumber || "-"}
                </td>
                <td style={{ padding: "1rem", fontWeight: "600", color: "#b91c1c", textAlign: "right" }}>
                  {formatCurrency(refund.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
