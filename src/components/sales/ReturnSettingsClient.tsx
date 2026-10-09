"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle, AlertCircle } from "lucide-react";
import { updateReturnPolicies, getReturnPolicies } from "@/app/sales/settings/returns/actions";
import { useSessionView } from "@/components/AppShell";

export function ReturnSettingsClient({ initialSettings }: { initialSettings: any }) {
  const { selected } = useSessionView();
  const orgId = selected?.organizationId || "";

  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (orgId) {
      getReturnPolicies(orgId).then(policies => {
        if (policies) {
          setSettings((prev: any) => ({ ...prev, ...policies }));
        }
      });
    }
  }, [orgId]);

  const handleChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    setStatus('idle');
  };

  const handleSave = async () => {
    if (!orgId) {
      alert("Organization ID is missing. Please select an organization.");
      return;
    }
    
    setIsSaving(true);
    setStatus('idle');
    try {
      const res = await updateReturnPolicies(orgId, settings);
      if (res.success) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Policy Options Card */}
      <div className="card" style={{ padding: "2rem", borderRadius: "0.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Max Return Days */}
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--kalki-text-primary)", marginBottom: "0.5rem" }}>
            Return Window (Days)
          </label>
          <p style={{ fontSize: "0.875rem", color: "var(--kalki-text-secondary)", marginBottom: "1rem" }}>
            How many days after the invoice date is a return accepted?
          </p>
          <select 
            value={settings.maxReturnDays}
            onChange={(e) => handleChange('maxReturnDays', e.target.value === "No Limit" ? "No Limit" : parseInt(e.target.value))}
            style={{ padding: "0.5rem 1rem", border: "1px solid var(--kalki-border)", borderRadius: "0.375rem", outline: "none", width: "100%", maxWidth: "300px" }}
          >
            <option value={7}>7 Days</option>
            <option value={15}>15 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
            <option value="No Limit">No Limit</option>
          </select>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--kalki-border)" }} />

        {/* Multiple Returns per Invoice */}
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--kalki-text-primary)", marginBottom: "0.5rem" }}>
            Multiple Returns per Invoice
          </label>
          <p style={{ fontSize: "0.875rem", color: "var(--kalki-text-secondary)", marginBottom: "1rem" }}>
            Can a customer make partial returns on multiple different days, or must all items be returned in a single transaction?
          </p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--kalki-text-primary)", cursor: "pointer" }}>
              <input 
                type="radio" 
                checked={settings.allowMultipleReturns === true} 
                onChange={() => handleChange('allowMultipleReturns', true)}
              />
              Allow Multiple Returns
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--kalki-text-primary)", cursor: "pointer" }}>
              <input 
                type="radio" 
                checked={settings.allowMultipleReturns === false} 
                onChange={() => handleChange('allowMultipleReturns', false)}
              />
              Strictly One Return Event
            </label>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--kalki-border)" }} />

        {/* Require Manager Approval */}
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--kalki-text-primary)", marginBottom: "0.5rem" }}>
            Manager Approval
          </label>
          <p style={{ fontSize: "0.875rem", color: "var(--kalki-text-secondary)", marginBottom: "1rem" }}>
            Require a manager to approve all sales returns before they affect inventory and accounts.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--kalki-text-primary)", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={settings.requireApproval === true} 
              onChange={(e) => handleChange('requireApproval', e.target.checked)}
              style={{ width: "1rem", height: "1rem" }}
            />
            Require Approval
          </label>
        </div>

      </div>

      {/* Save Action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "1rem" }}>
        {status === 'success' && (
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#16a34a", fontSize: "0.875rem", fontWeight: "500" }}>
            <CheckCircle size={18} /> Settings saved successfully
          </span>
        )}
        {status === 'error' && (
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626", fontSize: "0.875rem", fontWeight: "500" }}>
            <AlertCircle size={18} /> Error saving settings
          </span>
        )}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "var(--kalki-primary)", color: "white", padding: "0.75rem 1.5rem", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", border: "none", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Policies"}
        </button>
      </div>

    </div>
  );
}
