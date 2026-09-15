"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import { RoleDefinitionForm } from "./RoleDefinitionForm";

type RoleDefinitionView = {
  id: string;
  name: string;
  identifier: string;
  purpose: string;
  isActive: boolean;
};

type KPIView = {
  id: string;
  name: string;
  targetValue: string | null;
  measurementUnit: string | null;
  frequency: string | null;
};

export function RoleProfile({ roleId }: { roleId: string }) {
  const { selected } = useSessionView();
  const [role, setRole] = useState<{ requestKey: string; data: RoleDefinitionView } | null>(null);
  const [kpis, setKpis] = useState<{ requestKey: string; items: KPIView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [showKpiForm, setShowKpiForm] = useState(false);
  const [addingKpi, setAddingKpi] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const requestKey = `${selected.organizationId}:${selected.locationId}:${roleId}`;
    let cancelled = false;

    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });

    Promise.all([
      apiGet<{ roles: RoleDefinitionView[] }>(`/api/role-definitions?${query.toString()}`),
      apiGet<{ kpis: KPIView[] }>(`/api/kpis?${query.toString()}&roleId=${roleId}`)
    ]).then(([rolesPayload, kpisPayload]) => {
      if (cancelled) return;
      setError(null);
      const r = rolesPayload.roles.find(r => r.id === roleId);
      if (r) {
        setRole({ requestKey, data: r });
      } else {
        setError({ requestKey, message: "Role not found" });
      }
      setKpis({ requestKey, items: kpisPayload.kpis });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load role profile" });
    });

    return () => {
      cancelled = true;
    };
  }, [selected, roleId, refreshKey]);

  async function deactivateRole() {
    if (!selected || !role?.data) return;
    if (!confirm("Are you sure you want to deactivate this role?")) return;
    setIsDeactivating(true);
    try {
      await apiSend(`/api/role-definitions?id=${role.data.id}`, "PATCH", {
        isActive: false
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handleAddKpi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setAddingKpi(true);
    setKpiError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await apiSend("/api/kpis", "POST", {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        roleId,
        name: formData.get("name") as string,
        targetValue: formData.get("targetValue") as string || undefined,
        measurementUnit: formData.get("measurementUnit") as string || undefined,
        frequency: formData.get("frequency") as string || undefined,
      });
      setShowKpiForm(false);
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      setKpiError(caught instanceof Error ? caught.message : "Failed to add KPI");
    } finally {
      setAddingKpi(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view profile.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}:${roleId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!role || role.requestKey !== requestKey || !kpis) return <StatusMessage tone="loading">Loading role profile…</StatusMessage>;

  const r = role.data;

  return (
    <div className="stack">
      <Link href={`/people?organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="nav-link" style={{ alignSelf: "flex-start" }}>
        ← Back to People & Roles
      </Link>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Role Profile</p>
            <h2>{r.name} {r.isActive ? "" : "(Inactive)"}</h2>
            <p>{r.identifier}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="secondary-button" onClick={() => setIsEditing(true)}>Edit</button>
            {r.isActive && (
              <button className="secondary-button" style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }} onClick={() => void deactivateRole()} disabled={isDeactivating}>
                Deactivate
              </button>
            )}
          </div>
        </div>
        {isEditing ? (
          <div style={{ marginTop: "1rem" }}>
            <RoleDefinitionForm 
              organizationId={selected.organizationId}
              locationId={selected.locationId}
              initialData={r}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => {
                setIsEditing(false);
                setRefreshKey(k => k + 1);
              }}
            />
          </div>
        ) : (
          <div style={{ marginTop: "1rem" }}>
            <p><strong>Purpose:</strong> {r.purpose}</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Key Performance Indicators (KPIs)</h3>
            <span className="muted">Metrics assigned to this role</span>
          </div>
          {!showKpiForm && <button type="button" className="action-button" onClick={() => setShowKpiForm(true)}>Add KPI</button>}
        </div>

        {showKpiForm && (
          <form onSubmit={(e) => void handleAddKpi(e)} style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <h4>Add New KPI</h4>
            {kpiError && <StatusMessage tone="error">{kpiError}</StatusMessage>}
            <div className="grid" style={{ marginTop: "1rem" }}>
              <label>
                KPI Name *
                <input name="name" required disabled={addingKpi} />
              </label>
              <label>
                Target Value
                <input name="targetValue" disabled={addingKpi} />
              </label>
              <label>
                Measurement Unit (e.g. %, hours)
                <input name="measurementUnit" disabled={addingKpi} />
              </label>
              <label>
                Frequency (e.g. Daily, Monthly)
                <input name="frequency" disabled={addingKpi} />
              </label>
            </div>
            <div className="form-actions" style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowKpiForm(false)} disabled={addingKpi}>Cancel</button>
              <button type="submit" className="action-button" disabled={addingKpi}>
                {addingKpi ? "Adding…" : "Add KPI"}
              </button>
            </div>
          </form>
        )}

        {kpis.items.length === 0 ? (
          <p className="muted" style={{ marginTop: "1rem" }}>No KPIs assigned to this role.</p>
        ) : (
          <div className="work-list" style={{ marginTop: "1rem" }}>
            {kpis.items.map((kpi) => (
              <div key={kpi.id} className="panel" style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                <strong>{kpi.name}</strong>
                <div style={{ marginTop: "0.5rem", display: "flex", gap: "2rem", fontSize: "0.9rem" }}>
                  {kpi.targetValue && <span>Target: {kpi.targetValue}</span>}
                  {kpi.measurementUnit && <span>Unit: {kpi.measurementUnit}</span>}
                  {kpi.frequency && <span>Frequency: {kpi.frequency}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
