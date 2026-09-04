"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { WorkEvidencePanel } from "@/components/work/WorkEvidencePanel";
import { WorkLifecycleActions } from "@/components/work/WorkLifecycleActions";
import { WorkRelatedAudit } from "@/components/work/WorkRelatedAudit";
import { WorkVerificationPanel } from "@/components/work/WorkVerificationPanel";
import {
  assignedLabel,
  hasSourceMetadata,
  snapshotTitle,
  triggerLabel,
  workStateLabel,
} from "@/components/work/presentation";
import type { WorkInstanceView } from "@/components/work/types";
import { apiGet, apiSend } from "@/lib/api";
import { employeePermissions } from "@/lib/authorization-policy";

function snapshot(instance: WorkInstanceView) {
  return instance.definitionSnapshot;
}

export function WorkDetail({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const { selected, session } = useSessionView();
  const [instance, setInstance] = useState<{ requestKey: string; value: WorkInstanceView } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [verificationNote, setVerificationNote] = useState("");
  const canCreate = selected?.permissions.includes(employeePermissions.create) ?? false;
  const canUpdate = selected?.permissions.includes(employeePermissions.update) ?? false;
  const requestKey = selected ? `${selected.organizationId}:${selected.locationId}:${instanceId}` : instanceId;

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
      if (cancelled) return;
      setError(null);
      setInstance({ requestKey, value: next });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load work" });
    });
    return () => {
      cancelled = true;
    };
  }, [requestInstance, requestKey, selected]);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      const next = await requestInstance();
      setInstance({ requestKey, value: next });
    } catch (caught) {
      setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to update work" });
    } finally {
      setPending(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view work.</StatusMessage>;
  if (error?.requestKey === requestKey && (!instance || instance.requestKey !== requestKey)) {
    return <StatusMessage tone="error">{error.message}</StatusMessage>;
  }
  if (!instance || instance.requestKey !== requestKey) return <StatusMessage tone="loading">Loading work…</StatusMessage>;

  const current = instance.value;
  const definition = snapshot(current);
  const reminderStages = definition.reminderEscalationStages ?? [];
  const queueHref = `/work?organizationId=${selected.organizationId}&locationId=${selected.locationId}`;

  return (
    <div className="stack">
      <button type="button" className="secondary-button" onClick={() => router.push(queueHref)}>
        Back to queue
      </button>
      {error?.requestKey === requestKey ? <StatusMessage tone="error">{error.message}</StatusMessage> : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Work operations</p>
            <h2 className="page-title">{snapshotTitle(current)}</h2>
            <p className="muted">{selected.organizationName} · {selected.locationName}</p>
          </div>
          <span className="pill" data-state={current.state}>{workStateLabel(current.state)}</span>
        </div>
        {definition.description ? <p>{definition.description}</p> : null}
        <dl className="definition">
          <dt>Assigned</dt>
          <dd>{assignedLabel(current)}</dd>
          <dt>Trigger</dt>
          <dd>{triggerLabel(definition.triggerCategory)}</dd>
          <dt>Severity</dt>
          <dd>{definition.severity ?? "Not configured"}</dd>
          <dt>Source</dt>
          <dd>{current.sourceReference ?? "None"}</dd>
          <dt>Opened</dt>
          <dd>{new Date(current.createdAt).toLocaleString()}</dd>
          <dt>Reminder / escalation configuration</dt>
          <dd>
            {reminderStages.length === 0
              ? "None captured on this snapshot. Timing and delivery are not part of this slice."
              : reminderStages.map((stage) => stage.stage.replace(/_/g, " ")).join(" → ")}
          </dd>
        </dl>
        {hasSourceMetadata(current.sourceMetadata) ? (
          <pre className="code-block">{JSON.stringify(current.sourceMetadata, null, 2)}</pre>
        ) : null}
      </section>

      <WorkEvidencePanel
        instance={current}
        note={evidenceNote}
        reference={evidenceReference}
        pending={pending}
        canCreate={canCreate}
        onNoteChange={setEvidenceNote}
        onReferenceChange={setEvidenceReference}
        onRecord={() => void run(async () => apiSend("/api/work-instance-evidence-presences", "POST", {
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          workInstanceId: current.id,
          metadata: {
            note: evidenceNote.trim(),
            ...(evidenceReference.trim() ? { reference: evidenceReference.trim() } : {}),
          },
        }))}
      />

      <WorkVerificationPanel
        instance={current}
        note={verificationNote}
        pending={pending}
        canUpdate={canUpdate}
        onNoteChange={setVerificationNote}
        onRecord={() => void run(async () => apiSend("/api/work-instance-verification-presences", "POST", {
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          workInstanceId: current.id,
          metadata: { note: verificationNote.trim() },
        }))}
      />

      <WorkLifecycleActions
        instance={current}
        pending={pending}
        canUpdate={canUpdate}
        onTransition={(state) => run(() => apiSend("/api/work-instances?id=" + current.id, "PATCH", {
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          state,
        }))}
      />

      {session.isOwner ? (
        <WorkRelatedAudit
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          instanceId={current.id}
        />
      ) : null}
    </div>
  );
}
