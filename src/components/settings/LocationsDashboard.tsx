"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { apiGet, apiSend } from "@/lib/api";
import { Plus, X, Pencil, CheckCircle2, MapPin } from "lucide-react";

type LocationView = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export function LocationsDashboard() {
  const { selected } = useSessionView();
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationView | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);

    apiGet<{ locations: LocationView[] }>(`/api/locations?organizationId=${selected.organizationId}`)
      .then((payload) => {
        setLocations(payload.locations || []);
        setError(null);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Failed to load locations");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selected, refreshKey]);

  const handleOpenNew = () => {
    setEditingLoc(null);
    setFormName("");
    setFormCode("");
    setFormIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (loc: LocationView) => {
    setEditingLoc(loc);
    setFormName(loc.name);
    setFormCode(loc.code);
    setFormIsActive(loc.isActive ?? true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);

    const payload = {
      organizationId: selected.organizationId,
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      isActive: formIsActive,
    };

    try {
      if (editingLoc) {
        await apiSend(`/api/locations?id=${editingLoc.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/locations", "POST", payload);
      }
      setIsModalOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  async function toggleStatus(loc: LocationView) {
    const actionLabel = loc.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionLabel} "${loc.name}"?`)) return;
    try {
      await apiSend(`/api/locations?id=${loc.id}`, "PATCH", { isActive: !loc.isActive });
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${actionLabel} location`);
    }
  }

  if (!selected) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "4px", height: "18px", backgroundColor: "var(--kalki-primary, #2563eb)", borderRadius: "4px", display: "inline-block" }}></span>
            Operating Locations &amp; Branches
          </h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--kalki-text-secondary, #64748b)" }}>
            Manage physical stores, kitchen outlets, warehouses, and corporate facilities for {selected.organizationName}.
          </p>
        </div>
        <button 
          className="kalki-button kalki-button--primary" 
          onClick={handleOpenNew}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={16} /> Add Location
        </button>
      </div>

      {/* Table Container */}
      <div className="kalki-table-container" style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>
            Loading locations...
          </div>
        ) : locations.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto", color: "var(--kalki-text-secondary)" }}>
              <MapPin size={24} />
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#1e293b" }}>No Locations Configured</h3>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.875rem", color: "var(--kalki-text-secondary)" }}>
              Add branch locations to partition inventory, biometric terminals, and sales operations.
            </p>
            <button className="kalki-button kalki-button--primary" onClick={handleOpenNew}>
              <Plus size={16} style={{ marginRight: "6px" }} /> Add Location
            </button>
          </div>
        ) : (
          <table className="kalki-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Location Name</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Branch Code</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "14px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.15s" }}>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "var(--kalki-primary, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MapPin size={18} />
                      </div>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>
                        {loc.name}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    <span style={{ display: "inline-block", backgroundColor: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                      {loc.code}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                    {loc.isActive !== false ? (
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
                    <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => handleEdit(loc)}
                        className="kalki-button kalki-button--secondary"
                        style={{ padding: "6px 12px", fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        title="Edit Location"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => toggleStatus(loc)}
                        className={`kalki-button ${loc.isActive !== false ? "kalki-button--danger" : "kalki-button--secondary"}`}
                        style={{ padding: "6px 12px", fontSize: "0.825rem" }}
                      >
                        {loc.isActive !== false ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Kalki Modal Overlay for Add / Edit */}
      {isModalOpen && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal" style={{ maxWidth: "480px", width: "100%", backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div className="kalki-modal-header" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "var(--kalki-primary, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={18} />
                </div>
                <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#1e293b" }}>
                  {editingLoc ? "Edit Location" : "Add Location"}
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

                <div className="kalki-field" style={{ margin: 0 }}>
                  <label className="kalki-label">Location / Branch Name <span className="kalki-required">*</span></label>
                  <input 
                    required 
                    className="kalki-input" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    placeholder="e.g. Avalpoondurai Restaurant, Central Warehouse" 
                    autoFocus
                  />
                </div>

                <div className="kalki-field" style={{ margin: 0 }}>
                  <label className="kalki-label">Branch Code <span className="kalki-required">*</span></label>
                  <input 
                    required 
                    className="kalki-input" 
                    value={formCode} 
                    onChange={e => setFormCode(e.target.value)} 
                    placeholder="e.g. AVD-REST, WH-01" 
                  />
                  <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                    Unique identifier used across tenant routing, biometric logs, and invoices.
                  </span>
                </div>

                {editingLoc && (
                  <div className="kalki-field" style={{ margin: 0 }}>
                    <label className="kalki-label">Status</label>
                    <select 
                      className="kalki-select" 
                      value={formIsActive ? "true" : "false"} 
                      onChange={e => setFormIsActive(e.target.value === "true")}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
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
                  {saving ? "Saving..." : editingLoc ? "Update Location" : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
