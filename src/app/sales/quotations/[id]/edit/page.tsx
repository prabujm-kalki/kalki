"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { fetchQuotationById, updateQuotation } from "../../actions";
import { fetchItems } from "@/app/sales/actions";

export default function EditQuotationRatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const quotationId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("organizationId");
  const locId = searchParams.get("locationId");
  const query = orgId && locId ? `?organizationId=${orgId}&locationId=${locId}` : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);
  const [itemList, setItemList] = useState<any[]>([]);

  // Editable fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await fetchQuotationById(quotationId);
      if (res.success && res.data) {
        const q = res.data;
        setQuotation(q);
        setCustomerName(q.customerName || "");
        setCustomerPhone(q.customerPhone || "");
        setCustomerGstin(q.customerGstin || "");
        setValidUntil(q.validUntil ? new Date(q.validUntil).toISOString().split("T")[0] : "");
        setPaymentTerms(q.paymentTerms || "");
        setNotes(q.notes || "");
        setTermsAndConditions(q.termsAndConditions || "");
        setLines(
          q.lines.map((l: any) => ({
            id: l.id,
            itemId: l.itemId,
            itemName: l.itemName,
            hsnCode: l.hsnCode || "",
            uom: l.uom,
            quantity: Number(l.quantity),
            unitRate: Number(l.unitRate),
            discountPercent: Number(l.discountPercent),
            gstRate: Number(l.gstRate),
          }))
        );

        if (q.organizationId && q.locationId) {
          const itemsData = await fetchItems(q.organizationId, q.locationId);
          setItemList(itemsData || []);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [quotationId]);

  const handleLineChange = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    const line = { ...updated[idx], [field]: val };
    if (field === "itemId") {
      const it = itemList.find((item) => item.id === val);
      if (it) {
        line.itemName = it.nameEn || it.nameTa;
        line.hsnCode = it.hsnCode || "";
        line.uom = it.uom || "Unit";
        line.unitRate = Number(it.sellingPrice || it.costPrice || 0);
        line.gstRate = Number(it.gstRate || 5);
      }
    }
    updated[idx] = line;
    setLines(updated);
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        itemId: "",
        itemName: "",
        hsnCode: "",
        uom: "Unit",
        quantity: 1,
        unitRate: 0,
        discountPercent: 0,
        gstRate: 5,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  // Live Totals
  let subtotal = 0;
  let taxableTotal = 0;
  let gstTotal = 0;
  lines.forEach((l) => {
    const qty = Number(l.quantity || 0);
    const rate = Number(l.unitRate || 0);
    const gross = qty * rate;
    const disc = (gross * Number(l.discountPercent || 0)) / 100;
    const taxable = Math.max(0, gross - disc);
    const gst = (taxable * Number(l.gstRate || 0)) / 100;
    subtotal += gross;
    taxableTotal += taxable;
    gstTotal += gst;
  });
  const grandTotal = Math.round(taxableTotal + gstTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      alert("Please ensure at least one valid line item is configured.");
      return;
    }

    setSaving(true);
    const res = await updateQuotation({
      id: quotation.id,
      organizationId: quotation.organizationId,
      locationId: quotation.locationId,
      customerId: quotation.customerId,
      customerName,
      customerPhone,
      customerGstin,
      billingAddress: quotation.billingAddress,
      validUntil,
      paymentTerms,
      notes,
      termsAndConditions,
      lines: validLines,
    });
    setSaving(false);

    if (res.success) {
      alert("Quotation rates and details updated successfully!");
      router.push(`/sales/quotations/${quotation.id}${query}`);
    } else {
      alert(res.error || "Failed to update quotation");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", display: "inline-block" }} />
        <p style={{ marginTop: "8px", fontSize: "14px" }}>Loading quotation for editing...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1050px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href={`/sales/quotations/${quotationId}${query}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Edit Rates: {quotation?.quotationNumber}
            </h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Modify negotiated rates, quantities, and terms
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer & Terms Box */}
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0 0 14px 0" }}>Customer & Terms</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>WhatsApp Mobile</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>
          </div>
        </div>

        {/* Lines & Rates Table */}
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Editable Line Items</h2>
            <button
              type="button"
              onClick={handleAddLine}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Add Line
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "32%" }}>Item</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "10%" }}>UOM</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "12%" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "14%" }}>Unit Rate (₹)</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "10%" }}>Disc %</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "10%" }}>GST %</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#475569", width: "12%" }}>Total</th>
                  <th style={{ width: "4%" }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const qty = Number(line.quantity || 0);
                  const rate = Number(line.unitRate || 0);
                  const gross = qty * rate;
                  const disc = (gross * Number(line.discountPercent || 0)) / 100;
                  const taxable = Math.max(0, gross - disc);
                  const gst = (taxable * Number(line.gstRate || 0)) / 100;
                  const rowTotal = taxable + gst;

                  return (
                    <tr key={line.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 6px" }}>
                        <select
                          value={line.itemId}
                          onChange={(e) => handleLineChange(idx, "itemId", e.target.value)}
                          required
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                        >
                          <option value="">-- Choose Item --</option>
                          {itemList.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.nameEn || it.nameTa}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="text"
                          value={line.uom}
                          onChange={(e) => handleLineChange(idx, "uom", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "center" }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", e.target.value === "" ? 0 : Number(e.target.value))}
                          required
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right" }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={line.unitRate}
                          onChange={(e) => handleLineChange(idx, "unitRate", e.target.value === "" ? 0 : Number(e.target.value))}
                          required
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={line.discountPercent}
                          onChange={(e) => handleLineChange(idx, "discountPercent", e.target.value === "" ? 0 : Number(e.target.value))}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right" }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <select
                          value={line.gstRate}
                          onChange={(e) => handleLineChange(idx, "gstRate", Number(e.target.value))}
                          style={{ width: "100%", padding: "6px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", textAlign: "right" }}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: "700", color: "#0f172a", fontSize: "13px" }}>
                        ₹{rowTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: lines.length === 1 ? "not-allowed" : "pointer",
                            color: lines.length === 1 ? "#cbd5e1" : "#ef4444",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <div style={{ width: "280px", border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#64748b" }}>
                <span>Taxable Amount:</span>
                <span>₹{taxableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#64748b" }}>
                <span>GST Amount:</span>
                <span>₹{gstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "700", color: "#0f172a", backgroundColor: "#f8fafc" }}>
                <span>Updated Grand Total:</span>
                <span style={{ color: "#16a34a" }}>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Link
            href={`/sales/quotations/${quotationId}${query}`}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

