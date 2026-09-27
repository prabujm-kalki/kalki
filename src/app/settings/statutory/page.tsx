"use client";

import React, { useState, useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useSessionView } from "@/components/AppShell";
import { Save, ShieldCheck } from "lucide-react";

export default function StatutorySettingsPage() {
  const { selected } = useSessionView();
  const organizationId = selected?.organizationId;

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchSettings();
    }
  }, [organizationId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiGet<any>(`/api/settings/statutory?organizationId=${organizationId}`);
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiSend("/api/settings/statutory", "POST", {
        ...settings,
        organizationId
      });
      alert("Statutory Settings saved successfully.");
    } catch (error: any) {
      alert("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="kalki-loading-placeholder">Loading statutory settings...</div>;

  return (
    <div className="kalki-card">
      <div className="kalki-card-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} />
          Statutory Compliances Configuration
        </h2>
      </div>
      <div className="kalki-card-body">
        
        {/* EPF Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--kalki-primary)', borderBottom: '1px solid var(--kalki-border)', paddingBottom: '0.5rem' }}>
            Employee Provident Fund (EPF)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="kalki-form-group">
              <label>Employee Contribution Rate (%)</label>
              <input type="number" step="0.01" className="kalki-input" value={settings?.epfEmployeeContributionRate || ""} onChange={e => setSettings({...settings, epfEmployeeContributionRate: e.target.value})} />
            </div>
            <div className="kalki-form-group">
              <label>Employer Contribution Rate (%)</label>
              <input type="number" step="0.01" className="kalki-input" value={settings?.epfEmployerContributionRate || ""} onChange={e => setSettings({...settings, epfEmployerContributionRate: e.target.value})} />
            </div>
            <div className="kalki-form-group">
              <label>Monthly Wage Ceiling (₹)</label>
              <input type="number" className="kalki-input" value={settings?.epfWageCeiling || ""} onChange={e => setSettings({...settings, epfWageCeiling: e.target.value})} />
            </div>
            <div className="kalki-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '1.8rem' }}>
              <input type="checkbox" id="epf-ctc" checked={settings?.epfIncludeEmployerContributionInCTC} onChange={e => setSettings({...settings, epfIncludeEmployerContributionInCTC: e.target.checked})} />
              <label htmlFor="epf-ctc" style={{ marginBottom: 0 }}>Include Employer PF in CTC</label>
            </div>
          </div>
        </div>

        {/* ESI Section */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--kalki-primary)', borderBottom: '1px solid var(--kalki-border)', paddingBottom: '0.5rem' }}>
            Employee State Insurance (ESI)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="kalki-form-group">
              <label>Employee Contribution Rate (%)</label>
              <input type="number" step="0.01" className="kalki-input" value={settings?.esiEmployeeContributionRate || ""} onChange={e => setSettings({...settings, esiEmployeeContributionRate: e.target.value})} />
            </div>
            <div className="kalki-form-group">
              <label>Employer Contribution Rate (%)</label>
              <input type="number" step="0.01" className="kalki-input" value={settings?.esiEmployerContributionRate || ""} onChange={e => setSettings({...settings, esiEmployerContributionRate: e.target.value})} />
            </div>
            <div className="kalki-form-group">
              <label>Monthly Wage Ceiling (₹)</label>
              <input type="number" className="kalki-input" value={settings?.esiWageCeiling || ""} onChange={e => setSettings({...settings, esiWageCeiling: e.target.value})} />
            </div>
            <div className="kalki-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '1.8rem' }}>
              <input type="checkbox" id="esi-ctc" checked={settings?.esiIncludeEmployerContributionInCTC} onChange={e => setSettings({...settings, esiIncludeEmployerContributionInCTC: e.target.checked})} />
              <label htmlFor="esi-ctc" style={{ marginBottom: 0 }}>Include Employer ESI in CTC</label>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="kalki-btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>

      </div>
    </div>
  );
}
