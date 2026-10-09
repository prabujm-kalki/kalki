import React from "react";
import RefundsList from "@/components/sales/RefundsList";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const locationId = params.locationId as string;
  const organizationId = params.organizationId as string;

  if (!locationId || !organizationId) {
    return (
      <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", color: "#b91c1c", margin: "1.5rem" }}>
        <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: "500" }}>Missing Context</p>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
          Missing organization or location context. Please select a location from the global selector.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="kalki-module-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Refunds Ledger</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Master log of all processed cash refunds for credit notes</p>
        </div>
      </div>
      
      <RefundsList locationId={locationId} organizationId={organizationId} />
    </div>
  );
}