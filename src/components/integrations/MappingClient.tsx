"use client"

import { useState } from 'react';
import { upsertPosMapping, deletePosMapping, createSalesChannel, deleteSalesChannel, getConfiguredProviders, fetchUnmappedStrings } from '@/app/sales/settings/integrations/mapping-actions';
import { useEffect } from "react";
import { Trash2, Link } from 'lucide-react';

export default function MappingClient({ organizationId, initialMappings, channels }: { organizationId: string, initialMappings: any[], channels: any[] }) {
  const [mappings, setMappings] = useState(initialMappings || []);
  const [providerName, setProviderName] = useState('');
  const [externalString, setExternalString] = useState('');
  const [internalChannelId, setInternalChannelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [unmappedStrings, setUnmappedStrings] = useState<string[]>([]);
  const [isFetchingStrings, setIsFetchingStrings] = useState(false);

  useEffect(() => {
    getConfiguredProviders(organizationId).then(res => {
      if (res.success && res.providers) {
        setConfiguredProviders(res.providers);
        if (res.providers.length > 0 && !providerName) {
          setProviderName(res.providers[0]);
        }
      }
    });
  }, [organizationId]);

  const handleFetchStrings = async () => {
    if (!providerName) {
      alert("Please select a Provider first.");
      return;
    }
    setIsFetchingStrings(true);
    const res = await fetchUnmappedStrings(organizationId, providerName);
    if (res.success && res.data) {
      setUnmappedStrings(res.data);
    }
    setIsFetchingStrings(false);
  };


  const handleDeleteChannel = async () => {
    if (!internalChannelId) return;
    const channelName = channels.find(c => c.id === internalChannelId)?.name;
    if (!confirm(`Are you sure you want to delete the Kalki channel "${channelName}"?`)) return;

    setIsDeletingChannel(true);
    const res = await deleteSalesChannel(organizationId, internalChannelId);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete channel");
      setIsDeletingChannel(false);
    }
  };

  const handleCreateChannel = async () => {
    const channelName = window.prompt("Enter new Kalki Channel name (e.g., Dine-in, Catering Orders):");
    if (!channelName || !channelName.trim()) return;

    setIsCreatingChannel(true);
    const res = await createSalesChannel(organizationId, channelName.trim());
    if (res.success) {
      window.location.reload();
    } else {
      alert("Failed to create channel");
      setIsCreatingChannel(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!providerName || !externalString || !internalChannelId) return;

    setIsSubmitting(true);
    const res = await upsertPosMapping(organizationId, {
      providerName,
      externalString,
      internalChannelId
    });

    if (res.success) {
      window.location.reload();
    } else {
      alert("Failed to save mapping");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this mapping?")) return;
    const res = await deletePosMapping(organizationId, id);
    if (res.success) {
      setMappings(mappings.filter(m => m.id !== id));
    } else {
      alert("Failed to delete mapping");
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link size={24} />
          Channel Integration Mapping
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
          Map external POS text strings (like TMBill's "DineIn") to internal Kalki sales channels.
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 16px 0' }}>Add Translation Rule</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>Provider</label>
            <select 
              value={providerName} 
              onChange={e => setProviderName(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
              required
            >
              <option value="" disabled>Select Provider...</option>
              {configuredProviders.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              {!configuredProviders.includes('TMBILL') && <option value="TMBILL">TMBILL</option>}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              External Text String
              <button 
                type="button" 
                onClick={handleFetchStrings}
                disabled={isFetchingStrings}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: isFetchingStrings ? 'not-allowed' : 'pointer', padding: 0 }}
              >
                {isFetchingStrings ? 'Fetching...' : 'Fetch Data'}
              </button>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <input 
                type="text" 
                placeholder="e.g. DineIn" 
                value={externalString} 
                onChange={e => setExternalString(e.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '100%' }}
                required
              />
              {unmappedStrings.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {unmappedStrings.map(str => (
                    <span 
                      key={str} 
                      onClick={() => {
                        setExternalString(prev => {
                          const parts = prev.split(',').map(s => s.trim()).filter(Boolean);
                          if (!parts.includes(str)) parts.push(str);
                          return parts.join(', ');
                        });
                        setUnmappedStrings(prev => prev.filter(s => s !== str));
                      }}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}
                    >
                      {str}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              Internal Kalki Channel
              <button 
                type="button" 
                onClick={handleCreateChannel}
                disabled={isCreatingChannel}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >
                + New Channel
              </button>
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                value={internalChannelId} 
                onChange={e => setInternalChannelId(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                required
              >
                <option value="" disabled>Select Channel...</option>
                {channels.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleDeleteChannel}
                disabled={!internalChannelId || isDeletingChannel}
                title={internalChannelId ? "Delete selected channel" : "Select a channel to delete"}
                style={{ 
                  background: '#fee2e2', 
                  border: '1px solid #f87171', 
                  color: '#ef4444', 
                  borderRadius: '6px', 
                  cursor: (!internalChannelId || isDeletingChannel) ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '42px', 
                  width: '42px', 
                  flexShrink: 0,
                  opacity: !internalChannelId ? 0.4 : 1
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting || isCreatingChannel || isDeletingChannel}
            style={{ padding: '10px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: (isSubmitting || isCreatingChannel || isDeletingChannel) ? 'not-allowed' : 'pointer', height: '42px', transition: 'background 0.2s' }}
          >
            {isSubmitting ? 'Saving...' : 'Save Rule'}
          </button>
        </form>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Active Rules</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: '500', borderBottom: '1px solid #e2e8f0' }}>Provider</th>
                <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: '500', borderBottom: '1px solid #e2e8f0' }}>External String</th>
                <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: '500', borderBottom: '1px solid #e2e8f0' }}>Mapped To (Internal Channel)</th>
                <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: '500', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No mapping rules created yet.
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: '500' }}>{m.providerName}</td>
                    <td style={{ padding: '16px 24px', color: '#334155' }}>
                      <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                        {m.externalString}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#334155' }}>{m.internalChannelName}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(m.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '4px' }}
                        title="Delete Rule"
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
      </div>
    </div>
  );
}
