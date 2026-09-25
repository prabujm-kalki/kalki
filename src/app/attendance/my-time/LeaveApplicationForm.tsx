"use client";

import { useState, useRef } from "react";
import { submitLeaveRequest } from "@/domains/attendance/actions";
import { Paperclip, Calendar, X } from "lucide-react";
import { useRouter } from "next/navigation";

type LeaveType = {
  id: string;
  name: string;
  isEncashable: boolean;
};

export function LeaveApplicationForm({
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedLeaveType = leaveTypes.find(lt => lt.id === leaveTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || !reason) {
      window.alert("Please fill out all required fields.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (isHalfDay) totalDays = 0.5;

    const balance = balances.find(b => b.leaveTypeId === leaveTypeId);
    const closingBalance = balance ? parseFloat(balance.closingBalance) : 0;

    if (totalDays > closingBalance) {
      window.alert(`Insufficient balance. You only have ${closingBalance} days available.`);
      return;
    }

    setIsSubmitting(true);

    try {
      let evidenceUrl = undefined;
      
      if (file) {
        const formData = new FormData();
        formData.append("evidence", file);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error("Failed to upload attachment");
        }
        
        const uploadData = await uploadRes.json();
        evidenceUrl = uploadData.urls["evidence"];
      }

      const payload = {
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        isHalfDay,
        reason,
        evidenceUrl,
      };

      const res = await submitLeaveRequest(payload, organizationId, locationId);
      if (res.success) {
        setLeaveTypeId("");
        setStartDate("");
        setEndDate("");
        setIsHalfDay(false);
        setReason("");
        setFile(null);
        window.alert("Leave request submitted successfully!");
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
            <option value="">Select a leave type</option>
            {leaveTypes.map(lt => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="field">
            <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--att-text-muted)" }}>Start Date *</label>
            <div style={{ position: "relative" }}>
              <input type="date" className="att-input-premium" value={startDate} onChange={e => setStartDate(e.target.value)} required style={{ paddingLeft: "2.5rem" }} />
              <Calendar size={18} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--att-text-muted)" }} />
            </div>
          </div>
          <div className="field">
            <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--att-text-muted)" }}>End Date *</label>
            <div style={{ position: "relative" }}>
              <input type="date" className="att-input-premium" value={endDate} onChange={e => setEndDate(e.target.value)} required style={{ paddingLeft: "2.5rem" }} />
              <Calendar size={18} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--att-text-muted)" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
          <input type="checkbox" id="halfDay" checked={isHalfDay} onChange={e => setIsHalfDay(e.target.checked)} style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--att-accent)" }} />
          <label htmlFor="halfDay" style={{ fontSize: "0.95rem", margin: 0, fontWeight: 500, color: "var(--att-text)" }}>Request as Half Day</label>
        </div>

        <div className="field">
          <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--att-text-muted)" }}>Reason *</label>
          <textarea className="att-input-premium" rows={3} value={reason} onChange={e => setReason(e.target.value)} required placeholder="Provide a brief reason for your leave..."></textarea>
        </div>

        <div className="field">
          <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--att-text-muted)" }}>Attachment (Optional)</label>
          <div 
            className="att-upload-zone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { 
              e.preventDefault(); 
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={e => e.target.files && setFile(e.target.files[0])} 
            />
            {file ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "var(--att-bg)", border: "1px solid var(--att-border)", borderRadius: "99px" }}>
                <Paperclip size={16} color="var(--att-accent)" />
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{file.name}</span>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}
                >
                  <X size={16} color="#ef4444" />
                </button>
              </div>
            ) : (
              <>
                <div style={{ padding: "0.75rem", background: "var(--att-bg)", borderRadius: "50%", boxShadow: "var(--att-shadow)" }}>
                  <Paperclip size={24} color="var(--att-text-muted)" />
                </div>
                <div>
                  <p style={{ margin: "0", fontSize: "0.95rem", fontWeight: 600, color: "var(--att-primary)" }}>Click to upload or drag and drop</p>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--att-text-muted)" }}>PDF, JPG, PNG up to 10MB</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button type="submit" className="att-button-premium" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
