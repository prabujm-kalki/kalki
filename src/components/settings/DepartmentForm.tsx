"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";

type DepartmentData = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type DepartmentFormProps = {
  organizationId: string;
  initialData?: DepartmentData;
  onSuccess: () => void;
  onCancel: () => void;
};

export function DepartmentForm({ organizationId, initialData, onSuccess, onCancel }: DepartmentFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      organizationId,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      ...(initialData && { isActive: formData.get("isActive") === "on" }),
    };

    try {
      if (initialData) {
        await apiSend(`/api/departments?id=${initialData.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/departments", "POST", payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="panel">
      <h3>{initialData ? "Edit Department" : "Add Department"}</h3>
      {error && <div className="status-message error">{error}</div>}
      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="field">
          <label>Department Name *</label>
          <input name="name" required defaultValue={initialData?.name} disabled={submitting} />
        </div>
        <div className="field">
          <label>Code (e.g. KITCHEN) *</label>
          <input name="code" required defaultValue={initialData?.code} disabled={submitting} />
        </div>
      </div>
      {initialData && (
        <div className="field" style={{ marginTop: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" name="isActive" defaultChecked={initialData.isActive} disabled={submitting} />
            Active Department
          </label>
        </div>
      )}
      <div className="form-actions" style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="action-button" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
