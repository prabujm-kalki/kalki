"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchVendorBalances } from "@/app/finance/payables-actions";

export function VendorBalancesClient() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [organizationId]);

  async function loadData() {
    setLoading(true);
    const res = await fetchVendorBalances(organizationId!);
    if (res.success) {
      setData(res.data);
    }
    setLoading(false);
  }

  if (!organizationId) {
    return <div style={{ padding: "2rem", color: "var(--kalki-text-secondary)" }}>Please select a session from the top bar.</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0, color: "var(--kalki-text-primary)" }}>
          Vendor Balances
        </h1>
      </div>

      <div style={{ backgroundColor: "var(--kalki-bg-primary)", border: "1px solid var(--kalki-border)", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--kalki-border)", backgroundColor: "var(--kalki-bg-secondary)", fontSize: "0.875rem", color: "var(--kalki-text-secondary)" }}>
              <th style={{ padding: "1rem" }}>Vendor Name</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Total Billed</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Total Paid</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Debit Notes</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Outstanding Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>Loading balances...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>No vendor balances found.</td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.vendorId} style={{ borderBottom: "1px solid var(--kalki-border)" }}>
                  <td style={{ padding: "1rem", color: "var(--kalki-text-primary)", fontWeight: 500 }}>{row.vendorName}</td>
                  <td style={{ padding: "1rem", textAlign: "right", color: "var(--kalki-text-secondary)" }}>₹{Number(row.totalBilled).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: "1rem", textAlign: "right", color: "var(--kalki-success)" }}>₹{Number(row.totalPayments).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: "1rem", textAlign: "right", color: "var(--kalki-warning)" }}>₹{Number(row.totalDebitNotes).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: "1rem", textAlign: "right", fontWeight: 600, color: Number(row.currentBalance) > 0 ? "var(--kalki-danger)" : "var(--kalki-text-primary)" }}>
                    ₹{Number(row.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
