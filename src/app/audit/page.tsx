"use client";

import { Suspense, useEffect, useState } from "react";
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
  const [events, setEvents] = useState<{ requestKey: string; items: AuditEvent[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);

  useEffect(() => {
    if (!selected || !session.isOwner) return;
    const requestKey = `${selected.organizationId}:${selected.locationId}`;
    let cancelled = false;
    const params = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      limit: "50",
    });
    apiGet<{ auditEvents: AuditEvent[] }>(`/api/audit-events?${params.toString()}`).then((payload) => {
      if (cancelled) return;
      setError(null);
      setEvents({ requestKey, items: payload.auditEvents });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load audit history" });
    });
    return () => {
      cancelled = true;
    };
  }, [selected, session.isOwner]);

  if (!session.isOwner) return <StatusMessage tone="error">Audit history is restricted to the system owner.</StatusMessage>;
  if (!selected) return <StatusMessage tone="empty">Select an organization location to view its audit history.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!events || events.requestKey !== requestKey) return <StatusMessage tone="loading">Loading audit history…</StatusMessage>;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="muted">Governance</p>
          <h2>Audit history</h2>
          <p>Append-only operational history for the selected organization and location.</p>
        </div>
        <span className="muted">Showing {events.items.length} event{events.items.length === 1 ? "" : "s"}</span>
      </div>
      {events.items.length === 0 ? (
        <StatusMessage tone="empty">No audit events have been recorded for this scope yet.</StatusMessage>
      ) : (
        <div className="stack">
          {events.items.map((event) => (
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
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading audit history…</StatusMessage></main>}>
      <AppShell><AuditContent /></AppShell>
    </Suspense>
  );
}
