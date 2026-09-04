"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet } from "@/lib/api";

type RelatedAuditEvent = {
  id: string;
  action: string;
  eventType: string;
  actorUserId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export function WorkRelatedAudit({
  organizationId,
  locationId,
  instanceId,
}: {
  organizationId: string;
  locationId: string;
  instanceId: string;
}) {
  const requestKey = `${organizationId}:${locationId}:${instanceId}`;
  const [events, setEvents] = useState<{ requestKey: string; items: RelatedAuditEvent[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      organizationId,
      locationId,
      entityType: "work_instance",
      entityId: instanceId,
      limit: "20",
    });
    let cancelled = false;
    apiGet<{ auditEvents: RelatedAuditEvent[] }>(`/api/audit-events?${params.toString()}`).then((payload) => {
      if (cancelled) return;
      setError(null);
      setEvents({ requestKey, items: payload.auditEvents });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load related audit history" });
    });
    return () => {
      cancelled = true;
    };
  }, [instanceId, locationId, organizationId, requestKey]);

  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!events || events.requestKey !== requestKey) return <StatusMessage tone="loading">Loading related audit history…</StatusMessage>;

  return (
    <section className="panel stack">
      <div>
        <h3>Related audit</h3>
        <p className="muted">Owner-only view of the append-only ledger for this work instance.</p>
      </div>
      {events.items.length === 0 ? (
        <StatusMessage tone="empty">No audit events are recorded for this work instance yet.</StatusMessage>
      ) : (
        <ul className="audit-list">
          {events.items.map((event) => (
            <li key={event.id}>
              <strong>{event.action}</strong>
              <span className="muted"> {new Date(event.createdAt).toLocaleString()} · {event.actorUserId ?? "system"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
