"use client";

import React, { useState } from "react";
import { Save, Loader2, ArrowLeft, Trash2, CalendarClock, ClipboardCheck, Truck, Receipt } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

interface ConfigFormProps {
  vendors: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  initialData?: {
    id: string;
    vendorId: string;
    responsibleRoleId: string;
    reviewRoleId: string | null;
    billReviewRoleId: string | null;
    frequencyRule: string;
    reminderTime: string;
    taskDefinitionId: string | null;
  };
  taskDefinitions?: { 
    id: string; 
    title: string;
    module?: string | null;
    completionTimeMins?: number | null;
  }[];
}

export default function RoutineConfigForm({ vendors, roles, initialData, taskDefinitions = [] }: ConfigFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected } = useSessionView();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter task rules by module
  const purchaseTaskRules = taskDefinitions.filter(
    (td) => td.module === "purchase" || !td.module || td.module === "system"
  );
  const financeTaskRules = taskDefinitions.filter(
    (td) => td.module === "finance" || td.title.toLowerCase().includes("cashier") || td.title.toLowerCase().includes("bill")
  );

  // Parse initial frequency rule
  const initRule = initialData?.frequencyRule || "DAILY";
  const isWeekly = initRule.startsWith("WEEKLY:");
  const isBiweekly = initRule.startsWith("BIWEEKLY:");
  const isMonthly = initRule.startsWith("MONTHLY:");

  const [vendorId, setVendorId] = useState(initialData?.vendorId || vendors[0]?.id || "");
  const [roleId, setRoleId] = useState(initialData?.responsibleRoleId || roles[0]?.id || "");
  const [reviewRoleId, setReviewRoleId] = useState(initialData?.reviewRoleId || "");
  const [billReviewRoleId, setBillReviewRoleId] = useState(initialData?.billReviewRoleId || "");
  
  const [frequency, setFrequency] = useState(
    isWeekly ? "WEEKLY" : isBiweekly ? "BIWEEKLY" : isMonthly ? "MONTHLY" : "DAILY"
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    (isWeekly || isBiweekly) ? initRule.split(":")[1] : "MONDAY"
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    isMonthly ? initRule.split(":")[1] : "1"
  );
  const [reminderTime, setReminderTime] = useState(initialData?.reminderTime || "09:00");
  const [priority, setPriority] = useState((initialData as any)?.priority || "medium");
  const [taskDefinitionId, setTaskDefinitionId] = useState(initialData?.taskDefinitionId || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Please select a location from the top navigation bar.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Construct the rule based on frequency
    let finalRule = frequency;
    if (frequency === "WEEKLY" || frequency === "BIWEEKLY") {
      finalRule = `${frequency}:${dayOfWeek}`;
    } else if (frequency === "MONTHLY") {
      finalRule = `MONTHLY:${dayOfMonth}`;
    }
    
    try {
      const url = initialData ? `/api/purchasing/schedules/${initialData.id}` : "/api/purchasing/schedules";
      const method = initialData ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          vendorId,
          responsibleRoleId: roleId,
          reviewRoleId: reviewRoleId || null,
          billReviewRoleId: billReviewRoleId || null,
          frequencyRule: finalRule,
          reminderTime,
          priority,
          taskDefinitionId: taskDefinitionId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save configuration.");

      const qs = searchParams.toString();
      const suffix = qs ? `&${qs}` : '';
      router.push(`/purchasing/configuration?success=schedule_saved${suffix}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !confirm("Are you sure you want to delete this schedule?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/purchasing/schedules/${initialData.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      
      const qs = searchParams.toString();
      const suffix = qs ? `&${qs}` : '';
      router.push(`/purchasing/configuration?success=schedule_deleted${suffix}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="kalki-main-content" style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <div className="kalki-page-header" style={{ marginBottom: "24px" }}>
        <button 
          onClick={() => router.back()} 
          className="kalki-breadcrumbs"
          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, cursor: 'pointer', color: 'var(--kalki-text-secondary, #64748b)', fontSize: '13px', marginBottom: '8px' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="kalki-page-title" style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--text-color, #0f172a)" }}>
          {initialData ? "Edit Routine Purchasing Pipeline" : "Configure Routine Purchasing Pipeline"}
        </h1>
        <p className="kalki-page-description" style={{ fontSize: "13px", color: "var(--kalki-text-secondary, #64748b)", marginTop: "4px" }}>
          Define the automated end-to-end procurement cycle: Stock Assessment $\rightarrow$ Goods Receiving $\rightarrow$ Cashier Invoice Verification.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: "12px 16px", backgroundColor: "#f8e3df", border: "1px solid #c96b5d", color: "#c96b5d", borderRadius: "8px", marginBottom: "20px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* STEP 1: ROUTINE SCHEDULE & TRIGGER */}
          <div className="card" style={{ padding: "20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <CalendarClock size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                  1. Routine Trigger & Schedule
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  When should this automated order cycle trigger?
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Vendor (Supplier) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select 
                  value={vendorId} 
                  onChange={(e) => setVendorId(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  required
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Frequency <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select 
                  value={frequency} 
                  onChange={(e) => setFrequency(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="DAILY">Daily (Every Day)</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {(frequency === "WEEKLY" || frequency === "BIWEEKLY") && (
                <div className="kalki-field">
                  <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                    Day of the Week <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select 
                    value={dayOfWeek} 
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="kalki-select"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="MONDAY">Every Monday</option>
                    <option value="TUESDAY">Every Tuesday</option>
                    <option value="WEDNESDAY">Every Wednesday</option>
                    <option value="THURSDAY">Every Thursday</option>
                    <option value="FRIDAY">Every Friday</option>
                    <option value="SATURDAY">Every Saturday</option>
                    <option value="SUNDAY">Every Sunday</option>
                  </select>
                </div>
              )}

              {frequency === "MONTHLY" && (
                <div className="kalki-field">
                  <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                    Day of the Month <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select 
                    value={dayOfMonth} 
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="kalki-select"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Trigger Time (24H) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input 
                  type="time" 
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="kalki-input"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  required
                />
              </div>

              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Order Priority <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  required
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="high">High (Perishable)</option>
                  <option value="critical">Critical / Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: NIGHT STOCK ASSESSMENT & PO CREATION */}
          <div className="card" style={{ padding: "20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                  2. Stage 1: Stock Assessment & PO Approval
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Kitchen stock counting and manager authorization.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Stock Count Role (Assignee) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select 
                  value={roleId} 
                  onChange={(e) => setRoleId(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  required
                >
                  <option value="">-- Select Responsible Role --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Staff member physically counting stock (e.g., Tandoori Chef, Kitchen Team).
                </span>
              </div>

              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Assessment SLA & Escalation Policy <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select 
                  value={taskDefinitionId} 
                  onChange={(e) => setTaskDefinitionId(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  required
                >
                  <option value="">-- Select Purchasing Task Rule --</option>
                  {purchaseTaskRules.map(td => (
                    <option key={td.id} value={td.id}>
                      {td.title} {td.completionTimeMins ? `(${td.completionTimeMins} mins SLA)` : ""}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Sets the completion deadline (e.g. 4 Hours) and escalation to Head Chef/Manager.
                </span>
              </div>

              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Purchase Order Approver Role
                </label>
                <select 
                  value={reviewRoleId} 
                  onChange={(e) => setReviewRoleId(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="">-- Default: Store Manager / ED --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Authorized role to review and approve the PO before dispatch to vendor.
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3: MORNING GOODS RECEIPT & CHECK-IN */}
          <div className="card" style={{ padding: "20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
                <Truck size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                  3. Stage 2: Goods Receipt & Verification
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Supplier delivery arrival window and physical check-in.
                </p>
              </div>
            </div>

            <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.5 }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>
                    ℹ️ Delivery SLA & Arrival Window:
                  </p>
                  <p style={{ margin: 0, color: "#64748b" }}>
                    Expected arrival time (e.g. <strong>Next Morning 07:30 AM</strong> for Vegetables/Meat, or <strong>2 Lead Days</strong> for Groceries) is configured under the vendor master profile (<strong>Purchasing $\rightarrow$ Vendors</strong>).
                    When the shipment arrives, the <strong>{roles.find(r => r.id === roleId)?.name || "Responsible Role"}</strong> or Kitchen Team verifies quantities on the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: CASHIER BILL & INVOICE AUDIT */}
          <div className="card" style={{ padding: "20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                <Receipt size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                  4. Stage 3: Cashier Bill & Invoice Verification
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Accounts verification of physical invoice/voucher after delivery.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Bill Reviewer Role (Cashier / Finance)
                </label>
                <select 
                  value={billReviewRoleId} 
                  onChange={(e) => setBillReviewRoleId(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="">-- Optional: Select Bill Reviewer Role --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Designated role to verify the physical invoice against the received PO before payment.
                </span>
              </div>

              <div className="kalki-field">
                <label className="kalki-label" style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Finance Audit SLA Policy
                </label>
                <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>
                    {financeTaskRules[0]?.title || "Cashier audit"}
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "99px", fontWeight: 600 }}>
                    {financeTaskRules[0]?.completionTimeMins ? `${financeTaskRules[0].completionTimeMins} mins SLA` : "120 mins SLA"}
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Configured under <strong>Settings $\rightarrow$ Tasks</strong> (Module: Finance).
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div>
            {initialData && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="kalki-button kalki-button--danger"
                style={{ display: "inline-flex", alignItems: "center", gap: '8px', padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#ef4444", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={15} />}
                Delete Schedule
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="kalki-button kalki-button--primary"
            style={{ display: "inline-flex", alignItems: "center", gap: '8px', padding: "8px 20px", borderRadius: "6px", border: "none", backgroundColor: "#7c3a27", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer", boxShadow: "0 1px 2px rgba(124, 58, 39, 0.2)" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={15} />}
            {initialData ? "Save Pipeline Changes" : "Save Purchasing Pipeline"}
          </button>
        </div>
      </form>
    </div>
  );
}
