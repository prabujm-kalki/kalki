"use client";

import React, { useState, useEffect } from "react";
import { createCreditNote, fetchCustomers } from "@/app/sales/actions";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  locationId: string;
}

export default function CreateCreditNoteModal({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
  locationId,
}: CreateCreditNoteModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [sourceReturnId, setSourceReturnId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setIsLoadingCustomers(true);
      // Assuming fetchCustomers takes organizationId as argument or handles isolation internally
      fetchCustomers(organizationId)
        .then((res) => {
          if (isMounted) {
            setCustomers(res.customers || res.data || res); // Adapting to possible return types
            setIsLoadingCustomers(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error(err);
            setIsLoadingCustomers(false);
          }
        });
    }

    if (isOpen) {
      setTotalAmount("");
      setSelectedCustomerId("");
      setSourceReturnId("");
      setError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, organizationId]);

  if (!isOpen) return null;

  const currentInputAmount = parseFloat(totalAmount || "0");
  
  const isSubmitDisabled = 
    !selectedCustomerId || 
    !totalAmount || 
    currentInputAmount <= 0 || 
    isSubmitting;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await createCreditNote({
        organizationId,
        locationId,
        customerId: selectedCustomerId,
        sourceReturnId: sourceReturnId || undefined,
        totalAmount,
      });

      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create credit note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.5rem", width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600", color: "#111827" }}>Create Credit Note</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>Issue a manual credit note to a customer.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "0.375rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
          
          {/* Customer Selection */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>Select Customer <span style={{ color: "red" }}>*</span></label>
            {isLoadingCustomers ? (
               <div style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "0.375rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                 <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Fetching customers...
               </div>
            ) : (
              <select 
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", backgroundColor: "white", outline: "none" }}
              >
                <option value="" disabled>-- Select a customer --</option>
                {customers?.length > 0 ? customers.map(cus => (
                  <option key={cus.id} value={cus.id}>
                    {cus.name} {cus.phone ? `(${cus.phone})` : ''}
                  </option>
                )) : null}
              </select>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>Total Amount <span style={{ color: "red" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontWeight: "500" }}>₹</span>
              <input 
                type="number"
                min="0.01"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                style={{ 
                  width: "100%", padding: "0.75rem 0.75rem 0.75rem 2rem", border: "1px solid #d1d5db", 
                  borderRadius: "0.375rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" 
                }}
              />
            </div>
          </div>

          {/* Source Return ID (Optional) */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>Source Return ID <span style={{ color: "#9ca3af", fontWeight: "normal" }}>(Optional)</span></label>
            <input 
              type="text"
              value={sourceReturnId}
              onChange={(e) => setSourceReturnId(e.target.value)}
              placeholder="e.g. RET-123456789"
              style={{ 
                width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", 
                borderRadius: "0.375rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" 
              }}
            />
          </div>
          
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.25rem" }}>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", backgroundColor: "white", color: "#374151", fontSize: "0.875rem", fontWeight: "500", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitDisabled}
            style={{ 
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "none", borderRadius: "0.375rem", 
              backgroundColor: isSubmitDisabled ? "#93c5fd" : "#2563eb", color: "white", fontSize: "0.875rem", fontWeight: "500", 
              cursor: isSubmitDisabled ? "not-allowed" : "pointer" 
            }}>
            {isSubmitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={16} />}
            {isSubmitting ? "Processing..." : "Create Credit Note"}
          </button>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
