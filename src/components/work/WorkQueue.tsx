"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { workStates, type WorkInstanceView } from "@/components/work/types";
import { apiGet } from "@/lib/api";

function assignedLabel(instance: WorkInstanceView) {
  if (instance.assignedEmployee) {
    return `${instance.assignedEmployee.person.displayName} (${instance.assignedEmployee.employeeCode})`;
  }
  return instance.assignedEmployeeId ? "Assigned employee" : "Unassigned";
}

function snapshotTitle(instance: WorkInstanceView) {
  return instance.definitionSnapshot.title ?? "Work instance";
}

export function WorkQueue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected } = useSessionView();
  const [instances, setInstances] = useState<{ requestKey: string; items: WorkInstanceView[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      if (!cancelled) {
        setError(null);
        setInstances({ requestKey, items: payload.workInstances });
      }
    }).catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load work");
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
  if (error) return <StatusMessage tone="error">{error}</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}:${state ?? ""}`;
  if (!instances || instances.requestKey !== requestKey) return <StatusMessage tone="loading">Loading work…</StatusMessage>;

  return (
    <div className="stack">
      <div className="toolbar">
        <button type="button" className="filter-button" data-active={state === null} onClick={() => setFilter(null)}>All</button>
        {workStates.map((value) => (
          <button
            key={value}
            type="button"
            className="filter-button"
            data-active={state === value}
            onClick={() => setFilter(value)}
          >
            {value}
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
              <strong>{snapshotTitle(instance)}</strong>
              <span className="pill">{instance.state}</span>
              <span className="muted">{assignedLabel(instance)}</span>
              <span className="muted">
                Evidence {instance.evidenceRequired ? (instance.evidencePresence ? "recorded" : "required") : "not required"}
                {" · "}
                Verification {instance.verificationRequired ? (instance.verificationPresence ? "recorded" : "required") : "not required"}
                {" · "}
                Next {instance.allowedNextState ?? "none"}{instance.nextTransitionReady ? "" : " (blocked)"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
