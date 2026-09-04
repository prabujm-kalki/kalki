"use client";

import type { WorkInstanceView } from "@/components/work/types";
import { evidenceStatusLabel } from "@/components/work/presentation";

export function WorkEvidencePanel({
  instance,
  note,
  reference,
  pending,
  canCreate,
  onNoteChange,
  onReferenceChange,
  onRecord,
}: {
  instance: WorkInstanceView;
  note: string;
  reference: string;
  pending: boolean;
  canCreate: boolean;
  onNoteChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onRecord: () => void;
}) {
  const locked = instance.state === "VERIFIED";
  const showForm = instance.evidenceRequired && !locked && canCreate;

  return (
    <section className="panel stack">
      <div>
        <h3>Evidence</h3>
        <p className="muted">
          {instance.evidenceRequired
            ? "Required evidence is a completion gate. This slice records metadata only; file storage is a separate boundary."
            : "This work does not require evidence."}
        </p>
      </div>
      <p><span className="pill">{evidenceStatusLabel(instance)}</span></p>
      {instance.evidencePresence?.metadata ? (
        <pre className="code-block">{JSON.stringify(instance.evidencePresence.metadata, null, 2)}</pre>
      ) : null}
      {showForm ? (
        <>
          <label className="field">
            <span>Note</span>
            <textarea
              aria-label="Evidence note"
              rows={3}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              disabled={pending}
            />
          </label>
          <label className="field">
            <span>Reference (optional)</span>
            <input
              aria-label="Evidence reference"
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              disabled={pending}
            />
          </label>
          <button type="button" className="action-button" disabled={pending || !note.trim()} onClick={onRecord}>
            {instance.evidencePresence ? "Update evidence" : "Record evidence"}
          </button>
        </>
      ) : null}
      {instance.evidenceRequired && !canCreate && !instance.evidencePresence ? (
        <p className="muted">You do not have permission to record evidence.</p>
      ) : null}
    </section>
  );
}
