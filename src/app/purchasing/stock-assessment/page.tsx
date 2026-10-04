"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

interface VendorItem {
  id: string;
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  minimumStock: number;
  normalQuantity: number;
  lastRate: number;
  baseMinStock?: number;
  targetStock?: number;
}

export default function StockAssessmentPage() {
  const { selected } = useSessionView();
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const taskId = searchParams.get("taskId");
  const urlVendorId = searchParams.get("vendorId");

  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState(urlVendorId || "");
  const [vendorItems, setVendorItems] = useState<VendorItem[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selected) {
      fetchVendors();
    }
  }, [selected]);

  useEffect(() => {
    if (selectedVendorId && selected) {
      fetchVendorItems(selectedVendorId);
    } else {
      setVendorItems([]);
    }
  }, [selectedVendorId, selected]);

  const fetchVendors = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/vendors?organizationId=${selected.organizationId}&locationId=${selected.locationId}`);
      if (!res.ok) throw new Error("Failed to load vendors");
      const data = await res.json();
      setVendors(data.items || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchVendorItems = async (vendorId: string) => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor-items?organizationId=${selected.organizationId}&locationId=${selected.locationId}&vendorId=${vendorId}`);
      if (!res.ok) throw new Error("Failed to load items");
      const data = await res.json();
      const itemsList = data.items || [];
      setVendorItems(itemsList);
      // Initialize inputs
      const initInputs: Record<string, string> = {};
      itemsList.forEach((i: VendorItem) => {
        initInputs[i.itemId] = "";
      });
      setStockInputs(initInputs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (itemId: string, value: string) => {
    setStockInputs(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    
    // Prepare payload
    const inputs = Object.entries(stockInputs)
      .filter(([_, val]) => val !== "")
      .map(([itemId, val]) => ({
        itemId,
        currentStock: Number(val)
      }));

    if (inputs.length === 0) {
      setError("Please enter current stock for at least one item.");
      setSubmitting(false);
      return;
    }

    try {
      // Get location from the first vendor or global state. We'll use locationId from first vendor item
      const res = await fetch("/api/purchasing/stock-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendorId,
          organizationId: selected?.organizationId,
          locationId: selected?.locationId,
          stockInputs: inputs,
          taskId: taskId
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit stock assessment");
      }

      const result = await res.json();
      alert(result.message);
      if (result.created) {
        router.push("/purchasing");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Daily Stock Assessment</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Enter the current available stock for items. The system will automatically generate Purchase Orders for items that have reached their reorder levels.
        </p>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>Select Vendor</label>
          <select 
            value={selectedVendorId} 
            onChange={(e) => setSelectedVendorId(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}
          >
            <option value="">-- Choose a vendor --</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p>Loading items...</p>
        ) : vendorItems.length > 0 ? (
          <div style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border-color)" }}>
                <tr>
                  <th style={{ padding: "12px", textAlign: "left" }}>Item Name</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>UoM</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Reorder Level (Min)</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Target Stock</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Current Available Stock</th>
                </tr>
              </thead>
              <tbody>
                {vendorItems.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: idx === vendorItems.length - 1 ? "none" : "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px" }}>{item.itemName}</td>
                    <td style={{ padding: "12px" }}>{item.unitOfMeasure}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)" }}>{Number(item.minimumStock || item.baseMinStock || 0)}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)" }}>{Number(item.normalQuantity || item.targetStock || 0)}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={stockInputs[item.itemId] || ""}
                        onChange={(e) => handleStockChange(item.itemId, e.target.value)}
                        placeholder="Qty"
                        style={{ width: "120px", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", textAlign: "center" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ padding: "16px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "10px 24px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: 500
                }}
              >
                {submitting ? "Processing..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        ) : selectedVendorId ? (
          <p>No items configured for this vendor. Please configure items first.</p>
        ) : null}
      </div>
    </>
  );
}
