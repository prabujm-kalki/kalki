"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import { VendorForm } from "./VendorForm";

import { ArrowLeft, Edit3, UserX, Plus, Calendar, Package, Phone, Mail, User, CreditCard, Clock, Truck, ShieldAlert, Trash2 } from "lucide-react";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { KalkiInput } from "@/components/ui/KalkiInput";
import { KalkiSelect } from "@/components/ui/KalkiSelect";
import { KalkiSection } from "@/components/ui/KalkiSection";
import { KalkiCard } from "@/components/ui/KalkiCard";

type VendorView = {
  id: string;
  name: string;
  shortCode?: string;
  isActive: boolean;
  contactDetails: {
    name?: string;
    phone?: string;
    email?: string;
  };
  paymentTerms: string | null;
  creditDays: number | null;
  creditLimitAmount?: number | null;
  expectedDeliveryDays?: number | null;
  poDeliveryMethod?: string;
  poWhatsappPreference?: string;
};

type VendorItemView = {
  id: string;
  itemName: string;
  itemCode: string | null;
  unitOfMeasure: string;
  normalQuantity: string | null;
  minimumStock: string | null;
  lastRate: string | null;
  baseMinStock?: string | null;
  targetStock?: string | null;
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
  const [masterItems, setMasterItems] = useState<any[]>([]);
  
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
      apiGet<{ roles: RoleView[] }>(`/api/role-definitions?${query.toString()}`),
      apiGet<{ items: any[] }>(`/api/items?${query.toString()}`)
    ]).then(([vendorsPayload, itemsPayload, schedulesPayload, rolesPayload, itemsMasterPayload]) => {
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
      setMasterItems((itemsMasterPayload.items || []).filter((item: any) => item.itemType !== 'MENU_ITEM'));
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load vendor profile" });
    });

    return () => {
      cancelled = true;
    };
  }, [selected, vendorId, refreshKey]);

  async function handleRemoveItem(vendorItemId: string) {
    if (!selected) return;
    if (!confirm("Are you sure you want to remove this item from the catalogue?")) return;
    try {
      await apiSend(`/api/vendor-items/${vendorItemId}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`, "DELETE", {});
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Failed to remove item");
    }
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setAddingItem(true);
    setItemError(null);
    const formData = new FormData(event.currentTarget);
    const itemId = formData.get("itemId") as string;
    const selectedItem = masterItems.find(i => i.id === itemId);
    
    try {
      await apiSend("/api/vendor-items", "POST", {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        vendorId,
        itemId: itemId,
        itemName: selectedItem.nameEn,
        itemCode: undefined,
        unitOfMeasure: selectedItem.unit,
        normalQuantity: formData.get("normalQuantity") as string || undefined,
        minimumStock: formData.get("minimumStock") as string || undefined,
      });
      setShowItemForm(false);
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      setItemError(caught instanceof Error ? caught.message : "Failed to assign item");
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
  const locationParams = `?organizationId=${selected.organizationId}&locationId=${selected.locationId}`;

  return (
    <div className="kalki-main-content">
      {/* Top Header */}
      <div className="kalki-page-header" style={{ marginBottom: "20px" }}>
        <Link 
          href={`/purchasing/vendors${locationParams}`} 
          className="kalki-breadcrumbs" 
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px", textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to Vendors
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 className="kalki-page-title" style={{ fontSize: "22px", margin: 0 }}>
                {v.name}
              </h1>
              <span 
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  backgroundColor: v.isActive ? "#dcfce7" : "#fee2e2",
                  color: v.isActive ? "#16a34a" : "#dc2626",
                }}
              >
                {v.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="kalki-page-description" style={{ marginTop: "4px" }}>
              {selected.organizationName} · {selected.locationName}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {!isEditing && (
              <KalkiButton 
                variant="secondary" 
                size="sm"
                onClick={() => setIsEditing(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Edit3 size={15} /> Edit Vendor
              </KalkiButton>
            )}
            {v.isActive && (
              <KalkiButton 
                variant="danger" 
                size="sm"
                onClick={() => void deactivateVendor()} 
                disabled={isDeactivating}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <UserX size={15} /> {isDeactivating ? "Deactivating..." : "Deactivate"}
              </KalkiButton>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Vendor Form in Edit Mode OR Overview Cards */}
        {isEditing ? (
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
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            {/* Contact Details Card */}
            <KalkiSection title="Contact Information" icon={<User size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "var(--kalki-text-secondary)" }}>Contact Person</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--kalki-text-primary)", marginTop: "2px" }}>
                      {v.contactDetails.name || "Not Specified"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
                    <Phone size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "var(--kalki-text-secondary)" }}>Phone Number</div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--kalki-text-primary)", marginTop: "2px" }}>
                      {v.contactDetails.phone || "Not Specified"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
                    <Mail size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "var(--kalki-text-secondary)" }}>Email Address</div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--kalki-text-primary)", marginTop: "2px" }}>
                      {v.contactDetails.email || "Not Specified"}
                    </div>
                  </div>
                </div>
              </div>
            </KalkiSection>

            {/* Commercials & Terms */}
            <KalkiSection title="Commercials & Credit Terms" icon={<CreditCard size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "var(--kalki-text-secondary)" }}>Payment Terms</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--kalki-text-primary)", marginTop: "4px" }}>
                    {v.paymentTerms ? v.paymentTerms.replace(/_/g, " ").toUpperCase() : "N/A"}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "var(--kalki-text-secondary)" }}>Credit Days</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--kalki-text-primary)", marginTop: "4px" }}>
                    {v.paymentTerms === "DUE_ON_RECEIPT" || v.paymentTerms === "CASH_IN_ADVANCE" || v.paymentTerms?.toLowerCase() === "cash" 
                      ? "0 Days" 
                      : (v.creditDays !== null && v.creditDays !== undefined ? `${v.creditDays} Days` : "N/A")}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "var(--kalki-text-secondary)" }}>Credit Limit</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--kalki-text-primary)", marginTop: "4px" }}>
                    {v.creditLimitAmount !== null && v.creditLimitAmount !== undefined ? `₹${Number(v.creditLimitAmount).toLocaleString("en-IN")}` : "N/A"}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "var(--kalki-text-secondary)" }}>Expected Delivery</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--kalki-text-primary)", marginTop: "4px" }}>
                    {v.expectedDeliveryDays != null ? `${v.expectedDeliveryDays} day${v.expectedDeliveryDays === 1 ? "" : "s"}` : "2 days (Default)"}
                  </div>
                </div>
              </div>
            </KalkiSection>
          </div>
        )}

        {/* Purchase Schedules Section */}
        <KalkiSection 
          title="Purchase Schedules" 
          icon={<Calendar size={16} />}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", color: "var(--kalki-text-secondary)" }}>
              Automated reminders and ordering routines configured for this vendor.
            </span>
            {!showScheduleForm && (
              <KalkiButton 
                variant="secondary" 
                size="sm"
                onClick={() => setShowScheduleForm(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={15} /> Add Schedule
              </KalkiButton>
            )}
          </div>

          {showScheduleForm && (
            <form onSubmit={(e) => void handleAddSchedule(e)} style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#f8fafc", border: "1px solid var(--kalki-border)", borderRadius: "8px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--kalki-text-primary)", marginBottom: "12px" }}>
                Add New Schedule
              </div>
              {scheduleError && <StatusMessage tone="error">{scheduleError}</StatusMessage>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <KalkiSelect 
                  label="Responsible Role" 
                  name="responsibleRoleId" 
                  required 
                  disabled={addingSchedule || roles.list.length === 0}
                >
                  <option value="">Select a role...</option>
                  {roles.list.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </KalkiSelect>
                <KalkiInput 
                  label="Frequency Rule" 
                  name="frequencyRule" 
                  required 
                  disabled={addingSchedule} 
                  placeholder="e.g. Every Monday, 1st of Month" 
                />
                <KalkiInput 
                  label="Reminder Time" 
                  name="reminderTime" 
                  required 
                  disabled={addingSchedule} 
                  placeholder="e.g. 09:00 AM" 
                />
              </div>
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <KalkiButton type="button" variant="secondary" size="sm" onClick={() => setShowScheduleForm(false)} disabled={addingSchedule}>
                  Cancel
                </KalkiButton>
                <KalkiButton type="submit" variant="primary" size="sm" disabled={addingSchedule || roles.list.length === 0}>
                  {addingSchedule ? "Adding…" : "Save Schedule"}
                </KalkiButton>
              </div>
            </form>
          )}

          {schedules.list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--kalki-text-secondary)", fontSize: "13px" }}>
              No automated purchase schedules configured for this vendor.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {schedules.list.map(s => {
                const roleName = roles.list.find(r => r.id === s.responsibleRoleId)?.name || "Unknown Role";
                return (
                  <div 
                    key={s.id} 
                    style={{ 
                      padding: "14px 16px", 
                      backgroundColor: "#fff", 
                      border: "1px solid var(--kalki-border)", 
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "6px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kalki-primary)" }}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--kalki-text-primary)" }}>
                          {s.frequencyRule} at {s.reminderTime}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", marginTop: "2px" }}>
                          Assigned to: <strong>{roleName}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </KalkiSection>

        {/* Predefined Item Catalogue */}
        <KalkiSection 
          title="Predefined Item Catalogue" 
          icon={<Package size={16} />}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", color: "var(--kalki-text-secondary)" }}>
              Items supplied by this vendor with regular rates and target inventory levels.
            </span>
            {!showItemForm && (
              <KalkiButton 
                variant="secondary" 
                size="sm"
                onClick={() => setShowItemForm(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={15} /> Add Item
              </KalkiButton>
            )}
          </div>

          {showItemForm && (
            <form onSubmit={(e) => void handleAddItem(e)} style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#f8fafc", border: "1px solid var(--kalki-border)", borderRadius: "8px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--kalki-text-primary)", marginBottom: "12px" }}>
                Assign Item to Catalogue
              </div>
              {itemError && <StatusMessage tone="error">{itemError}</StatusMessage>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <KalkiSelect label="Select Master Item" name="itemId" required disabled={addingItem}>
                  <option value="">-- Choose an item --</option>
                  {masterItems.map(item => (
                    <option key={item.id} value={item.id}>{item.nameEn} ({item.unit})</option>
                  ))}
                </KalkiSelect>
                <KalkiInput 
                  label="Target Stock (Usual Qty)" 
                  name="normalQuantity" 
                  type="number" 
                  step="0.01" 
                  disabled={addingItem} 
                  placeholder="e.g. 50" 
                />
                <KalkiInput 
                  label="Reorder Level (Min Stock)" 
                  name="minimumStock" 
                  type="number" 
                  step="0.01" 
                  disabled={addingItem} 
                  placeholder="e.g. 10" 
                />
              </div>
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <KalkiButton type="button" variant="secondary" size="sm" onClick={() => setShowItemForm(false)} disabled={addingItem}>
                  Cancel
                </KalkiButton>
                <KalkiButton type="submit" variant="primary" size="sm" disabled={addingItem}>
                  {addingItem ? "Assigning…" : "Assign Item"}
                </KalkiButton>
              </div>
            </form>
          )}

          {items.list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--kalki-text-secondary)", fontSize: "13px" }}>
              No items assigned to this vendor catalogue yet.
            </div>
          ) : (
            <div className="kalki-table-container">
              <table className="kalki-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Code</th>
                    <th>UoM</th>
                    <th>Reorder Level (Min)</th>
                    <th>Usual Qty</th>
                    <th>Last Rate</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.list.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.itemName}</strong>
                      </td>
                      <td style={{ color: "var(--kalki-text-secondary)" }}>
                        {item.itemCode || "—"}
                      </td>
                      <td>
                        <span style={{ padding: "2px 8px", backgroundColor: "#f1f5f9", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                          {item.unitOfMeasure}
                        </span>
                      </td>
                      <td>{item.minimumStock || item.baseMinStock || "—"}</td>
                      <td>{item.normalQuantity || item.targetStock || "—"}</td>
                      <td style={{ fontWeight: 600 }}>
                        {item.lastRate ? `₹${item.lastRate}` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(item.id)} 
                          className="kalki-button kalki-button--ghost kalki-button--danger"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          title="Remove item"
                        >
                          <Trash2 size={14} style={{ marginRight: "4px" }} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </KalkiSection>
      </div>
    </div>
  );
}

