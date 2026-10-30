"use client";

import React, { Suspense, useState, useRef } from "react";
import CreditNotesList from "@/components/sales/CreditNotesList";
import CreateCreditNoteModal from "@/components/sales/CreateCreditNoteModal";
import { KalkiStandardFilterBar } from "@/components/sales/KalkiStandardFilterBar";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";

function CreditNotesContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const locationId = searchParams.get("locationId");

  if (!organizationId || !locationId) {
    return (
      <div style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>
        Missing organization or location context.
      </div>
    );
  }

  // State to handle manual credit note modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // We use a small trick to force re-render/re-fetch of the list when a new note is created.
  // The CreditNotesList doesn't currently expose a loadData ref, so we can remount or trigger it.
  // Easiest way without modifying CreditNotesList is to pass a refreshKey. Let's assume we can just toggle a key.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ width: "100%", padding: "1.25rem 1.5rem" }}>
      <KalkiStandardFilterBar
        searchPlaceholder="Search credit notes by #..."
        showRangeFilter={true}
        showStatusFilter={true}
        statusOptions={[
          { label: "Open", value: "OPEN" },
          { label: "Partially Applied", value: "PARTIALLY_APPLIED" },
          { label: "Closed", value: "CLOSED" },
          { label: "Refunded", value: "REFUNDED" },
          { label: "Void", value: "VOID" },
        ]}
        actionButton={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "9px 16px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <Plus size={16} /> New Credit Note
          </button>
        }
      />

      <CreditNotesList 
        key={refreshKey}
        locationId={locationId} 
        organizationId={organizationId} 
      />

      <CreateCreditNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
        organizationId={organizationId}
        locationId={locationId}
      />
    </div>
  );
}

export default function CreditNotesPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
      <CreditNotesContent />
    </Suspense>
  );
}