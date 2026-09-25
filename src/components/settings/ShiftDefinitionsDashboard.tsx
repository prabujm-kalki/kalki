"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { getShifts, saveShift } from "@/domains/settings/shiftActions";
import { StatusMessage } from "@/components/StatusMessage";
import { Clock } from "lucide-react";

export function ShiftDefinitionsDashboard() {
  const { selected } = useSessionView();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    code: "",
    startTime: "09:00:00",
    endTime: "18:00:00",
    gracePeriodMinutes: 15,
    minHoursHalfDay: "4.00",
    minHoursFullDay: "8.00",
    restBreakMinutes: 60,
    isActive: true
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    
    try {
      await saveShift({
        ...formData,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        id: formData.id || undefined
      });
      setIsAdding(false);
      loadShifts();
      setFormData({
        id: "", name: "", code: "", startTime: "09:00:00", endTime: "18:00:00",
        gracePeriodMinutes: 15, minHoursHalfDay: "4.00", minHoursFullDay: "8.00",
        restBreakMinutes: 60, isActive: true
      });
    } catch (err) {
      alert("Failed to save shift.");
    }
  };

  if (!selected) return null;
  if (loading) return <StatusMessage tone="loading">Loading shifts...</StatusMessage>;

  return (
    <div className="stack">
      <div className="panel-header">
        <div>
          <h2>Shift Definitions</h2>
          <p className="muted">Configure attendance calculation rules for this location.</p>
        </div>
        {!isAdding && (
          <button className="action-button" onClick={() => setIsAdding(true)}>Add Shift</button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px solid var(--kalki-primary)' }}>
          <h3 style={{ margin: 0, color: 'var(--kalki-primary)' }}>{formData.id ? "Edit Shift" : "New Shift Definition"}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="att-label">Shift Name</label>
              <input required className="att-input-premium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. General Shift" />
            </div>
            <div>
              <label className="att-label">Shift Code</label>
              <input required className="att-input-premium" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. GS" />
            </div>
            <div>
              <label className="att-label">Start Time</label>
              <input required type="time" step="1" className="att-input-premium" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div>
              <label className="att-label">End Time</label>
              <input required type="time" step="1" className="att-input-premium" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>
            <div>
              <label className="att-label">Grace Period (Minutes)</label>
              <input required type="number" className="att-input-premium" value={formData.gracePeriodMinutes} onChange={e => setFormData({...formData, gracePeriodMinutes: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="att-label">Rest Break (Minutes)</label>
              <input required type="number" className="att-input-premium" value={formData.restBreakMinutes} onChange={e => setFormData({...formData, restBreakMinutes: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="att-label">Min Hours for Half Day</label>
              <input required type="number" step="0.5" className="att-input-premium" value={formData.minHoursHalfDay} onChange={e => setFormData({...formData, minHoursHalfDay: e.target.value})} />
            </div>
            <div>
              <label className="att-label">Min Hours for Full Day</label>
              <input required type="number" step="0.5" className="att-input-premium" value={formData.minHoursFullDay} onChange={e => setFormData({...formData, minHoursFullDay: e.target.value})} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={() => {
              setIsAdding(false);
              setFormData({...formData, id: ""});
            }} className="kalki-button kalki-button--secondary">Cancel</button>
            <button type="submit" className="kalki-button kalki-button--primary">Save Shift</button>
          </div>
        </form>
      )}

      {shifts.length === 0 && !isAdding ? (
        <StatusMessage tone="empty">No shifts configured. Attendance processing will fail until a shift is defined.</StatusMessage>
      ) : (
        <div className="work-list">
          {shifts.map(shift => (
            <div key={shift.id} className="panel" style={{ opacity: shift.isActive ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <div style={{ padding: "0.75rem", backgroundColor: "#f1f5f9", borderRadius: "8px", color: "var(--kalki-primary)" }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem 0" }}>{shift.name} ({shift.code})</h3>
                    <div style={{ fontSize: "0.875rem", color: "var(--kalki-text-secondary)", display: "flex", gap: "1rem" }}>
                      <span>{shift.startTime.slice(0,5)} - {shift.endTime.slice(0,5)}</span>
                      <span>• Grace: {shift.gracePeriodMinutes}m</span>
                      <span>• Full Day: {shift.minHoursFullDay}h</span>
                    </div>
                  </div>
                </div>
                <button 
                  className="secondary-button" 
                  onClick={() => {
                    setFormData(shift);
                    setIsAdding(true);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
