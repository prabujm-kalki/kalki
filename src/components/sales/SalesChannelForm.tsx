"use client";

import { useState } from "react";
import { apiSend } from "@/lib/api";

type SalesChannelData = {
  id?: string;
  name: string;
  type: string;
  fulfillmentType: string;
  requiresDispatch: boolean;
  platformFeePercentage?: number;
};

export function SalesChannelForm({
  organizationId,
  locationId,
  initialData,
  onCancel,
  onSuccess,
}: {
  organizationId: string;
  locationId?: string;
  initialData?: SalesChannelData;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<SalesChannelData>(
    initialData || {
      name: "",
      type: "IN_STORE",
      fulfillmentType: "IMMEDIATE",
      requiresDispatch: false,
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (initialData?.id) {
        await apiSend(`/api/sales/channels?id=${initialData.id}`, "PATCH", formData);
      } else {
        await apiSend("/api/sales/channels", "POST", { ...formData, organizationId, locationId });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <h3>{initialData?.id ? "Edit Sales Channel" : "New Sales Channel"}</h3>
      
      <div className="grid-2">
        <label className="stack">
          <span>Channel Name *</span>
          <input
            className="input"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Swiggy, Zomato, Dine-In"
          />
        </label>
        
        <label className="stack">
          <span>Channel Type</span>
          <select
            className="input"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="IN_STORE">In-Store (Dine-in / Walk-in)</option>
            <option value="AGGREGATOR">Aggregator (Swiggy / Zomato)</option>
            <option value="CORPORATE">Corporate / B2B Catering</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </div>

      <div className="grid-2">
        <label className="stack">
          <span>Fulfillment Type</span>
          <select
            className="input"
            value={formData.fulfillmentType}
            onChange={(e) => setFormData({ ...formData, fulfillmentType: e.target.value })}
          >
            <option value="IMMEDIATE">Immediate (POS)</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="DISPATCH">Dispatch / Delivery</option>
          </select>
        </label>
        
        {formData.type === "AGGREGATOR" && (
          <label className="stack">
            <span>Platform Fee % (Optional)</span>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.platformFeePercentage || ""}
              onChange={(e) => setFormData({ ...formData, platformFeePercentage: parseFloat(e.target.value) })}
              placeholder="e.g. 22.5"
            />
          </label>
        )}
      </div>

      <label className="row" style={{ alignItems: "center", gap: "0.5rem" }}>
        <input
          type="checkbox"
          checked={formData.requiresDispatch}
          onChange={(e) => setFormData({ ...formData, requiresDispatch: e.target.checked })}
        />
        <span>Requires separate dispatch / packing process?</span>
      </label>

      {error && <div style={{ color: "var(--danger)" }}>{error}</div>}

      <div className="row" style={{ justifyContent: "flex-end", gap: "1rem" }}>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="action-button" disabled={loading}>
          {loading ? "Saving..." : "Save Channel"}
        </button>
      </div>
    </form>
  );
}
