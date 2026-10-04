"use client";

import React, { useState } from "react";
import { Save, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

interface ConfigFormProps {
  vendors: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  initialData?: {
    id: string;
    vendorId: string;
    responsibleRoleId: string;
    frequencyRule: string;
    reminderTime: string;
    taskDefinitionId: string | null;
  };
  taskDefinitions?: { id: string; title: string }[];
}

export default function RoutineConfigForm({ vendors, roles, initialData, taskDefinitions = [] }: ConfigFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected } = useSessionView();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse initial frequency rule
  const initRule = initialData?.frequencyRule || "DAILY";
  const isWeekly = initRule.startsWith("WEEKLY:");
  const isBiweekly = initRule.startsWith("BIWEEKLY:");
  const isMonthly = initRule.startsWith("MONTHLY:");

  const [vendorId, setVendorId] = useState(initialData?.vendorId || vendors[0]?.id || "");
  const [roleId, setRoleId] = useState(initialData?.responsibleRoleId || roles[0]?.id || "");
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
      router.push(`/purchasing/schedules?success=schedule_saved${suffix}`);
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
      router.push(`/purchasing/schedules?success=schedule_deleted${suffix}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <button 
          onClick={() => router.back()} 
          className="kalki-breadcrumbs"
          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="kalki-page-title">{initialData ? "Edit Routine Task" : "Configure Routine Assessment Task"}</h1>
        <p className="kalki-page-description">Set up an automated schedule for purchasing assessments (e.g., Daily Vegetable Order).</p>
      </div>

      <div className="kalki-section">
        <form onSubmit={handleSubmit} className="kalki-section-content">
          {error && (
            <div style={{ padding: "12px", backgroundColor: "#f8e3df", border: "1px solid #c96b5d", color: "#c96b5d", borderRadius: "8px", marginBottom: "20px" }}>
              {error}
            </div>
          )}

          <div className="kalki-grid-2-col">
            <div className="kalki-field">
              <label className="kalki-label">Vendor (Items Source) <span className="kalki-required">*</span></label>
              <select 
                value={vendorId} 
                onChange={(e) => setVendorId(e.target.value)}
                className="kalki-select"
                required
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="kalki-field">
              <label className="kalki-label">Responsible Role <span className="kalki-required">*</span></label>
              <select 
                value={roleId} 
                onChange={(e) => setRoleId(e.target.value)}
                className="kalki-select"
                required
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="kalki-field">
              <label className="kalki-label">Frequency <span className="kalki-required">*</span></label>
              <select 
                value={frequency} 
                onChange={(e) => setFrequency(e.target.value)}
                className="kalki-select"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            {(frequency === "WEEKLY" || frequency === "BIWEEKLY") && (
              <div className="kalki-field">
                <label className="kalki-label">Day of the Week <span className="kalki-required">*</span></label>
                <select 
                  value={dayOfWeek} 
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="kalki-select"
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
                <label className="kalki-label">Day of the Month <span className="kalki-required">*</span></label>
                <select 
                  value={dayOfMonth} 
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="kalki-select"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="kalki-field">
              <label className="kalki-label">Trigger Time (24H) <span className="kalki-required">*</span></label>
              <input 
                type="time" 
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="kalki-input"
                required
              />
            </div>

            <div className="kalki-field">
              <label className="kalki-label">Task Execution Rule / Policy <span className="kalki-required">*</span></label>
              <select 
                value={taskDefinitionId} 
                onChange={(e) => setTaskDefinitionId(e.target.value)}
                className="kalki-select"
                required
              >
                <option value="">-- Select Task Rule --</option>
                {taskDefinitions.map(td => (
                  <option key={td.id} value={td.id}>{td.title}</option>
                ))}
              </select>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--kalki-text-secondary)' }}>
                This sets the completion timeout and escalation policy.
              </p>
            </div>
            
            <div className="kalki-field">
              <label className="kalki-label">Priority <span className="kalki-required">*</span></label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className="kalki-select"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Very High</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--kalki-border)' }}>
            <div>
              {initialData && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="kalki-button kalki-button--danger"
                  style={{ gap: '8px' }}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Schedule
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="kalki-button kalki-button--primary"
              style={{ gap: '8px' }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {initialData ? "Save Changes" : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
