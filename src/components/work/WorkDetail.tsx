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

function parseMetadata(value: string) {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object.");
  }
  return parsed;
}

export function WorkDetail({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const { selected } = useSessionView();
  const [instance, setInstance] = useState<WorkInstanceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [evidenceMetadata, setEvidenceMetadata] = useState("{}");
  const [verificationMetadata, setVerificationMetadata] = useState("{}");
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

      {instance.allowedNextState === "COMPLETED" && instance.evidenceRequired && !instance.evidencePresence ? (
        <section className="panel stack">
          <div>
            <h3>Evidence capture</h3>
            <p className="muted">Record metadata for the evidence boundary. Actual file storage remains a separate implementation boundary.</p>
          </div>
          <label className="field">
            <span>Evidence metadata (JSON object)</span>
            <textarea
              aria-label="Evidence metadata"
              rows={5}
              value={evidenceMetadata}
              onChange={(event) => setEvidenceMetadata(event.target.value)}
              disabled={pending || !canCreate}
            />
          </label>
          <button
            type="button"
            className="action-button"
            disabled={pending || !canCreate}
            onClick={() => void run(async () => apiSend("/api/work-instance-evidence-presences", "POST", {
              ...scope,
              workInstanceId: instance.id,
              metadata: parseMetadata(evidenceMetadata),
            }))}
          >
            Record evidence
          </button>
        </section>
      ) : null}

      {instance.allowedNextState === "VERIFIED" && instance.verificationRequired && !instance.verificationPresence ? (
        <section className="panel stack">
          <div>
            <h3>Verification capture</h3>
            <p className="muted">Record verification metadata before the work can enter VERIFIED.</p>
          </div>
          <label className="field">
            <span>Verification metadata (JSON object)</span>
            <textarea
              aria-label="Verification metadata"
              rows={5}
              value={verificationMetadata}
              onChange={(event) => setVerificationMetadata(event.target.value)}
              disabled={pending || !canCreate}
            />
          </label>
          <button
            type="button"
            className="action-button"
            disabled={pending || !canCreate}
            onClick={() => void run(async () => apiSend("/api/work-instance-verification-presences", "POST", {
              ...scope,
              workInstanceId: instance.id,
              metadata: parseMetadata(verificationMetadata),
            }))}
          >
            Record verification
          </button>
        </section>
      ) : null}

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
