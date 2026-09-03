"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import type { WorkInstanceView } from "@/components/work/types";
import { apiGet, apiSend } from "@/lib/api";
import { employeePermissions } from "@/lib/authorization-policy";

function snapshot(instance: WorkInstanceView) {
  return instance.definitionSnapshot;
}

export function WorkDetail({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const { selected } = useSessionView();
  const [instance, setInstance] = useState<WorkInstanceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canCreate = selected?.permissions.includes(employeePermissions.create) ?? false;
  const canUpdate = selected?.permissions.includes(employeePermissions.update) ?? false;

  const requestInstance = useCallback(async () => {
    if (!selected) throw new Error("Select an organization location to view work.");
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      id: instanceId,
    });
    const payload = await apiGet<{ workInstance: WorkInstanceView }>(`/api/work-instances?${query.toString()}`);
    return payload.workInstance;
  }, [instanceId, selected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    requestInstance().then((next) => {
      if (!cancelled) {
        setInstance(next);
        setError(null);
      }
    }).catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load work");
    });
    return () => {
      cancelled = true;
    };
  }, [requestInstance, selected]);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      setInstance(await requestInstance());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update work");
    } finally {
      setPending(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view work.</StatusMessage>;
  if (error && !instance) return <StatusMessage tone="error">{error}</StatusMessage>;
  if (!instance) return <StatusMessage tone="loading">Loading work…</StatusMessage>;

  const scope = { organizationId: selected.organizationId, locationId: selected.locationId };
  const definition = snapshot(instance);

  return (
    <div className="stack">
      <button type="button" className="secondary-button" onClick={() => router.push(`/work?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)}>
        Back to queue
      </button>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      <section className="panel">
        <h2 className="page-title">{definition.title ?? "Work instance"}</h2>
        <p><span className="pill">{instance.state}</span></p>
        <p className="muted">{definition.description}</p>
        <dl className="definition">
          <dt>Assigned employee</dt>
          <dd>
            {instance.assignedEmployee
              ? `${instance.assignedEmployee.person.displayName} (${instance.assignedEmployee.employeeCode})`
              : instance.assignedEmployeeId ?? "Unassigned"}
          </dd>
          <dt>Source</dt>
          <dd>{instance.sourceReference ?? "None"}</dd>
          <dt>Trigger</dt>
          <dd>{definition.triggerCategory ?? "Unknown"}</dd>
          <dt>Severity</dt>
          <dd>{definition.severity ?? "Not configured"}</dd>
          <dt>Evidence</dt>
          <dd>{instance.evidenceRequired ? (instance.evidencePresence ? "Required and recorded" : "Required and not recorded") : "Not required"}</dd>
          <dt>Verification</dt>
          <dd>{instance.verificationRequired ? (instance.verificationPresence ? "Required and recorded" : "Required and not recorded") : "Not required"}</dd>
          <dt>Next transition</dt>
          <dd>
            {instance.allowedNextState ?? "None"}
            {instance.allowedNextState ? (instance.nextTransitionReady ? " — ready" : " — blocked by a required gate") : ""}
          </dd>
          <dt>Frozen reminder / escalation stages</dt>
          <dd>
            {(definition.reminderEscalationStages ?? []).length === 0
              ? "None captured"
              : definition.reminderEscalationStages!.map((stage) => stage.stage).join(" → ")}
          </dd>
        </dl>
      </section>
      <section className="toolbar">
        {instance.allowedNextState === "ACKNOWLEDGED" ? (
          <button
            type="button"
            className="action-button"
            disabled={pending || !canUpdate || !instance.nextTransitionReady}
            onClick={() => void run(() => apiSend("/api/work-instances?id=" + instance.id, "PATCH", { ...scope, state: "ACKNOWLEDGED" }))}
          >
            Acknowledge
          </button>
        ) : null}
        {instance.allowedNextState === "COMPLETED" && instance.evidenceRequired && !instance.evidencePresence ? (
          <button
            type="button"
            className="action-button"
            disabled={pending || !canCreate}
            onClick={() => void run(() => apiSend("/api/work-instance-evidence-presences", "POST", { ...scope, workInstanceId: instance.id }))}
          >
            Record evidence presence
          </button>
        ) : null}
        {instance.allowedNextState === "COMPLETED" ? (
          <button
            type="button"
            className="action-button"
            disabled={pending || !canUpdate || !instance.nextTransitionReady}
            onClick={() => void run(() => apiSend("/api/work-instances?id=" + instance.id, "PATCH", { ...scope, state: "COMPLETED" }))}
          >
            Complete
          </button>
        ) : null}
        {instance.allowedNextState === "VERIFIED" && instance.verificationRequired && !instance.verificationPresence ? (
          <button
            type="button"
            className="action-button"
            disabled={pending || !canCreate}
            onClick={() => void run(() => apiSend("/api/work-instance-verification-presences", "POST", { ...scope, workInstanceId: instance.id }))}
          >
            Record verification presence
          </button>
        ) : null}
        {instance.allowedNextState === "VERIFIED" ? (
          <button
            type="button"
            className="action-button"
            disabled={pending || !canUpdate || !instance.nextTransitionReady}
            onClick={() => void run(() => apiSend("/api/work-instances?id=" + instance.id, "PATCH", { ...scope, state: "VERIFIED" }))}
          >
            Verify
          </button>
        ) : null}
      </section>
    </div>
  );
}
