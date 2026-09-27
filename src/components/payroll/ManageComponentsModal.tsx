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
      <div className="kalki-modal" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="kalki-modal-header">
          <h2>Manage Salary Components</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="kalki-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* List Existing Components */}
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Active Components</h3>
            {loading ? (
              <div style={{ padding: '1rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
            ) : components.length === 0 ? (
              <p style={{ color: 'var(--kalki-text-secondary)', fontSize: '0.9rem' }}>No components found.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {components.map(c => (
                  <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--kalki-bg-secondary)', padding: '0.75rem', borderRadius: '4px' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--kalki-text-secondary)' }}>
                        {c.type} {c.isTaxable ? '(Taxable)' : '(Non-Taxable)'}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--kalki-error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add New Form */}
          <div style={{ borderLeft: '1px solid var(--kalki-border)', paddingLeft: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Add New Component</h3>
            <div className="kalki-form-group">
              <label>Component Name</label>
              <input 
                type="text" 
                className="kalki-input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Travel Allowance"
              />
            </div>
            <div className="kalki-form-group">
              <label>Type</label>
              <select className="kalki-input" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
              </select>
            </div>
            <div className="kalki-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', display: 'flex' }}>
              <input 
                type="checkbox" 
                id="taxable-check"
                checked={isTaxable} 
                onChange={e => setIsTaxable(e.target.checked)} 
              />
              <label htmlFor="taxable-check" style={{ marginBottom: 0 }}>Is Taxable?</label>
            </div>
            <button className="kalki-btn-primary" onClick={handleSave} disabled={saving || !name.trim()} style={{ width: '100%', marginTop: '1rem' }}>
              {saving ? "Saving..." : "Add Component"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
