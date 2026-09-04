"use client";

import type { WorkInstanceView } from "@/components/work/types";
import { verificationStatusLabel } from "@/components/work/presentation";

export function WorkVerificationPanel({
  instance,
  note,
  pending,
  canUpdate,
  onNoteChange,
  onRecord,
}: {
  instance: WorkInstanceView;
  note: string;
  pending: boolean;
  canUpdate: boolean;
  onNoteChange: (value: string) => void;
  onRecord: () => void;
}) {
  const showForm = instance.verificationRequired && instance.state === "COMPLETED" && canUpdate;

  return (
    <section className="panel stack">
      <div>
        <h3>Verification</h3>
        <p className="muted">
          Completed is not verified. High and critical work keep these states separate even when verification is required.
        </p>
      </div>
      <p><span className="pill">{verificationStatusLabel(instance)}</span></p>
      {instance.verificationPresence?.metadata ? (
        <pre className="code-block">{JSON.stringify(instance.verificationPresence.metadata, null, 2)}</pre>
      ) : null}
      {showForm ? (
        <>
          <label className="field">
            <span>Verification note</span>
            <textarea
              aria-label="Verification note"
              rows={3}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              disabled={pending}
            />
          </label>
          <button type="button" className="action-button" disabled={pending || !note.trim()} onClick={onRecord}>
            {instance.verificationPresence ? "Update verification" : "Record verification"}
          </button>
        </>
      ) : null}
      {instance.verificationRequired && instance.state === "COMPLETED" && !canUpdate ? (
        <p className="muted">You do not have permission to record verification.</p>
      ) : null}
    </section>
  );
}
