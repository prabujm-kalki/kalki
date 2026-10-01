"use client";

import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";

export default function CreatePOPage() {
  const { selected } = useSessionView();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const scheduleId = searchParams.get('scheduleId');
  const queryVendorId = searchParams.get('vendorId');
  const isRoutineMode = !!scheduleId;
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorItems, setVendorItems] = useState<any[]>([]);
  
  const [selectedVendorId, setSelectedVendorId] = useState(queryVendorId || "");
  const [paymentMethod, setPaymentMethod] = useState("credit");
  
  const [error, setError] = useState<string | null>(null);
  const [recentPOs, setRecentPOs] = useState<any[]>([]);

  const fetchRecentPOs = () => {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      limit: "5"
    });
    apiGet<{ purchaseOrders: any[] }>(`/api/purchase-orders?${query.toString()}`).then(res => {
      setRecentPOs(res.purchaseOrders);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchRecentPOs();
  }, [selected]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    apiGet<{ items: any[] }>(`/api/vendors?${query.toString()}`).then(res => {
      setVendors(res.items);
    }).catch(err => {
      console.error(err);
    });
  }, [selected]);

  useEffect(() => {
    if (!selected || !selectedVendorId) {
      setVendorItems([]);
      return;
    }
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      vendorId: selectedVendorId
    });
    apiGet<{ items: any[] }>(`/api/vendor-items?${query.toString()}`).then(res => {
      setVendorItems(res.items.map(i => ({ 
        ...i, 
        orderedQuantity: 0, 
        availableStock: '', // Used for routine mode
        unitRate: i.lastRate || 0 
      })));
    }).catch(console.error);
  }, [selected, selectedVendorId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const linesToSubmit = isRoutineMode ? 
        vendorItems.map(item => {
          const avail = Number(item.availableStock || 0);
          const minStock = Number(item.minimumStock || item.baseMinStock || 0);
          const calculatedQty = (avail < minStock) ? Number(item.normalQuantity || item.targetStock || 1) : 0;
          return { ...item, calculatedQty };
        }).filter(item => item.calculatedQty > 0)
        : vendorItems.filter(item => Number(item.orderedQuantity) > 0);

      const lines = linesToSubmit.map(item => {
        if (!item.itemId) {
          throw new Error(`Item "${item.itemName}" must be mapped to a master catalog item before it can be purchased.`);
        }
        return {
          itemId: item.itemId,
          orderedQuantity: isRoutineMode ? item.calculatedQty : Number(item.orderedQuantity),
          unitRate: Number(item.unitRate)
        };
      });

      if (lines.length === 0 && !isRoutineMode) {
        throw new Error("You must order at least 1 item.");
      }

      const payload: any = {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        vendorId: selectedVendorId,
        paymentMethod: paymentMethod,
        lines: lines
      };
      
      if (scheduleId) {
        payload.scheduleId = scheduleId;
      }

      await apiSend('/api/purchase-orders', 'POST', payload);
      alert("Purchase Order created successfully!");
      router.push(`/purchasing`);
    } catch (err: any) {
      setError(err.message || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Please select a location.</StatusMessage>;

  return (
    <div className="app-main">
      <Link href="/purchasing" className="nav-link">&larr; Back to Purchasing</Link>
      <h1 className="page-title" style={{ marginTop: "1rem" }}>
        {isRoutineMode ? "Routine Assessment" : "Create Purchase Order"}
      </h1>
      
      <form className="panel" onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        {error && <StatusMessage tone="error">{error}</StatusMessage>}
        
        <div className="grid-2">
          <div className="field">
            <label>Select Vendor</label>
            <select required value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} disabled={submitting || isRoutineMode}>
              <option value="" disabled>Choose vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} (Credit Limit: {v.creditLimitAmount ? `₹${v.creditLimitAmount}` : 'None'})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Payment Method</label>
            <select required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={submitting || isRoutineMode}>
              <option value="credit">Standard Credit (Uses Vendor Limit)</option>
              <option value="cash">Cash Upfront / Due on Receipt (Bypasses Limit)</option>
            </select>
          </div>
        </div>

        {selectedVendorId && vendorItems.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3>{isRoutineMode ? "Assess Inventory" : "Items to Order"}</h3>
            <table className="kalki-table" style={{ marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>UoM</th>
                  {isRoutineMode ? (
                    <>
                      <th>Configuration</th>
                      <th>Available Stock</th>
                      <th>Auto-Calculated Order</th>
                    </>
                  ) : (
                    <th>Quantity</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {vendorItems.map((item, index) => {
                  const avail = Number(item.availableStock || 0);
                  const minStock = Number(item.minimumStock || item.baseMinStock || 0);
                  const needsOrder = isRoutineMode && (avail < minStock);
                  const autoQty = needsOrder ? Number(item.normalQuantity || item.targetStock || 1) : 0;
                  const purchaseUnitDisplay = item.purchaseUnit ? ` ${item.purchaseUnit}` : '';
                  
                  return (
                    <tr key={item.id}>
                      <td>{item.itemName}</td>
                      <td>{item.unitOfMeasure}</td>
                      {isRoutineMode ? (
                        <>
                          <td style={{ fontSize: '12px', color: '#6b7280' }}>
                            Min: {item.minimumStock || item.baseMinStock || 0} {item.unitOfMeasure} <br/>
                            Reorder: {item.normalQuantity || item.targetStock || 1}{purchaseUnitDisplay}
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min="0" 
                              placeholder={`Qty in ${item.unitOfMeasure}`}
                              value={item.availableStock} 
                              onChange={e => {
                                const next = [...vendorItems];
                                next[index].availableStock = e.target.value;
                                setVendorItems(next);
                              }} 
                              style={{ width: "120px" }}
                            />
                          </td>
                          <td>
                            <span style={{ fontWeight: needsOrder ? 'bold' : 'normal', color: needsOrder ? '#16a34a' : '#9ca3af' }}>
                              {autoQty > 0 ? `${autoQty}${purchaseUnitDisplay}` : 'No order needed'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td>
                          <input 
                            type="number" 
                            min="0" 
                            value={item.orderedQuantity} 
                            onChange={e => {
                              const next = [...vendorItems];
                              next[index].orderedQuantity = e.target.value;
                              setVendorItems(next);
                            }} 
                            style={{ width: "100px" }}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedVendorId && vendorItems.length === 0 && (
          <StatusMessage tone="empty">This vendor does not have any items linked in their catalog.</StatusMessage>
        )}

        <div className="form-actions" style={{ marginTop: "2rem", justifyContent: "flex-end", display: "flex", gap: "1rem" }}>
          <button type="submit" className="action-button" disabled={submitting || !selectedVendorId}>
            {submitting ? "Submitting..." : "Submit PO"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Recent History (Verification)</h3>
        {recentPOs.length > 0 ? (
          <table className="kalki-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentPOs.map(po => (
                <tr key={po.id} style={{ opacity: 0.8 }}>
                  <td>{po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5)}</td>
                  <td>{po.vendorName}</td>
                  <td>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td>
                    {po.status === 'approved' ? (
                      <span style={{ color: 'green', fontWeight: 500 }}>Approve</span>
                    ) : po.status === 'rejected' ? (
                      <span style={{ color: 'red', fontWeight: 500 }}>Reject</span>
                    ) : (
                      <span style={{ textTransform: 'capitalize' }}>{po.status}</span>
                    )}
                  </td>
                  <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(po.totalAmount))}</td>
                  <td>
                    {(po.status === 'approved' || po.status === 'sent_to_vendor') && po.poDeliveryMethod === 'WHATSAPP' && (
                      <button 
                        onClick={async () => {
                          const poNum = po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5);
                          const publicUrl = window.location.origin + '/public/po/' + po.publicToken;
                          let text = '';
                          
                          if (po.poWhatsappPreference === 'TEXT_ONLY') {
                            text = `Hello, please find Purchase Order #${poNum} for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(po.totalAmount))}.`;
                          } else if (po.poWhatsappPreference === 'PDF_LINK_ONLY') {
                            text = `Hello, view and download Purchase Order #${poNum} here: ${publicUrl}`;
                          } else {
                            text = `Hello, please find Purchase Order #${poNum} for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(po.totalAmount))}.\n\nView and download the PDF here: ${publicUrl}`;
                          }
                          
                          const phone = po.vendorPhone?.phone?.replace(/\D/g, '') || '';
                          const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
                          
                          // Mark as sent in DB
                          try {
                            await apiSend(`/api/purchase-orders/${po.id}/mark-sent`, "POST", {});
                            // Open WA
                            window.open(waUrl, '_blank');
                            // Refresh list
                            fetchRecentPOs();
                          } catch (e) {
                            console.error("Failed to mark as sent", e);
                            window.open(waUrl, '_blank');
                          }
                        }}
                        style={{ 
                          padding: '4px 8px', 
                          backgroundColor: po.status === 'sent_to_vendor' ? '#9ca3af' : '#25D366', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          fontSize: '12px',
                          marginRight: '8px'
                        }}
                      >
                        {po.status === 'sent_to_vendor' ? 'Sent (Resend)' : 'Send via WhatsApp'}
                      </button>
                    )}
                    {po.status === 'sent_to_vendor' && (
                      <Link href={`/purchasing/receive/${po.id}`} style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '12px', display: 'inline-block', marginRight: '8px' }}>
                        Receive Goods
                      </Link>
                    )}
                    {po.status === 'received' && (
                      <Link href={`/purchasing/cashier/${po.id}`} style={{ padding: '4px 8px', backgroundColor: '#f59e0b', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '12px', display: 'inline-block', marginRight: '8px' }}>
                        Cashier Verify
                      </Link>
                    )}
                    {po.status === 'pending_audit' && (
                      <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>Pending Audit</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No recent purchase orders found.</p>
        )}
      </div>
    </div>
  );
}
