"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";

type InventoryItemView = {
  id: string;
  itemName: string;
  vendorName: string;
  unitOfMeasure: string;
  minimumStock: string | null;
  currentBalance: number;
};

type EmployeeView = {
  id: string;
  employeeCode: string;
  person: { displayName: string };
};

export function InventoryDashboard() {
  const { selected } = useSessionView();
  const [items, setItems] = useState<{ requestKey: string; list: InventoryItemView[] } | null>(null);
  const [employees, setEmployees] = useState<{ requestKey: string; list: EmployeeView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedItem, setSelectedItem] = useState<InventoryItemView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const requestKey = `${selected.organizationId}:${selected.locationId}`;
    let cancelled = false;

    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    
    Promise.all([
      apiGet<{ items: InventoryItemView[] }>(`/api/inventory-ledger?${query.toString()}`),
      apiGet<{ employees: EmployeeView[] }>(`/api/employees?${query.toString()}`)
    ]).then(([ledgerPayload, employeesPayload]) => {
      if (cancelled) return;
      setError(null);
      setItems({ requestKey, list: ledgerPayload.items });
      setEmployees({ requestKey, list: employeesPayload.employees });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load inventory" });
    });

    return () => {
      cancelled = true;
    };
  }, [selected, refreshKey]);

  async function handleRecordMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !selectedItem) return;
    setSubmitting(true);
    setSubmitError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await apiSend("/api/inventory-ledger", "POST", {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        vendorItemId: selectedItem.id,
        eventType: formData.get("eventType") as string,
        quantityChange: formData.get("quantityChange") as string,
        recordedByEmployeeId: formData.get("recordedByEmployeeId") as string,
        notes: formData.get("notes") as string || undefined,
      });
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Failed to record movement");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view inventory.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!items || items.requestKey !== requestKey || !employees) return <StatusMessage tone="loading">Loading inventory ledger…</StatusMessage>;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Inventory Management</p>
            <h2>Current Stock Ledger</h2>
            <p>{selected.organizationName} · {selected.locationName}</p>
          </div>
        </div>
        <p className="muted">View current stock balances and record physical movements (receipts, consumption, waste).</p>
      </section>

      {selectedItem && (
        <form className="panel" onSubmit={(e) => void handleRecordMovement(e)} style={{ border: "2px solid var(--accent)", position: "relative" }}>
          <button 
            type="button" 
            onClick={() => setSelectedItem(null)} 
            style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
          >
            ✕
          </button>
          <h3>Record Movement for {selectedItem.itemName}</h3>
          <p className="muted">Current Balance: <strong>{selectedItem.currentBalance} {selectedItem.unitOfMeasure}</strong></p>
          
          {submitError && <StatusMessage tone="error">{submitError}</StatusMessage>}
          
          <div className="grid" style={{ marginTop: "1rem" }}>
            <label>
              Event Type *
              <select name="eventType" required disabled={submitting}>
                <option value="">Select Event...</option>
                <option value="RECEIPT">Stock Receipt (Incoming)</option>
                <option value="CONSUMPTION">Consumption (Used)</option>
                <option value="WASTE">Waste (Spoiled/Discarded)</option>
                <option value="ADJUSTMENT">Manual Adjustment</option>
              </select>
            </label>
            <label>
              Quantity Change (Use +/-) *
              <input name="quantityChange" type="number" step="0.01" required disabled={submitting} placeholder="e.g. 5 or -2.5" />
            </label>
            <label>
              Recorded By (Employee) *
              <select name="recordedByEmployeeId" required disabled={submitting}>
                <option value="">Select Employee...</option>
                {employees.list.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.person.displayName} ({emp.employeeCode})</option>
                ))}
              </select>
            </label>
            <label>
              Notes / Reason
              <input name="notes" disabled={submitting} placeholder="Optional reference" />
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setSelectedItem(null)} disabled={submitting}>Cancel</button>
            <button type="submit" className="action-button" disabled={submitting}>
              {submitting ? "Recording…" : "Confirm Movement"}
            </button>
          </div>
        </form>
      )}

      {items.list.length === 0 ? (
        <StatusMessage tone="empty">No predefined vendor items found for this location.</StatusMessage>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="panel" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", padding: 0 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={{ padding: "1rem" }}>Item Name</th>
                <th style={{ padding: "1rem" }}>Vendor</th>
                <th style={{ padding: "1rem" }}>Current Balance</th>
                <th style={{ padding: "1rem" }}>Status</th>
                <th style={{ padding: "1rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.list.map((item) => {
                const isLowStock = item.minimumStock !== null && item.currentBalance <= parseFloat(item.minimumStock);
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "1rem" }}><strong>{item.itemName}</strong></td>
                    <td style={{ padding: "1rem" }} className="muted">{item.vendorName}</td>
                    <td style={{ padding: "1rem" }}>
                      <strong>{item.currentBalance}</strong> {item.unitOfMeasure}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {isLowStock ? <span style={{ color: "var(--error)", fontWeight: "bold" }}>Low Stock</span> : <span style={{ color: "var(--success)" }}>Healthy</span>}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <button 
                        type="button" 
                        className="secondary-button" 
                        onClick={() => setSelectedItem(item)}
                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.9rem" }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
