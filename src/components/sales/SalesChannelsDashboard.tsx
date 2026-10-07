"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import { SalesChannelForm } from "./SalesChannelForm";

type SalesChannelView = {
  id: string;
  name: string;
  type: string;
  fulfillmentType: string;
  requiresDispatch: boolean;
  platformFeePercentage: number | null;
  isActive: boolean;
};

export function SalesChannelsDashboard() {
  const { selected } = useSessionView();
  const [channels, setChannels] = useState<{ requestKey: string; items: SalesChannelView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const requestKey = `${selected.organizationId}`;
    let cancelled = false;

    apiGet<{ channels: SalesChannelView[] }>(`/api/sales/channels?organizationId=${selected.organizationId}`)
      .then((payload) => {
        if (cancelled) return;
        setError(null);
        setChannels({ requestKey, items: payload.channels });
      })
      .catch((caught) => {
        if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Failed to load channels" });
      });

    return () => {
      cancelled = true;
    };
  }, [selected, refreshKey]);

  async function deactivateChannel(id: string) {
    if (!confirm("Are you sure you want to deactivate this channel?")) return;
    setIsDeactivating(id);
    try {
      await apiSend(`/api/sales/channels?id=${id}`, "PATCH", { isActive: false });
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(null);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization to view sales channels.</StatusMessage>;
  const requestKey = `${selected.organizationId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!channels || channels.requestKey !== requestKey) return <StatusMessage tone="loading">Loading sales channels…</StatusMessage>;

  return (
    <div className="stack">
      <div className="panel-header">
        <div>
          <h2>Sales Channels</h2>
          <p className="muted">Manage Omnichannel endpoints for {selected.organizationName}</p>
        </div>
        {!isAdding && !editingId && (
          <button className="action-button" onClick={() => setIsAdding(true)}>Add Sales Channel</button>
        )}
      </div>

      {isAdding && (
        <SalesChannelForm 
          organizationId={selected.organizationId}
          onCancel={() => setIsAdding(false)}
          onSuccess={() => { setIsAdding(false); setRefreshKey(k => k + 1); }}
        />
      )}

      {channels.items.length === 0 && !isAdding ? (
        <StatusMessage tone="empty">No sales channels configured yet.</StatusMessage>
      ) : (
        <div className="work-list">
          {channels.items.map((channel) => (
            editingId === channel.id ? (
              <SalesChannelForm
                key={channel.id}
                organizationId={selected.organizationId}
                initialData={channel}
                onCancel={() => setEditingId(null)}
                onSuccess={() => { setEditingId(null); setRefreshKey(k => k + 1); }}
              />
            ) : (
              <div key={channel.id} className="panel" style={{ opacity: channel.isActive ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3>{channel.name} {!channel.isActive && "(Inactive)"}</h3>
                    <div className="row" style={{ gap: "1rem", marginTop: "0.25rem" }}>
                      <span className="badge">{channel.type}</span>
                      <span className="muted">Fulfillment: {channel.fulfillmentType}</span>
                      {channel.platformFeePercentage && (
                        <span className="muted">Fee: {channel.platformFeePercentage}%</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="secondary-button" onClick={() => setEditingId(channel.id)}>Edit</button>
                    {channel.isActive && (
                      <button 
                        className="secondary-button" 
                        style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }}
                        onClick={() => void deactivateChannel(channel.id)}
                        disabled={isDeactivating === channel.id}
                      >
                        {isDeactivating === channel.id ? "..." : "Deactivate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
