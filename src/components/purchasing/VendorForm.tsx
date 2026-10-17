"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";

import { Save, X, Building, User, Mail, Phone, CreditCard, Send, Clock } from "lucide-react";
import { KalkiInput } from "@/components/ui/KalkiInput";
import { KalkiSelect } from "@/components/ui/KalkiSelect";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { KalkiSection } from "@/components/ui/KalkiSection";

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
        shortCode: formData.get("shortCode") as string || undefined,
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
        expectedDeliveryDays: formData.get("expectedDeliveryDays") ? parseInt(formData.get("expectedDeliveryDays") as string, 10) : 2,
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
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      {/* Vendor Profile & Identification */}
      <KalkiSection title={initialData ? "Edit Vendor Identification" : "Vendor Identification & Contact"} icon={<Building size={16} />}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <KalkiInput 
            label="Vendor Name (Company)" 
            name="name" 
            required 
            disabled={submitting} 
            defaultValue={initialData?.name} 
            placeholder="e.g. Kalki Department Store"
          />
          <KalkiInput 
            label="Short Code (For PO prefix)" 
            name="shortCode" 
            required 
            disabled={submitting} 
            defaultValue={initialData?.shortCode} 
            placeholder="e.g. KALKI_DEP" 
            style={{ textTransform: "uppercase" }} 
          />
          <KalkiInput 
            label="Contact Person Name" 
            name="contactName" 
            disabled={submitting} 
            defaultValue={initialData?.contactDetails?.name} 
            placeholder="e.g. Suganya"
          />
          <KalkiInput 
            label="Phone Number" 
            name="contactPhone" 
            type="tel" 
            disabled={submitting} 
            defaultValue={initialData?.contactDetails?.phone} 
            placeholder="e.g. 9383591557"
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <KalkiInput 
              label="Email Address" 
              name="contactEmail" 
              type="email" 
              disabled={submitting} 
              defaultValue={initialData?.contactDetails?.email} 
              placeholder="e.g. supplier@example.com"
            />
          </div>
        </div>
      </KalkiSection>

      {/* Commercial Terms & Credit Limits */}
      <KalkiSection title="Payment Terms & Credit Limits" icon={<CreditCard size={16} />}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          <KalkiSelect 
            label="Payment Terms (Standard)" 
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
          </KalkiSelect>

          <KalkiInput 
            label="Credit Days (Calculated)" 
            name="creditDays" 
            type="number" 
            readOnly 
            disabled={submitting} 
            value={derivedCreditDays} 
            style={{ backgroundColor: "#f8fafc", cursor: "not-allowed", color: "var(--kalki-text-secondary)" }}
          />

          <KalkiInput 
            label="Credit Limit Amount (₹)" 
            name="creditLimitAmount" 
            type="number" 
            min="0"
            required
            disabled={submitting} 
            defaultValue={initialData?.creditLimitAmount} 
            placeholder="e.g. 150000"
          />
        </div>
      </KalkiSection>

      {/* PO Delivery Preferences */}
      <KalkiSection title="Purchase Order Delivery Preferences" icon={<Send size={16} />}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          <KalkiSelect 
            label="Delivery Method" 
            name="poDeliveryMethod" 
            defaultValue={initialData?.poDeliveryMethod || 'WHATSAPP'} 
            disabled={submitting}
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="MANUAL">Manual</option>
          </KalkiSelect>

          <KalkiSelect 
            label="WhatsApp Dispatch Preference" 
            name="poWhatsappPreference" 
            defaultValue={initialData?.poWhatsappPreference || 'TEXT_AND_PDF_LINK'} 
            disabled={submitting}
          >
            <option value="TEXT_AND_PDF_LINK">Text Details + PDF Link</option>
            <option value="TEXT_ONLY">Text Details Only</option>
            <option value="PDF_LINK_ONLY">PDF Link Only</option>
          </KalkiSelect>

          <KalkiInput
            label="Expected Delivery Days (Lead Time)"
            name="expectedDeliveryDays"
            type="number"
            min="0"
            max="365"
            defaultValue={initialData?.expectedDeliveryDays ?? 2}
            disabled={submitting}
            placeholder="e.g. 1, 2, 3"
          />
        </div>
      </KalkiSection>

      {/* Form Action Buttons */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          gap: "12px", 
          padding: "16px 20px", 
          backgroundColor: "#fff", 
          border: "1px solid var(--kalki-border)", 
          borderRadius: "8px" 
        }}
      >
        <KalkiButton type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </KalkiButton>
        <KalkiButton type="submit" variant="primary" disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Save size={16} />
          {submitting ? "Saving…" : initialData ? "Save Changes" : "Save Vendor"}
        </KalkiButton>
      </div>
    </form>
  );
}

