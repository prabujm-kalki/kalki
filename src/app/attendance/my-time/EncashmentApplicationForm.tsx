"use client";

import { useState } from "react";
import { submitEncashmentRequest } from "@/domains/attendance/actions";
import { useRouter } from "next/navigation";

type LeaveType = {
  id: string;
  name: string;
  isEncashable: boolean;
};

export function EncashmentApplicationForm({
  leaveTypes,
  balances,
  organizationId,
  locationId,
  employeeId
}: {
  leaveTypes: LeaveType[];
  balances: { leaveTypeId: string; closingBalance: string }[];
  organizationId: string;
  locationId: string;
  employeeId: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [encashmentDays, setEncashmentDays] = useState("");
  const [reason, setReason] = useState("");

  const encashableTypes = leaveTypes.filter(lt => lt.isEncashable);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveTypeId || !encashmentDays || !reason) {
      window.alert("Please fill out all required fields.");
      return;
    }

    const days = parseFloat(encashmentDays);
    if (isNaN(days) || days <= 0) {
      window.alert("Please enter a valid number of days to encash.");
      return;
    }

    const balance = balances.find(b => b.leaveTypeId === leaveTypeId);
    const closingBalance = balance ? parseFloat(balance.closingBalance) : 0;

    if (days > closingBalance) {
      window.alert(`Insufficient balance. You only have ${closingBalance} days available.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        employeeId,
        leaveTypeId,
        encashmentDays: days,
        reason,
      };

      const res = await submitEncashmentRequest(payload, organizationId, locationId);
      if (res.success) {
        setLeaveTypeId("");
        setEncashmentDays("");
        setReason("");
        window.alert("Encashment request submitted successfully!");
        router.refresh();
      } else {
        window.alert(res.error || "Failed to submit request.");
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="field">
          <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--att-text-muted)" }}>Leave Type *</label>
          <select className="att-input-premium" value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)} required>
            <option value="">Select an encashable leave type</option>
            {encashableTypes.map(lt => {
              const bal = balances.find(b => b.leaveTypeId === lt.id);
              const balText = bal ? ` (Balance: ${bal.closingBalance} days)` : "";
              return (
                <option key={lt.id} value={lt.id}>
                  {lt.name}{balText}
                </option>
              );
            })}
          </select>
        </div>

        <div className="field">
          <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--att-text-muted)" }}>Days to Encash *</label>
          <input 
            type="number" 
            className="att-input-premium"
            step="0.5" 
            min="0.5" 
            value={encashmentDays} 
            onChange={e => setEncashmentDays(e.target.value)} 
            required 
            placeholder="e.g. 5"
          />
        </div>

        <div className="field">
          <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--att-text-muted)" }}>Reason *</label>
          <textarea 
            className="att-input-premium"
            rows={3} 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            required 
            placeholder="Reason for encashment..."
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button type="submit" className="att-button-premium" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Encashment Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
