"use client";

import { useState, useEffect } from "react";
import { Shield, Save, GitMerge, Loader2, CheckCircle2 } from "lucide-react";

interface Role {
  id: string;
  name: string;
}

interface PurchaseRoutingConfigPanelProps {
  organizationId: string;
  locationId: string;
}

export function PurchaseRoutingConfigPanel({ organizationId, locationId }: PurchaseRoutingConfigPanelProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const rolesRes = await fetch(`/api/role-definitions?organizationId=${organizationId}&locationId=${locationId}`);
        const rolesData = await rolesRes.json();
        if (rolesData.roles) {
          setRoles(rolesData.roles);
        }

        const configRes = await fetch(`/api/purchasing/configuration?organizationId=${organizationId}&locationId=${locationId}`);
        const configData = await configRes.json();
        
        if (configData.config && configData.config.targetRoleId) {
          setSelectedRole(configData.config.targetRoleId);
        } else {
          // Default to cashier role if exists, else empty
          const cashierRole = rolesData.roles?.find((r: Role) => r.name.toLowerCase().includes("cashier"));
          if (cashierRole) setSelectedRole(cashierRole.id);
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [organizationId, locationId]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/purchasing/configuration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, locationId, targetRoleId: selectedRole })
      });
      if (res.ok) {
        setSuccessMsg("Workflow configuration updated securely.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "2rem" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitMerge size={18} style={{ color: 'var(--primary-color)' }} />
            Post-Receiving Workflow Configuration
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Define the next verification stage after goods are received by the operational team. By default, this is handled by the Cashier.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="spinner" /> Loading configuration...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', backgroundColor: 'var(--bg-card-alt)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div className="form-group">
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 500, marginBottom: '0.5rem' }}>
              <Shield size={14} style={{ color: 'var(--primary-color)' }} />
              Post-Receipt Target Role
            </label>
            <select 
              className="kalki-input" 
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="" disabled>Select Target Role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              When a Purchase Order is marked as &quot;Received&quot;, it will automatically be placed into the verification queue of users holding this role.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <button 
              className="kalki-button primary" 
              onClick={handleSave} 
              disabled={!selectedRole || isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isSaving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />}
              Save Configuration
            </button>
            {successMsg && (
              <span style={{ fontSize: '0.85rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={14} /> {successMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
