"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";

type RoleFormProps = {
  organizationId: string;
  locationId: string;
  initialData?: any;
  departments?: { id: string; name: string }[];
  roles?: { id: string; name: string; locationId?: string | null }[];
  onSuccess: () => void;
  onCancel: () => void;
};

export function RoleDefinitionForm({ organizationId, locationId, initialData, departments = [], roles = [], onSuccess, onCancel }: RoleFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    purpose: initialData?.purpose || "",
    departmentId: initialData?.departmentId || "",
    reportsToRoleId: initialData?.reportsToRoleId || "",
  });
  
  const [isGlobal, setIsGlobal] = useState<boolean>(
    initialData ? initialData.locationId === null : false
  );

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
        isGlobal,
        identifier: formData.name.toUpperCase().replace(/\s+/g, '_'),
        name: formData.name,
        purpose: formData.purpose,
        departmentId: formData.departmentId || null,
        reportsToRoleId: formData.reportsToRoleId || null,
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
      </div>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      
      <div className="grid-2">

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
            {roles.filter(r => r.id !== initialData?.id).map(r => (
              <option key={r.id} value={r.id}>
                {r.name}{r.locationId === null ? " (Global)" : ""}
              </option>
            ))}
          </select>
        </div>
        {(!locationId || locationId === organizationId || isGlobal) && (
          <div className="field" style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "normal", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={isGlobal} 
                onChange={(e) => setIsGlobal(e.target.checked)} 
                disabled={pending} 
              />
              Global Role (Organization-wide, same across all locations)
            </label>
          </div>
        )}
      </div>      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className="action-button" disabled={pending}>
          {pending ? "Saving…" : "Save Role"}
        </button>
      </div>
    </form>
  );
}
