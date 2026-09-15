"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet } from "@/lib/api";
import { VendorForm } from "./VendorForm";

type VendorView = {
  id: string;
  name: string;
  isActive: boolean;
  contactDetails: {
    name?: string;
    phone?: string;
    email?: string;
  };
};

export function PurchasingDashboard() {
  const { selected } = useSessionView();
  const [vendors, setVendors] = useState<{ requestKey: string; items: VendorView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    const requestKey = `${selected.organizationId}:${selected.locationId}`;
    let cancelled = false;
    
    apiGet<{ items: VendorView[] }>(`/api/vendors?${query.toString()}`).then((payload) => {
      if (cancelled) return;
      setError(null);
      setVendors({ requestKey, items: payload.items });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load vendors" });
    });
    
    return () => {
      cancelled = true;
    };
  }, [selected, refreshKey]);

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view vendors.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!vendors || vendors.requestKey !== requestKey) return <StatusMessage tone="loading">Loading vendors…</StatusMessage>;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Purchasing & Vendor Master</p>
            <h2>Vendors</h2>
            <p>{selected.organizationName} · {selected.locationName}</p>
          </div>
          <div>
            <span className="muted" style={{ marginRight: "1rem" }}>{vendors.items.length} total</span>
            {!showForm && <button type="button" className="action-button" onClick={() => setShowForm(true)}>Add Vendor</button>}
          </div>
        </div>
        <p className="muted">Manage suppliers, their catalogues, and purchase schedules.</p>
      </section>

      {showForm && (
        <VendorForm
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          onCancel={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {vendors.items.length === 0 ? (
        <StatusMessage tone="empty">No active vendors found.</StatusMessage>
      ) : (
        <div className="work-list">
          {vendors.items.map((vendor) => (
            <Link 
              key={vendor.id} 
              className="panel work-link" 
              style={{ display: "block", textDecoration: "none" }}
              href={`/purchasing/vendors/${vendor.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
            >
              <div className="panel-header">
                <h3>{vendor.name}</h3>
                <span className="muted">View Catalogue →</span>
              </div>
              <p className="muted">
                {vendor.contactDetails?.name || "No contact name"} 
                {vendor.contactDetails?.phone ? ` · ${vendor.contactDetails.phone}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
