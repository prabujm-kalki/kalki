"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import { DepartmentForm } from "./DepartmentForm";

type DepartmentView = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export function DepartmentsDashboard() {
  const { selected } = useSessionView();
  const [departments, setDepartments] = useState<{ requestKey: string; items: DepartmentView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const requestKey = `${selected.organizationId}`;
    let cancelled = false;

    apiGet<{ departments: DepartmentView[] }>(`/api/departments?organizationId=${selected.organizationId}`)
      .then((payload) => {
        if (cancelled) return;
        setError(null);
        setDepartments({ requestKey, items: payload.departments });
      })
      .catch((caught) => {
        if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Failed to load departments" });
      });

    return () => {
      cancelled = true;
    };
  }, [selected, refreshKey]);

  async function deactivateDepartment(id: string) {
    if (!confirm("Are you sure you want to deactivate this department?")) return;
    setIsDeactivating(id);
    try {
      await apiSend(`/api/departments?id=${id}`, "PATCH", { isActive: false });
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(null);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization to view departments.</StatusMessage>;
  const requestKey = `${selected.organizationId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!departments || departments.requestKey !== requestKey) return <StatusMessage tone="loading">Loading departments…</StatusMessage>;

  return (
    <div className="stack">
      <div className="panel-header">
        <div>
          <h2>Departments</h2>
          <p className="muted">Manage functional areas within {selected.organizationId}</p>
        </div>
        {!isAdding && !editingId && (
          <button className="action-button" onClick={() => setIsAdding(true)}>Add Department</button>
        )}
      </div>

      {isAdding && (
        <DepartmentForm 
          organizationId={selected.organizationId}
          onCancel={() => setIsAdding(false)}
          onSuccess={() => { setIsAdding(false); setRefreshKey(k => k + 1); }}
        />
      )}

      {departments.items.length === 0 && !isAdding ? (
        <StatusMessage tone="empty">No departments configured yet.</StatusMessage>
      ) : (
        <div className="work-list">
          {departments.items.map((dept) => (
            editingId === dept.id ? (
              <DepartmentForm
                key={dept.id}
                organizationId={selected.organizationId}
                initialData={dept}
                onCancel={() => setEditingId(null)}
                onSuccess={() => { setEditingId(null); setRefreshKey(k => k + 1); }}
              />
            ) : (
              <div key={dept.id} className="panel" style={{ opacity: dept.isActive ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3>{dept.name} {!dept.isActive && "(Inactive)"}</h3>
                    <span className="muted">Code: {dept.code}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="secondary-button" onClick={() => setEditingId(dept.id)}>Edit</button>
                    {dept.isActive && (
                      <button 
                        className="secondary-button" 
                        style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }}
                        onClick={() => void deactivateDepartment(dept.id)}
                        disabled={isDeactivating === dept.id}
                      >
                        {isDeactivating === dept.id ? "..." : "Deactivate"}
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
