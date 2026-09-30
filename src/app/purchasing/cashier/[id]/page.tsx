"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CashierVerifyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [vendorName, setVendorName] = useState("");
  const [lines, setLines] = useState<any[]>([]);
  
  const [cashierBillAmount, setCashierBillAmount] = useState("");
  const [cashierPaymentMethod, setCashierPaymentMethod] = useState("CASH");
  const [attachments, setAttachments] = useState<{type: string, url: string}[]>([]);
  
  // Dummy states for file uploading in UI
  const [billUrl, setBillUrl] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");
  const [neftId, setNeftId] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPODetails();
  }, [params.id]);

  const fetchPODetails = async () => {
    try {
      const res = await fetch(`/api/purchase-orders/${params.id}/cashier-details`);
      if (!res.ok) throw new Error("Failed to load PO details");
      const data = await res.json();
      setPo(data.po);
      setVendorName(data.vendorName);
      
      const initializedLines = data.lines.map((l: any) => ({
        ...l,
        verifiedUnitRate: l.suggestedRate,
      }));
      setLines(initializedLines);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (index: number, value: string) => {
    const newLines = [...lines];
    newLines[index].verifiedUnitRate = value;
    setLines(newLines);
  };

  const calculatedTotal = lines.reduce((sum, line) => {
    return sum + (Number(line.receivedQuantity) * Number(line.verifiedUnitRate));
  }, 0);

  const handleSubmit = async () => {
    setError("");

    if (!cashierBillAmount) {
      setError("Bill amount is required.");
      return;
    }

    if (cashierPaymentMethod === "CASH" && (!billUrl || !voucherUrl)) {
      setError("Bill and Signed Voucher attachments are mandatory for CASH payments.");
      return;
    }

    if (cashierPaymentMethod === "CREDIT" && !billUrl) {
      setError("Bill attachment is mandatory for CREDIT payments.");
      return;
    }
    
    if (cashierPaymentMethod === "NEFT" && (!billUrl || !neftId)) {
      setError("Bill attachment and NEFT ID are mandatory for NEFT payments.");
      return;
    }

    setSubmitting(true);
    
    // Construct attachments
    const atts = [];
    if (billUrl) atts.push({ type: "BILL", url: billUrl });
    if (voucherUrl && cashierPaymentMethod === "CASH") atts.push({ type: "VOUCHER", url: voucherUrl });
    if (neftId && cashierPaymentMethod === "NEFT") atts.push({ type: "NEFT_ID", text: neftId });

    try {
      const res = await fetch(`/api/purchase-orders/${params.id}/cashier-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifiedLines: lines.map(l => ({
            id: l.id,
            itemId: l.itemId,
            verifiedUnitRate: l.verifiedUnitRate
          })),
          cashierBillAmount,
          cashierPaymentMethod,
          cashierAttachments: atts,
          calculatedTotal,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit verification");
      }

      alert("Cashier verification submitted for Audit.");
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
            <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Cashier Verification</h1>
            <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>PO: {po.id.substring(0,8).toUpperCase()} | Vendor: {vendorName}</p>
          </div>
          <div style={{ padding: '6px 12px', backgroundColor: '#fff7ed', color: '#ea580c', borderRadius: '4px', fontWeight: 500 }}>
            Status: PENDING CASHIER
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Left Column: Lines */}
          <div style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
            <h3 style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>Verify Item Rates</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border-color)", fontSize: "12px" }}>
                <tr>
                  <th style={{ padding: "12px", textAlign: "left" }}>Item Name</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Recv Qty</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Last Rate (₹)</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.id} style={{ borderBottom: idx === lines.length - 1 ? "none" : "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px" }}>{line.itemName}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontWeight: 500 }}>{line.receivedQuantity}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.verifiedUnitRate}
                        onChange={(e) => handleRateChange(idx, e.target.value)}
                        style={{ 
                          width: "80px", 
                          padding: "6px", 
                          borderRadius: "4px", 
                          border: "1px solid var(--border-color)", 
                          textAlign: "center"
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: 500 }}>
                      {(Number(line.receivedQuantity) * Number(line.verifiedUnitRate)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "16px", backgroundColor: "var(--background)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>System Calculated Total:</span>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "var(--primary-color)" }}>₹{calculatedTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Right Column: Inputs */}
          <div style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>Bill Details</h3>
            
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>Actual Bill Amount (₹)</label>
              <input 
                type="number" 
                value={cashierBillAmount}
                onChange={(e) => setCashierBillAmount(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}
                placeholder="Enter bill amount"
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>Payment Method</label>
              <select 
                value={cashierPaymentMethod}
                onChange={(e) => setCashierPaymentMethod(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}
              >
                <option value="CASH">Cash</option>
                <option value="CREDIT">Credit</option>
                <option value="NEFT">NEFT</option>
              </select>
            </div>

            <div style={{ border: "1px dashed var(--border-color)", padding: "12px", borderRadius: "4px", backgroundColor: "var(--background)" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>Attach Bill (Mandatory)</label>
              <input 
                type="text" 
                value={billUrl}
                onChange={(e) => setBillUrl(e.target.value)}
                placeholder="Paste Bill URL / Upload"
                style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border-color)", fontSize: "12px" }}
              />
            </div>

            {cashierPaymentMethod === "CASH" && (
              <div style={{ border: "1px dashed var(--border-color)", padding: "12px", borderRadius: "4px", backgroundColor: "var(--background)" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>Attach Signed Voucher (Mandatory)</label>
                <input 
                  type="text" 
                  value={voucherUrl}
                  onChange={(e) => setVoucherUrl(e.target.value)}
                  placeholder="Paste Voucher URL / Upload"
                  style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border-color)", fontSize: "12px" }}
                />
              </div>
            )}

            {cashierPaymentMethod === "NEFT" && (
              <div style={{ border: "1px dashed var(--border-color)", padding: "12px", borderRadius: "4px", backgroundColor: "var(--background)" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500 }}>NEFT Transaction ID (Mandatory)</label>
                <input 
                  type="text" 
                  value={neftId}
                  onChange={(e) => setNeftId(e.target.value)}
                  placeholder="Enter NEFT ID"
                  style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border-color)", fontSize: "12px" }}
                />
              </div>
            )}

            <button 
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                marginTop: "16px",
                backgroundColor: "var(--primary-color)",
                color: "white",
                padding: "12px",
                borderRadius: "6px",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 600,
                width: "100%"
              }}
            >
              {submitting ? "Processing..." : "Submit to Manager Audit"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
