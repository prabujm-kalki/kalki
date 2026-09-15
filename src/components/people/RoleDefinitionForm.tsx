"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";

type RoleFormProps = {
  organizationId: string;
  locationId: string;
  initialData?: any;
  departments?: { id: string; name: string }[];
  roles?: { id: string; name: string }[];
  onSuccess: () => void;
  onCancel: () => void;
};

export function RoleDefinitionForm({ organizationId, locationId, initialData, departments = [], roles = [], onSuccess, onCancel }: RoleFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    identifier: initialData?.identifier || "",
    name: initialData?.name || "",
    purpose: initialData?.purpose || "",
    departmentId: initialData?.departmentId || "",
    reportsToRoleId: initialData?.reportsToRoleId || "",
    permissions: initialData?.authorityConfig?.permissions || ([] as string[]),
  });

  function handleChange(field: string, value: string | string[]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const payload = {
        organizationId,
        locationId,
        identifier: formData.identifier,
        name: formData.name,
        purpose: formData.purpose,
        departmentId: formData.departmentId || null,
        reportsToRoleId: formData.reportsToRoleId || null,
        permissions: formData.permissions,
      };

      if (initialData?.id) {
        await apiSend(`/api/role-definitions?id=${initialData.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/role-definitions", "POST", payload);
      }
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save role");
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="panel stack">
      <div className="panel-header">
        <h3>{initialData ? "Edit Role" : "Add New Role"}</h3>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={pending}>Cancel</button>
      </div>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      
      <div className="grid-2">
        <div className="field">
          <label>Identifier (e.g. CHEF, MGR) *</label>
          <input required type="text" value={formData.identifier} onChange={(e) => handleChange("identifier", e.target.value.toUpperCase())} disabled={pending} />
        </div>
        <div className="field">
          <label>Role Name *</label>
          <input required type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} disabled={pending} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Purpose *</label>
          <textarea required value={formData.purpose} onChange={(e) => handleChange("purpose", e.target.value)} disabled={pending} rows={3} />
        </div>
        <div className="field">
          <label>Department</label>
          <select value={formData.departmentId} onChange={(e) => handleChange("departmentId", e.target.value)} disabled={pending}>
            <option value="">None</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Reports To</label>
          <select value={formData.reportsToRoleId} onChange={(e) => handleChange("reportsToRoleId", e.target.value)} disabled={pending}>
            <option value="">None (Top Level)</option>
            {roles.filter(r => r.id !== initialData?.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h4>Baseline Permissions</h4>
        <p className="muted" style={{ marginBottom: "1rem" }}>Select the modules this role can access by default.</p>
        <div className="grid-2">
          {["employee", "inventory", "purchase", "sales", "finance", "settings"].map((mod) => (
            <label key={mod} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input 
                type="checkbox" 
                checked={formData.permissions.includes(`${mod}:read`)}
                onChange={(e) => {
                  const perms = new Set<string>(formData.permissions);
                  if (e.target.checked) {
                    perms.add(`${mod}:read`);
                    perms.add(`${mod}:create`);
                    perms.add(`${mod}:update`);
                  } else {
                    perms.delete(`${mod}:read`);
                    perms.delete(`${mod}:create`);
                    perms.delete(`${mod}:update`);
                  }
                  handleChange("permissions", Array.from(perms));
                }}
                disabled={pending}
              />
              {mod.charAt(0).toUpperCase() + mod.slice(1)} Module Access
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="action-button" disabled={pending}>
          {pending ? "Saving…" : "Save Role"}
        </button>
      </div>
    </form>
  );
}
