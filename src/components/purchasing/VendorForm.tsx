"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";

const PAYMENT_TERMS_MAP: Record<string, number> = {
  "DUE_ON_RECEIPT": 0,
  "CASH_IN_ADVANCE": 0,
  "NET_7": 7,
  "NET_15": 15,
  "NET_30": 30,
  "NET_45": 45,
  "NET_60": 60,
  "NET_90": 90,
};

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
  const [selectedTerm, setSelectedTerm] = useState<string>(initialData?.paymentTerms || "");

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
        creditLimitAmount: formData.get("creditLimitAmount") ? parseFloat(formData.get("creditLimitAmount") as string) : undefined,
        poDeliveryMethod: formData.get("poDeliveryMethod") as string || 'WHATSAPP',
        poWhatsappPreference: formData.get("poWhatsappPreference") as string || 'TEXT_AND_PDF_LINK',
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

  const derivedCreditDays = selectedTerm ? PAYMENT_TERMS_MAP[selectedTerm] : "";

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
          <label>Payment Terms (Industry Standard) *</label>
          <select 
            name="paymentTerms" 
            required 
            disabled={submitting} 
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="" disabled>Select payment term...</option>
            {Object.entries(PAYMENT_TERMS_MAP).map(([term]) => (
              <option key={term} value={term}>
                {term.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Credit Days (Auto-Calculated)</label>
          <input 
            name="creditDays" 
            type="number" 
            readOnly 
            disabled={submitting} 
            value={derivedCreditDays} 
            style={{ backgroundColor: "var(--bg-surface-alt)", cursor: "not-allowed", color: "var(--color-text-muted)" }}
          />
        </div>
        <div className="field">
          <label>Credit Limit Amount (₹) *</label>
          <input 
            name="creditLimitAmount" 
            type="number" 
            min="0"
            required
            disabled={submitting} 
            defaultValue={initialData?.creditLimitAmount} 
            placeholder="e.g. 500000"
          />
        </div>
      </div>
      
      <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Purchase Order Delivery Preferences</h4>
      <div className="grid-2">
        <div className="field">
          <label>Delivery Method</label>
          <select name="poDeliveryMethod" defaultValue={initialData?.poDeliveryMethod || 'WHATSAPP'} disabled={submitting}>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
        <div className="field">
          <label>WhatsApp Preference</label>
          <select name="poWhatsappPreference" defaultValue={initialData?.poWhatsappPreference || 'TEXT_AND_PDF_LINK'} disabled={submitting}>
            <option value="TEXT_AND_PDF_LINK">Text Details + PDF Link</option>
            <option value="TEXT_ONLY">Text Details Only</option>
            <option value="PDF_LINK_ONLY">PDF Link Only</option>
          </select>
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
