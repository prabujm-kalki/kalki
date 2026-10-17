"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet } from "@/lib/api";
import { VendorForm } from "./VendorForm";

import { Plus, Store, ChevronRight, Phone, Mail, User } from "lucide-react";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { KalkiSection } from "@/components/ui/KalkiSection";

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
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 className="kalki-page-title" style={{ fontSize: "22px", margin: 0 }}>
              Vendor Master
            </h1>
            <p className="kalki-page-description" style={{ marginTop: "4px" }}>
              Manage suppliers, their catalogues, rates, and purchase schedules ({selected.organizationName} · {selected.locationName})
            </p>
          </div>
          <div>
            {!showForm && (
              <KalkiButton 
                variant="primary" 
                onClick={() => setShowForm(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> Add Vendor
              </KalkiButton>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div style={{ marginBottom: "24px" }}>
          <VendorForm
            organizationId={selected.organizationId}
            locationId={selected.locationId}
            onCancel={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {vendors.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", backgroundColor: "#fff", border: "1px solid var(--kalki-border)", borderRadius: "8px", color: "var(--kalki-text-secondary)" }}>
          No active vendors found. Click &quot;Add Vendor&quot; above to create your first vendor.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {vendors.items.map((vendor) => (
            <Link 
              key={vendor.id} 
              href={`/purchasing/vendors/${vendor.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div 
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid var(--kalki-border)",
                  borderRadius: "8px",
                  padding: "16px",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  height: "100%",
                  boxSizing: "border-box"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--kalki-primary)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--kalki-border)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "var(--kalki-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Store size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--kalki-text-primary)" }}>
                        {vendor.name}
                      </h3>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: vendor.isActive ? "#16a34a" : "#dc2626" }}>
                        {vendor.isActive ? "● Active" : "○ Inactive"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#94a3b8" />
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--kalki-text-secondary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={13} />
                    <span>{vendor.contactDetails?.name || "No contact specified"}</span>
                  </div>
                  {vendor.contactDetails?.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone size={13} />
                      <span>{vendor.contactDetails.phone}</span>
                    </div>
                  )}
                  {vendor.contactDetails?.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Mail size={13} />
                      <span>{vendor.contactDetails.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
