import React, { useState, useEffect } from "react";
import { X, Save, Trash2, Loader2 } from "lucide-react";
import { apiSend, apiGet } from "@/lib/api";

type Component = {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  isTaxable: boolean;
  isActive: boolean;
};

export function ManageComponentsModal({ 
  organizationId, 
  onClose,
  onSaved
}: { 
  organizationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [type, setType] = useState<'EARNING' | 'DEDUCTION'>("EARNING");
  const [isTaxable, setIsTaxable] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const res = await apiGet<any>(`/api/payroll/components?organizationId=${organizationId}`);
      // Show only active ones
      setComponents((res.components || []).filter((c: any) => c.isActive !== false));
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, [organizationId]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await apiSend(`/api/payroll/components`, "POST", {
        organizationId,
        name,
        type,
        isTaxable
      });
      setName("");
      await fetchComponents();
      onSaved();
    } catch (e: any) {
      alert("Failed to save component: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this component?")) return;
    try {
      await apiSend(`/api/payroll/components?id=${id}`, "PATCH", { isActive: false });
      await fetchComponents();
      onSaved();
    } catch (e: any) {
      alert("Failed to delete: " + (e.message || "Unknown error"));
    }
  };

  return (
    <div className="kalki-modal-overlay">
      <div className="kalki-modal" style={{ maxWidth: '640px', width: '100%', borderRadius: '12px', background: '#ffffff', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div className="kalki-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Manage Salary Components</h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Define earning allowances and recurring deductions.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px' }}>
            <X size={20} />
          </button>
        </div>
        <div className="kalki-modal-body" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* List Existing Components */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: '#1e293b' }}>Active Components</h3>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}><Loader2 className="animate-spin" /></div>
            ) : components.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>No components created yet.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {components.map(c => (
                  <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.type === 'EARNING' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${c.type === 'EARNING' ? '#bbf7d0' : '#fecaca'}`, padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: c.type === 'EARNING' ? '#166534' : '#991b1b', fontWeight: 500 }}>
                        {c.type} {c.isTaxable ? '• Taxable' : '• Non-Taxable'}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(c.id)} title="Deactivate component" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add New Form */}
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: '#1e293b' }}>Add New Component</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Component Name</label>
                <input 
                  type="text" 
                  className="kalki-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Basic Pay, HRA, Food"
                  style={{ height: '36px', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Classification</label>
                <select className="kalki-input" value={type} onChange={e => setType(e.target.value as any)} style={{ height: '36px', fontSize: '0.85rem' }}>
                  <option value="EARNING">Earning (Allowance / Base)</option>
                  <option value="DEDUCTION">Deduction (Recovery / Contribution)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                <input 
                  type="checkbox" 
                  id="taxable-check"
                  checked={isTaxable} 
                  onChange={e => setIsTaxable(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="taxable-check" style={{ marginBottom: 0, fontSize: '0.85rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                  Is Taxable Earning?
                </label>
              </div>
              <button 
                className="kalki-button kalki-button--primary" 
                onClick={handleSave} 
                disabled={saving || !name.trim()} 
                style={{ width: '100%', marginTop: '0.5rem', height: '38px', fontSize: '0.9rem' }}
              >
                {saving ? "Saving..." : "Create Component"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
