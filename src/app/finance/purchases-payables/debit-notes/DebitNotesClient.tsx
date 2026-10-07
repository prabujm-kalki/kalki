"use client";

import React, { useState } from "react";
import { Plus, X, Search, FileText } from "lucide-react";
import { useSessionView } from "@/components/AppShell";

export default function DebitNotesClient({ initialNotes, vendors }: { initialNotes: any[], vendors: any[] }) {
  const { selected } = useSessionView();
  const [notes, setNotes] = useState(initialNotes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const formatCurrency = (val: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val) || 0);
  const formatDate = (date: any) => new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const [formData, setFormData] = useState({
    vendorId: "",
    amount: "",
    reason: "",
    noteDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.organizationId || !selected?.locationId) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/finance/debit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          organizationId: selected.organizationId,
          locationId: selected.locationId,
        })
      });

      if (!res.ok) throw new Error("Failed to create debit note");
      
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
      setIsModalOpen(false);
      setFormData({ vendorId: "", amount: "", reason: "", noteDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
      alert("Error creating debit note. It might require approval based on your limits.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="kalki-section-content">
      <div className="kalki-action-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }} />
          <input 
            type="text" 
            className="kalki-input" 
            placeholder="Search debit notes..." 
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <button className="kalki-button kalki-button--primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} style={{ marginRight: '8px' }} /> Create Debit Note
        </button>
      </div>

      <div className="kalki-table-container">
        <table className="kalki-table">
          <thead>
            <tr>
              <th>Note Number</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No debit notes found.
                </td>
              </tr>
            ) : (
              notes.map((note) => (
                <tr key={note.id}>
                  <td style={{ fontWeight: '500', color: '#0f172a' }}>{note.noteNumber}</td>
                  <td>{formatDate(note.noteDate)}</td>
                  <td>{note.vendorName}</td>
                  <td>{note.reason}</td>
                  <td style={{ fontWeight: '600' }}>{formatCurrency(note.amount)}</td>
                  <td>
                    <span className={`kalki-badge ${note.status === 'approved' ? 'kalki-badge--success' : note.status === 'rejected' ? 'kalki-badge--danger' : note.status === 'draft' ? 'kalki-badge--neutral' : 'kalki-badge--warning'}`}>
                      {note.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal" style={{ backgroundColor: '#ffffff' }}>
            <div className="kalki-modal-header">
              <h2>Create Debit Note</h2>
              <button className="kalki-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="kalki-modal-content" style={{ background: '#fff' }}>
              <div className="kalki-form-group">
                <label className="kalki-label">Vendor *</label>
                <select 
                  className="kalki-input"
                  required
                  value={formData.vendorId}
                  onChange={(e) => setFormData({...formData, vendorId: e.target.value})}
                >
                  <option value="" disabled>Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="kalki-form-row">
                <div className="kalki-form-group" style={{ flex: 1 }}>
                  <label className="kalki-label">Date *</label>
                  <input 
                    type="date" 
                    className="kalki-input" 
                    required
                    value={formData.noteDate}
                    onChange={(e) => setFormData({...formData, noteDate: e.target.value})}
                  />
                </div>
                <div className="kalki-form-group" style={{ flex: 1 }}>
                  <label className="kalki-label">Amount (₹) *</label>
                  <input 
                    type="number" 
                    className="kalki-input" 
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
              </div>

              <div className="kalki-form-group">
                <label className="kalki-label">Reason *</label>
                <textarea 
                  className="kalki-input" 
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="e.g., Returned 5 damaged units"
                />
              </div>

              <div className="kalki-modal-footer" style={{ backgroundColor: '#f8fafc' }}>
                <button type="button" className="kalki-button kalki-button--secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="kalki-button kalki-button--primary" disabled={saving}>
                  {saving ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
