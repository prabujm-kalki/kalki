"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";

export function VendorForm({
  organizationId,
  locationId,
  initialData,
  onCancel,
  onSuccess,
}: {
  organizationId: string;
  locationId: string;
  initialData?: any;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const payload = {
        organizationId,
        locationId,
        name: formData.get("name") as string,
        contactDetails: {
          name: formData.get("contactName") as string || undefined,
          phone: formData.get("contactPhone") as string || undefined,
          email: formData.get("contactEmail") as string || undefined,
        },
        paymentTerms: formData.get("paymentTerms") as string || undefined,
        creditDays: formData.get("creditDays") ? parseInt(formData.get("creditDays") as string, 10) : undefined,
      };

      if (initialData?.id) {
        await apiSend(`/api/vendors?id=${initialData.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/vendors", "POST", payload);
      }
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create vendor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={(e) => void handleSubmit(e)}>
      <h3>{initialData ? "Edit Vendor" : "Add New Vendor"}</h3>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="field">
          <label>Vendor Name (Company) *</label>
          <input name="name" required disabled={submitting} defaultValue={initialData?.name} />
        </div>
        <div className="field">
          <label>Contact Person Name</label>
          <input name="contactName" disabled={submitting} defaultValue={initialData?.contactDetails?.name} />
        </div>
        <div className="field">
          <label>Phone Number</label>
          <input name="contactPhone" type="tel" disabled={submitting} defaultValue={initialData?.contactDetails?.phone} />
        </div>
        <div className="field">
          <label>Email</label>
          <input name="contactEmail" type="email" disabled={submitting} defaultValue={initialData?.contactDetails?.email} />
        </div>
        <div className="field">
          <label>Payment Terms (e.g. Net 30, Cash)</label>
          <input name="paymentTerms" disabled={submitting} defaultValue={initialData?.paymentTerms} />
        </div>
        <div className="field">
          <label>Credit Days</label>
          <input name="creditDays" type="number" min="0" disabled={submitting} defaultValue={initialData?.creditDays} />
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="action-button" disabled={submitting}>
          {submitting ? "Saving…" : "Save Vendor"}
        </button>
      </div>
    </form>
  );
}
