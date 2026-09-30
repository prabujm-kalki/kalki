"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function POReceivePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [vendorName, setVendorName] = useState("");
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPODetails();
  }, [params.id]);

  const fetchPODetails = async () => {
    try {
      const res = await fetch(`/api/purchase-orders/${params.id}/receive-details`);
      if (!res.ok) throw new Error("Failed to load PO details");
      const data = await res.json();
      setPo(data.po);
      setVendorName(data.vendorName);
      
      // Initialize receiving quantities with ordered quantities
      const initializedLines = data.lines.map((l: any) => ({
        ...l,
        receivedQuantity: l.orderedQuantity,
        isZero: false
      }));
      setLines(initializedLines);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (index: number, value: string) => {
    const newLines = [...lines];
    newLines[index].receivedQuantity = value;
    newLines[index].isZero = false;
    setLines(newLines);
  };

  const handleSetZero = (index: number) => {
    const newLines = [...lines];
    newLines[index].receivedQuantity = "0";
    newLines[index].isZero = true;
    setLines(newLines);
  };

  const handleSetOk = (index: number) => {
    const newLines = [...lines];
    newLines[index].receivedQuantity = newLines[index].orderedQuantity;
    newLines[index].isZero = false;
    setLines(newLines);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    
    try {
      const res = await fetch(`/api/purchase-orders/${params.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedLines: lines.map(l => ({
            id: l.id,
            orderedQuantity: l.orderedQuantity,
            receivedQuantity: l.receivedQuantity
          }))
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit goods receipt");
      }

      alert("Goods received successfully.");
      router.push("/purchasing");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <><div style={{ padding: 24 }}>Loading...</div></>;
  if (error && !po) return <><div style={{ padding: 24, color: 'red' }}>{error}</div></>;

  return (
    <>
      <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Goods Receipt</h1>
            <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>PO: {po.id.substring(0,8).toUpperCase()} | Vendor: {vendorName}</p>
          </div>
          <div style={{ padding: '6px 12px', backgroundColor: '#eef2ff', color: '#4f46e5', borderRadius: '4px', fontWeight: 500 }}>
            Status: {po.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border-color)" }}>
              <tr>
                <th style={{ padding: "12px", textAlign: "left" }}>Item Name</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Ordered Qty</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Received Qty</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} style={{ borderBottom: idx === lines.length - 1 ? "none" : "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px" }}>{line.itemName}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontWeight: 500 }}>{line.orderedQuantity}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.receivedQuantity}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                      style={{ 
                        width: "100px", 
                        padding: "8px", 
                        borderRadius: "4px", 
                        border: "1px solid var(--border-color)", 
                        textAlign: "center",
                        backgroundColor: line.isZero ? '#fee2e2' : 'white'
                      }}
                    />
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button 
                      onClick={() => handleSetOk(idx)}
                      style={{ marginRight: '8px', padding: '4px 8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      OK
                    </button>
                    <button 
                      onClick={() => handleSetZero(idx)}
                      style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Not Received
                    </button>
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
                backgroundColor: "var(--primary-color)",
                color: "white",
                padding: "10px 24px",
                borderRadius: "6px",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 500
              }}
            >
              {submitting ? "Processing..." : "Confirm Receipt"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
