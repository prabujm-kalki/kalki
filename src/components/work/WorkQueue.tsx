"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import {
  assignedLabel,
  evidenceStatusLabel,
  nextActionLabel,
  snapshotTitle,
  triggerLabel,
  verificationStatusLabel,
  workStateLabel,
} from "@/components/work/presentation";
import { workStates, type WorkInstanceView } from "@/components/work/types";
import { apiGet } from "@/lib/api";

export function WorkQueue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected } = useSessionView();
  const [instances, setInstances] = useState<{ requestKey: string; items: WorkInstanceView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const state = searchParams.get("state");

  useEffect(() => {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    if (state) query.set("state", state);
    const requestKey = `${selected.organizationId}:${selected.locationId}:${state ?? ""}`;
    let cancelled = false;
    apiGet<{ workInstances: WorkInstanceView[] }>(`/api/work-instances?${query.toString()}`).then((payload) => {
      if (cancelled) return;
      setError(null);
      setInstances({ requestKey, items: payload.workInstances });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load work" });
    });
    return () => {
      cancelled = true;
    };
  }, [selected, state]);

  function setFilter(nextState: string | null) {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    if (nextState) query.set("state", nextState);
    router.replace(`/work?${query.toString()}`);
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view work.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}:${state ?? ""}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!instances || instances.requestKey !== requestKey) return <StatusMessage tone="loading">Loading work…</StatusMessage>;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Work operations</p>
            <h2>Queue</h2>
            <p>{selected.organizationName} · {selected.locationName}</p>
          </div>
          <span className="muted">{instances.items.length} visible</span>
        </div>
        <p className="muted">Authorized work for this location, plus organization-level work. Lifecycle stays Seen → Acknowledged → Completed → Verified.</p>
      </section>
      <div className="toolbar" role="tablist" aria-label="Work state filters">
        <button type="button" className="filter-button" data-active={state === null} onClick={() => setFilter(null)}>All</button>
        {workStates.map((value) => (
          <button
            key={value}
            type="button"
            className="filter-button"
            data-active={state === value}
            onClick={() => setFilter(value)}
          >
            {workStateLabel(value)}
          </button>
        ))}
      </div>
      {instances.items.length === 0 ? (
        <StatusMessage tone="empty">No work instances are visible in this location scope.</StatusMessage>
      ) : (
        <div className="work-list">
          {instances.items.map((instance) => (
            <Link
              key={instance.id}
              className="work-link panel"
              href={`/work/${instance.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
            >
              <div className="panel-header">
                <strong>{snapshotTitle(instance)}</strong>
                <span className="pill" data-state={instance.state}>{workStateLabel(instance.state)}</span>
              </div>
              <span className="muted">{assignedLabel(instance)} · {triggerLabel(instance.definitionSnapshot.triggerCategory)}</span>
              {instance.sourceReference ? <span className="muted">Source {instance.sourceReference}</span> : null}
              <span className="gate-row">
                <span className="gate-chip" data-ready={instance.evidenceRequired ? (!!instance.evidencePresence) : true}>
                  Evidence {evidenceStatusLabel(instance).toLowerCase()}
                </span>
                <span className="gate-chip" data-ready={!instance.verificationRequired || !!instance.verificationPresence}>
                  Verification {verificationStatusLabel(instance).toLowerCase()}
                </span>
                <span className="gate-chip" data-ready={instance.nextTransitionReady}>
                  {nextActionLabel(instance)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
