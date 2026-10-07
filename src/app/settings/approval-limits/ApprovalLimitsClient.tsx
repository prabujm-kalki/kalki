"use client";

import React, { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { useSessionView } from "@/components/AppShell";

export default function ApprovalLimitsClient({ initialRoles }: { initialRoles: any[] }) {
  const { selected } = useSessionView();
  
  const [limits, setLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selected?.organizationId) {
      setLoading(true);
      fetch(`/api/settings/approval-limits?organizationId=${selected.organizationId}`)
        .then(res => res.json())
        .then(data => {
          if (data.limits) setLimits(data.limits);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [selected?.organizationId]);

  const addLimit = () => {
    setLimits([
      ...limits,
      {
        roleId: initialRoles[0]?.id || "",
        module: "purchase_orders",
        maxLimit: 0,
        isActive: true,
        id: "temp-" + Date.now(),
      }
    ]);
  };

  const removeLimit = (index: number) => {
    const newLimits = [...limits];
    newLimits.splice(index, 1);
    setLimits(newLimits);
  };

  const updateLimit = (index: number, field: string, value: any) => {
    const newLimits = [...limits];
    newLimits[index] = { ...newLimits[index], [field]: value };
    setLimits(newLimits);
  };

  const handleSave = async () => {
    if (!selected?.organizationId) return;
    setSaving(true);
    try {
      const payload = {
        organizationId: selected.organizationId,
        limits: limits.map(l => ({
          roleId: l.roleId,
          module: l.module,
          maxLimit: l.maxLimit,
          isActive: l.isActive
        }))
      };

      const res = await fetch("/api/settings/approval-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }
      alert("Approval limits saved successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to save approval limits.");
    } finally {
      setSaving(false);
    }
  };

  if (!selected) {
    return <div>Loading workspace...</div>;
  }

  return (
    <div className="kalki-section-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p className="kalki-page-description" style={{ margin: 0 }}>
          Configure max limits that roles can approve directly before requiring escalation.
        </p>
        <button className="kalki-button kalki-button--secondary" onClick={addLimit}>
          <Plus size={16} style={{ marginRight: '8px' }} /> Add Limit
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto', color: 'var(--kalki-primary)' }} />
          <p style={{ marginTop: '12px', color: 'var(--kalki-text-secondary)' }}>Loading limits...</p>
        </div>
      ) : (
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Business Role</th>
                <th style={{ width: '25%' }}>Module</th>
                <th style={{ width: '25%' }}>Max Approval Limit</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {limits.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--kalki-text-secondary)' }}>
                    No approval limits configured. Click "Add Limit" to create one.
                  </td>
                </tr>
              ) : (
                limits.map((limit, index) => (
                  <tr key={limit.id || index}>
                    <td>
                      <select 
                        className="kalki-input" 
                        value={limit.roleId} 
                        onChange={(e) => updateLimit(index, 'roleId', e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                      >
                        <option value="" disabled>Select a role...</option>
                        {initialRoles.map((role: any) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select 
                        className="kalki-input" 
                        value={limit.module} 
                        onChange={(e) => updateLimit(index, 'module', e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                      >
                        <option value="purchase_orders">Purchase Orders</option>
                        <option value="cash_advances">Cash Advances</option>
                        <option value="debit_notes">Debit Notes</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="kalki-input" 
                        value={limit.maxLimit} 
                        onChange={(e) => updateLimit(index, 'maxLimit', parseFloat(e.target.value) || 0)}
                        style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                        min="0"
                      />
                    </td>
                    <td>
                      <select 
                        className="kalki-input" 
                        value={limit.isActive ? "true" : "false"} 
                        onChange={(e) => updateLimit(index, 'isActive', e.target.value === "true")}
                        style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => removeLimit(index)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Remove Limit"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="kalki-button kalki-button--primary" 
          onClick={handleSave} 
          disabled={saving || loading}
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} 
          {saving ? 'Saving...' : 'Save Limits'}
        </button>
      </div>
    </div>
  );
}
