"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { getShifts, saveShift } from "@/domains/settings/shiftActions";
import { Clock, Plus, X, Pencil, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

export function ShiftDefinitionsDashboard() {
  const { selected } = useSessionView();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const initialForm = {
    id: "",
    name: "",
    code: "",
    startTime: "09:00:00",
    endTime: "18:00:00",
    gracePeriodMinutes: 15,
    maxMonthlyLateOccurrences: 3,
    latePenaltyType: "HALF_DAY_DEDUCTION",
    extremeLateThresholdMinutes: 120,
    minHoursHalfDay: "4.00",
    minHoursFullDay: "8.00",
    restBreakMinutes: 60,
    isActive: true
  };

  const [formData, setFormData] = useState(initialForm);

  const loadShifts = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const data = await getShifts(selected.organizationId, selected.locationId);
      setShifts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [selected]);

  const handleOpenNew = () => {
    setFormData(initialForm);
    setError("");
    setIsModalOpen(true);
  };

  const handleEdit = (shift: any) => {
    setFormData({
      id: shift.id,
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodMinutes: shift.gracePeriodMinutes ?? 15,
      maxMonthlyLateOccurrences: shift.maxMonthlyLateOccurrences ?? 3,
      latePenaltyType: shift.latePenaltyType ?? "HALF_DAY_DEDUCTION",
      extremeLateThresholdMinutes: shift.extremeLateThresholdMinutes ?? 120,
      minHoursHalfDay: shift.minHoursHalfDay ?? "4.00",
      minHoursFullDay: shift.minHoursFullDay ?? "8.00",
      restBreakMinutes: shift.restBreakMinutes ?? 60,
      isActive: shift.isActive ?? true
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    
    try {
      await saveShift({
        ...formData,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        id: formData.id || undefined
      });
      setIsModalOpen(false);
      loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shift.");
    } finally {
      setSaving(false);
    }
  };

  if (!selected) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header Row matching Kalki Standard */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "4px", height: "18px", backgroundColor: "var(--kalki-primary, #2563eb)", borderRadius: "4px", display: "inline-block" }}></span>
            Shift Definitions
          </h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--kalki-text-secondary, #64748b)" }}>
            Configure working hours, grace periods, and late penalty rules for {selected.locationName || "this location"}.
          </p>
        </div>
        <button 
          className="kalki-button kalki-button--primary" 
          onClick={handleOpenNew}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={16} /> Add Shift
        </button>
      </div>

      {/* Shifts Card Container */}
      <div className="kalki-table-container" style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>
            Loading shifts...
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto", color: "var(--kalki-text-secondary)" }}>
              <Clock size={24} />
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#1e293b" }}>No Shifts Configured</h3>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.875rem", color: "var(--kalki-text-secondary)" }}>
              Attendance processing and late calculation require at least one active shift.
            </p>
            <button className="kalki-button kalki-button--primary" onClick={handleOpenNew}>
              <Plus size={16} style={{ marginRight: "6px" }} /> Create First Shift
            </button>
          </div>
        ) : (
          <table className="kalki-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Shift</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timing</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grace Period</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Late Policy</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Day Min Hours</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.15s" }}>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "var(--kalki-primary, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Clock size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>
                          {shift.name}
                        </div>
                        <span style={{ display: "inline-block", backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                          {shift.code}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>
                      {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                    </span>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      Break: {shift.restBreakMinutes ?? 60}m
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>
                      +{shift.gracePeriodMinutes ?? 15} mins
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    <div style={{ fontSize: "0.85rem", color: "#1e293b" }}>
                      Max <strong>{shift.maxMonthlyLateOccurrences ?? 3}</strong> / month
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      Penalty: {shift.latePenaltyType === "HALF_DAY_DEDUCTION" ? "0.5 Day Pay" : shift.latePenaltyType === "LEAVE_DEDUCTION" ? "Leave Balance" : "Warning Only"}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle", fontSize: "0.85rem", color: "#334155" }}>
                    <div>Full: <strong>{shift.minHoursFullDay}h</strong></div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Half: {shift.minHoursHalfDay}h</div>
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    {shift.isActive ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#16a34a", fontSize: "0.8rem", fontWeight: 600, backgroundColor: "#f0fdf4", padding: "3px 8px", borderRadius: "6px" }}>
                        <CheckCircle2 size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#64748b", fontSize: "0.8rem", fontWeight: 500, backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: "6px" }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle", textAlign: "right" }}>
                    <button
                      onClick={() => handleEdit(shift)}
                      className="kalki-button kalki-button--secondary"
                      style={{ padding: "6px 12px", fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      title="Edit Shift"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Kalki Modal Overlay for Add / Edit Shift */}
      {isModalOpen && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal" style={{ maxWidth: "640px", width: "100%", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div className="kalki-modal-header" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "var(--kalki-primary, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={18} />
                </div>
                <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#1e293b" }}>
                  {formData.id ? "Edit Shift Definition" : "New Shift Definition"}
                </h2>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="kalki-button kalki-button--ghost"
                style={{ padding: "4px", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="kalki-modal-content" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {error && (
                  <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "0.875rem", border: "1px solid #fecaca" }}>
                    {error}
                  </div>
                )}

                {/* Section 1: Basic Identity */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                    Shift Identity
                  </div>
                  <div className="kalki-grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Shift Name <span className="kalki-required">*</span></label>
                      <input 
                        required 
                        className="kalki-input" 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="e.g. General Shift" 
                      />
                    </div>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Shift Code <span className="kalki-required">*</span></label>
                      <input 
                        required 
                        className="kalki-input" 
                        value={formData.code} 
                        onChange={e => setFormData({ ...formData, code: e.target.value })} 
                        placeholder="e.g. GS" 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Shift Schedule */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                    Schedule &amp; Breaks
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Start Time <span className="kalki-required">*</span></label>
                      <input 
                        required 
                        type="time" 
                        step="1" 
                        className="kalki-input" 
                        value={formData.startTime} 
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })} 
                      />
                    </div>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">End Time <span className="kalki-required">*</span></label>
                      <input 
                        required 
                        type="time" 
                        step="1" 
                        className="kalki-input" 
                        value={formData.endTime} 
                        onChange={e => setFormData({ ...formData, endTime: e.target.value })} 
                      />
                    </div>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Break (Mins)</label>
                      <input 
                        required 
                        type="number" 
                        min="0"
                        className="kalki-input" 
                        value={formData.restBreakMinutes} 
                        onChange={e => setFormData({ ...formData, restBreakMinutes: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Attendance & Late Rules */}
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                    Late Rules &amp; Penalties
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Grace Period (Minutes)</label>
                      <input 
                        required 
                        type="number" 
                        min="0"
                        className="kalki-input" 
                        value={formData.gracePeriodMinutes} 
                        onChange={e => setFormData({ ...formData, gracePeriodMinutes: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Max Late Punches / Month</label>
                      <input 
                        required 
                        type="number" 
                        min="0"
                        className="kalki-input" 
                        value={formData.maxMonthlyLateOccurrences} 
                        onChange={e => setFormData({ ...formData, maxMonthlyLateOccurrences: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Late Penalty (Past Max)</label>
                      <select 
                        className="kalki-select" 
                        value={formData.latePenaltyType} 
                        onChange={e => setFormData({ ...formData, latePenaltyType: e.target.value })}
                      >
                        <option value="HALF_DAY_DEDUCTION">0.5 Day Salary Deduction</option>
                        <option value="LEAVE_DEDUCTION">Deduct from Leave Balance</option>
                        <option value="NONE">Warning Only (No Deduction)</option>
                      </select>
                    </div>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Extreme Delay Cutoff (Mins)</label>
                      <input 
                        required 
                        type="number" 
                        min="0"
                        className="kalki-input" 
                        value={formData.extremeLateThresholdMinutes} 
                        onChange={e => setFormData({ ...formData, extremeLateThresholdMinutes: parseInt(e.target.value) || 0 })} 
                        title="If late exceeds this threshold, maximum attendance status recorded is Half Day" 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Minimum Thresholds & Status */}
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                    Work Hour Thresholds &amp; Status
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", alignItems: "center" }}>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Min Hours (Half Day)</label>
                      <input 
                        required 
                        type="number" 
                        step="0.5" 
                        min="0"
                        className="kalki-input" 
                        value={formData.minHoursHalfDay} 
                        onChange={e => setFormData({ ...formData, minHoursHalfDay: e.target.value })} 
                      />
                    </div>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Min Hours (Full Day)</label>
                      <input 
                        required 
                        type="number" 
                        step="0.5" 
                        min="0"
                        className="kalki-input" 
                        value={formData.minHoursFullDay} 
                        onChange={e => setFormData({ ...formData, minHoursFullDay: e.target.value })} 
                      />
                    </div>
                    <div className="kalki-field" style={{ margin: 0 }}>
                      <label className="kalki-label">Shift Status</label>
                      <select 
                        className="kalki-select" 
                        value={formData.isActive ? "true" : "false"} 
                        onChange={e => setFormData({ ...formData, isActive: e.target.value === "true" })}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="kalki-modal-footer" style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="kalki-button kalki-button--secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="kalki-button kalki-button--primary"
                  disabled={saving}
                >
                  {saving ? "Saving Shift..." : formData.id ? "Update Shift" : "Save Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
