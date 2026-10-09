"use client";

import { useSessionView } from "@/components/AppShell";
import CreditNotesList from "@/components/sales/CreditNotesList";

export default function CreditNotesPage() {
  const { selected } = useSessionView();

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <h1 className="kalki-page-title">Credit Notes & Refunds</h1>
        <p className="kalki-page-description">View issued refunds or sales returns (Reduces Accounts Receivable)</p>
      </div>

      <div style={{ marginTop: "16px" }}>
        {selected?.organizationId && selected?.locationId ? (
          <CreditNotesList 
            organizationId={selected.organizationId} 
            locationId={selected.locationId} 
          />
        ) : (
          <div style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>
            Loading context...
          </div>
        )}
      </div>
    </div>
  );
}
