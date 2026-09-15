"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
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
  paymentTerms: string | null;
  creditDays: number | null;
};

type VendorItemView = {
  id: string;
  itemName: string;
  itemCode: string | null;
  unitOfMeasure: string;
  normalQuantity: string | null;
  minimumStock: string | null;
  lastRate: string | null;
};

type PurchaseScheduleView = {
  id: string;
  responsibleRoleId: string;
  frequencyRule: string;
  reminderTime: string;
};

type RoleView = {
  id: string;
  name: string;
};

export function VendorProfile({ vendorId }: { vendorId: string }) {
  const { selected } = useSessionView();
  const [vendor, setVendor] = useState<{ requestKey: string; data: VendorView } | null>(null);
  const [items, setItems] = useState<{ requestKey: string; list: VendorItemView[] } | null>(null);
  const [schedules, setSchedules] = useState<{ requestKey: string; list: PurchaseScheduleView[] } | null>(null);
  const [roles, setRoles] = useState<{ requestKey: string; list: RoleView[] } | null>(null);
  
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showItemForm, setShowItemForm] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  async function deactivateVendor() {
    if (!selected || !vendor?.data) return;
    if (!confirm("Are you sure you want to deactivate this vendor?")) return;
    setIsDeactivating(true);
    try {
      await apiSend(`/api/vendors?id=${vendor.data.id}`, "PATCH", {
        isActive: false
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    const requestKey = `${selected.organizationId}:${selected.locationId}:${vendorId}`;
    let cancelled = false;

    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    
    Promise.all([
      apiGet<{ items: VendorView[] }>(`/api/vendors?${query.toString()}`),
      apiGet<{ items: VendorItemView[] }>(`/api/vendor-items?${query.toString()}&vendorId=${vendorId}`),
      apiGet<{ items: PurchaseScheduleView[] }>(`/api/purchase-schedules?${query.toString()}&vendorId=${vendorId}`),
      apiGet<{ roles: RoleView[] }>(`/api/role-definitions?${query.toString()}`)
    ]).then(([vendorsPayload, itemsPayload, schedulesPayload, rolesPayload]) => {
      if (cancelled) return;
      setError(null);
      const v = vendorsPayload.items.find((v) => v.id === vendorId);
      if (v) {
        setVendor({ requestKey, data: v });
      } else {
        setError({ requestKey, message: "Vendor not found" });
      }
      setItems({ requestKey, list: itemsPayload.items });
      setSchedules({ requestKey, list: schedulesPayload.items });
      setRoles({ requestKey, list: rolesPayload.roles });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load vendor profile" });
    });

    return () => {
      cancelled = true;
    };
  }, [selected, vendorId, refreshKey]);

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setAddingItem(true);
    setItemError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await apiSend("/api/vendor-items", "POST", {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        vendorId,
        itemName: formData.get("itemName") as string,
        itemCode: formData.get("itemCode") as string || undefined,
        unitOfMeasure: formData.get("unitOfMeasure") as string,
        normalQuantity: formData.get("normalQuantity") as string || undefined,
        minimumStock: formData.get("minimumStock") as string || undefined,
      });
      setShowItemForm(false);
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      setItemError(caught instanceof Error ? caught.message : "Failed to add item");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleAddSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setAddingSchedule(true);
    setScheduleError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await apiSend("/api/purchase-schedules", "POST", {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        vendorId,
        responsibleRoleId: formData.get("responsibleRoleId") as string,
        frequencyRule: formData.get("frequencyRule") as string,
        reminderTime: formData.get("reminderTime") as string,
      });
      setShowScheduleForm(false);
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      setScheduleError(caught instanceof Error ? caught.message : "Failed to add schedule");
    } finally {
      setAddingSchedule(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view profile.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}:${vendorId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!vendor || vendor.requestKey !== requestKey || !items || !schedules || !roles) return <StatusMessage tone="loading">Loading vendor profile…</StatusMessage>;

  const v = vendor.data;

  return (
    <div className="stack">
      <Link href={`/purchasing?organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="nav-link" style={{ alignSelf: "flex-start" }}>
        ← Back to Vendors
      </Link>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Vendor Profile</p>
            <h2>{v.name} {v.isActive ? "" : "(Inactive)"}</h2>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="secondary-button" onClick={() => setIsEditing(true)}>Edit</button>
            {v.isActive && (
              <button className="secondary-button" style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }} onClick={() => void deactivateVendor()} disabled={isDeactivating}>
                Deactivate
              </button>
            )}
          </div>
        </div>
        {isEditing ? (
          <div style={{ marginTop: "1rem" }}>
            <VendorForm 
              organizationId={selected.organizationId}
              locationId={selected.locationId}
              initialData={v}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => {
                setIsEditing(false);
                setRefreshKey(k => k + 1);
              }}
            />
          </div>
        ) : (
          <div className="grid" style={{ marginTop: "1rem" }}>
            <div>
              <strong>Contact</strong>
              <p>{v.contactDetails.name || "N/A"}</p>
              <p>{v.contactDetails.phone || "N/A"}</p>
              <p>{v.contactDetails.email || "N/A"}</p>
            </div>
            <div>
              <strong>Commercials</strong>
              <p>Payment Terms: {v.paymentTerms || "N/A"}</p>
              <p>Credit Days: {v.creditDays !== null ? v.creditDays : "N/A"}</p>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Purchase Schedules</h3>
            <span className="muted">Automated reminders for this vendor</span>
          </div>
          {!showScheduleForm && <button type="button" className="action-button" onClick={() => setShowScheduleForm(true)}>Add Schedule</button>}
        </div>

        {showScheduleForm && (
          <form onSubmit={(e) => void handleAddSchedule(e)} style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <h4>Add New Schedule</h4>
            {scheduleError && <StatusMessage tone="error">{scheduleError}</StatusMessage>}
            <div className="grid" style={{ marginTop: "1rem" }}>
              <label>
                Responsible Role *
                <select name="responsibleRoleId" required disabled={addingSchedule || roles.list.length === 0}>
                  <option value="">Select a role...</option>
                  {roles.list.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {roles.list.length === 0 && <span className="muted" style={{fontSize: "0.8rem"}}>No roles available. Please create a role first.</span>}
              </label>
              <label>
                Frequency Rule (e.g., 'Every Monday', '1st of Month') *
                <input name="frequencyRule" required disabled={addingSchedule} />
              </label>
              <label>
                Reminder Time (e.g., '09:00 AM') *
                <input name="reminderTime" required disabled={addingSchedule} />
              </label>
            </div>
            <div className="form-actions" style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowScheduleForm(false)} disabled={addingSchedule}>Cancel</button>
              <button type="submit" className="action-button" disabled={addingSchedule || roles.list.length === 0}>
                {addingSchedule ? "Adding…" : "Add Schedule"}
              </button>
            </div>
          </form>
        )}

        {schedules.list.length === 0 ? (
          <p className="muted" style={{ marginTop: "1rem" }}>No active schedules.</p>
        ) : (
          <div className="work-list" style={{ marginTop: "1rem" }}>
            {schedules.list.map(s => {
              const roleName = roles.list.find(r => r.id === s.responsibleRoleId)?.name || "Unknown Role";
              return (
                <div key={s.id} className="panel" style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{s.frequencyRule} at {s.reminderTime}</strong>
                    <span className="muted">Role: {roleName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Predefined Item Catalogue</h3>
            <span className="muted">Items supplied by this vendor</span>
          </div>
          {!showItemForm && <button type="button" className="action-button" onClick={() => setShowItemForm(true)}>Add Item</button>}
        </div>

        {showItemForm && (
          <form onSubmit={(e) => void handleAddItem(e)} style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <h4>Add New Item to Catalogue</h4>
            {itemError && <StatusMessage tone="error">{itemError}</StatusMessage>}
            <div className="grid" style={{ marginTop: "1rem" }}>
              <label>
                Item Name *
                <input name="itemName" required disabled={addingItem} />
              </label>
              <label>
                Item Code
                <input name="itemCode" disabled={addingItem} />
              </label>
              <label>
                Unit of Measure (e.g. kg, L, pcs) *
                <input name="unitOfMeasure" required disabled={addingItem} />
              </label>
              <label>
                Normal Quantity Suggestion
                <input name="normalQuantity" type="number" step="0.01" disabled={addingItem} />
              </label>
              <label>
                Minimum Stock Level
                <input name="minimumStock" type="number" step="0.01" disabled={addingItem} />
              </label>
            </div>
            <div className="form-actions" style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowItemForm(false)} disabled={addingItem}>Cancel</button>
              <button type="submit" className="action-button" disabled={addingItem}>
                {addingItem ? "Adding…" : "Add Item"}
              </button>
            </div>
          </form>
        )}
        
        {items.list.length === 0 ? (
          <p className="muted" style={{ marginTop: "1rem" }}>No items in catalogue.</p>
        ) : (
          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem" }}>Name</th>
                  <th style={{ padding: "0.5rem" }}>Code</th>
                  <th style={{ padding: "0.5rem" }}>UoM</th>
                  <th style={{ padding: "0.5rem" }}>Usual Qty</th>
                  <th style={{ padding: "0.5rem" }}>Last Rate</th>
                </tr>
              </thead>
              <tbody>
                {items.list.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}><strong>{item.itemName}</strong></td>
                    <td style={{ padding: "0.5rem" }}>{item.itemCode || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{item.unitOfMeasure}</td>
                    <td style={{ padding: "0.5rem" }}>{item.normalQuantity || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{item.lastRate ? `₹${item.lastRate}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
