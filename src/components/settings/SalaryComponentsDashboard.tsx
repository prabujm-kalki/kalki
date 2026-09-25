"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import { SalaryComponentForm } from "./SalaryComponentForm";

type SalaryComponentView = {
  id: string;
  name: string;
  type: "EARNING" | "DEDUCTION";
  isTaxable: boolean;
  isActive: boolean;
};

export function SalaryComponentsDashboard() {
  const { selected } = useSessionView();
  const [components, setComponents] = useState<{ requestKey: string; items: SalaryComponentView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const requestKey = `${selected.organizationId}`;
    let cancelled = false;

    apiGet<{ components: SalaryComponentView[] }>(`/api/payroll/components?organizationId=${selected.organizationId}`)
      .then((payload) => {
        if (cancelled) return;
        setError(null);
        setComponents({ requestKey, items: payload.components });
      })
      .catch((caught) => {
        if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Failed to load salary components" });
      });

    return () => {
      cancelled = true;
    };
  }, [selected, refreshKey]);

  async function deactivateComponent(id: string) {
    if (!confirm("Are you sure you want to deactivate this salary component?")) return;
    setIsDeactivating(id);
    try {
      await apiSend(`/api/payroll/components?id=${id}`, "PATCH", { isActive: false });
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(null);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization to view salary components.</StatusMessage>;
  const requestKey = `${selected.organizationId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!components || components.requestKey !== requestKey) return <StatusMessage tone="loading">Loading salary components…</StatusMessage>;

  return (
    <div className="stack">
      <div className="panel-header">
        <div>
          <h2>Salary Components</h2>
          <p className="muted">Define standard earnings and deductions for {selected.organizationName}</p>
        </div>
        {!isAdding && !editingId && (
          <button className="action-button" onClick={() => setIsAdding(true)}>Add Component</button>
        )}
      </div>

      {isAdding && (
        <SalaryComponentForm 
          organizationId={selected.organizationId}
          onCancel={() => setIsAdding(false)}
          onSuccess={() => { setIsAdding(false); setRefreshKey(k => k + 1); }}
        />
      )}

      {components.items.length === 0 && !isAdding ? (
        <StatusMessage tone="empty">No salary components configured yet.</StatusMessage>
      ) : (
        <div className="work-list">
          {components.items.map((comp) => (
            editingId === comp.id ? (
              <SalaryComponentForm
                key={comp.id}
                organizationId={selected.organizationId}
                initialData={comp}
                onCancel={() => setEditingId(null)}
                onSuccess={() => { setEditingId(null); setRefreshKey(k => k + 1); }}
              />
            ) : (
              <div key={comp.id} className="panel" style={{ opacity: comp.isActive ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {comp.name} 
                      <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "100px", backgroundColor: comp.type === "EARNING" ? "var(--kalki-success-bg)" : "var(--kalki-danger-bg)", color: comp.type === "EARNING" ? "var(--kalki-success)" : "var(--danger)" }}>
                        {comp.type}
                      </span>
                      {!comp.isActive && <span className="muted">(Inactive)</span>}
                    </h3>
                    <span className="muted">Taxable: {comp.isTaxable ? "Yes" : "No"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="secondary-button" onClick={() => setEditingId(comp.id)}>Edit</button>
                    {comp.isActive && (
                      <button 
                        className="secondary-button" 
                        style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }}
                        onClick={() => void deactivateComponent(comp.id)}
                        disabled={isDeactivating === comp.id}
                      >
                        {isDeactivating === comp.id ? "..." : "Deactivate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
