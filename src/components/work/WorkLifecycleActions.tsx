"use client";

import { useState } from "react";
import type { WorkInstanceView } from "@/components/work/types";
import { workStateActionLabels, transitionConfirmCopy } from "@/components/work/presentation";

export function WorkLifecycleActions({
  instance,
  pending,
  canUpdate,
  onTransition,
}: {
  instance: WorkInstanceView;
  pending: boolean;
  canUpdate: boolean;
  onTransition: (state: "ACKNOWLEDGED" | "COMPLETED" | "VERIFIED") => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<"ACKNOWLEDGED" | "COMPLETED" | "VERIFIED" | null>(null);
  const next = instance.allowedNextState;
  if (!next) {
    return <p className="muted">This work has reached Verified. No further lifecycle action is available.</p>;
  }

  const disabled = pending || !canUpdate || !instance.nextTransitionReady;
  const label = workStateActionLabels[next];

  if (confirming === next) {
    return (
      <section className="panel stack confirm-bar">
        <p>{transitionConfirmCopy(next)}</p>
        <div className="toolbar">
          <button type="button" className="action-button" disabled={pending} onClick={() => void onTransition(next)}>
            Confirm {label.toLowerCase()}
          </button>
          <button type="button" className="secondary-button" disabled={pending} onClick={() => setConfirming(null)}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="toolbar">
      <button
        type="button"
        className="action-button"
        disabled={disabled}
        onClick={() => setConfirming(next)}
      >
        {label}
      </button>
      {!canUpdate ? <span className="muted">You can view this work but cannot change its state.</span> : null}
      {canUpdate && !instance.nextTransitionReady ? (
        <span className="muted">
          {next === "COMPLETED"
            ? "Record required evidence before completing."
            : next === "VERIFIED"
              ? "Record required verification before verifying."
              : "The next step is not ready."}
        </span>
      ) : null}
    </section>
  );
}
