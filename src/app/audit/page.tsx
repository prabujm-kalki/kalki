"use client";

import { useEffect, useState } from "react";
import { AppShell, useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet } from "@/lib/api";

type AuditEvent = {
  id: string;
  organizationId: string;
  locationId: string | null;
  actorUserId: string | null;
  eventType: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function AuditContent() {
  const { selected, session } = useSessionView();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected || !session.isOwner) return;
    let cancelled = false;
    setEvents(null);
    setError(null);
    const params = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      limit: "50",
    });
    apiGet<{ auditEvents: AuditEvent[] }>(`/api/audit-events?${params.toString()}`).then((payload) => {
      if (!cancelled) setEvents(payload.auditEvents);
    }).catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load audit history");
    });
    return () => {
      cancelled = true;
    };
  }, [selected, session.isOwner]);

  if (!session.isOwner) return <StatusMessage tone="error">Audit history is restricted to the system owner.</StatusMessage>;
  if (!selected) return <StatusMessage tone="empty">Select an organization location to view its audit history.</StatusMessage>;
  if (error) return <StatusMessage tone="error">{error}</StatusMessage>;
  if (!events) return <StatusMessage tone="loading">Loading audit history…</StatusMessage>;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="muted">Governance</p>
          <h2>Audit history</h2>
          <p>Append-only operational history for the selected organization and location.</p>
        </div>
        <span className="muted">Showing {events.length} event{events.length === 1 ? "" : "s"}</span>
      </div>
      {events.length === 0 ? (
        <StatusMessage tone="empty">No audit events have been recorded for this scope yet.</StatusMessage>
      ) : (
        <div className="stack">
          {events.map((event) => (
            <article className="panel" key={event.id}>
              <div className="panel-header">
                <div>
                  <strong>{event.action}</strong>
                  <p className="muted">{event.eventType} · {event.entityType} · {event.entityId}</p>
                </div>
                <time className="muted" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
              </div>
              <p className="muted">Actor: {event.actorUserId ?? "system"}{event.locationId ? ` · Location: ${event.locationId}` : " · Organization level"}</p>
              <pre className="code-block">{JSON.stringify(event.metadata, null, 2)}</pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AuditPage() {
  return <AppShell><AuditContent /></AppShell>;
}
