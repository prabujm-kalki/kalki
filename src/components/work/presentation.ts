import type { WorkInstanceView } from "@/components/work/types";
import { workStates } from "@/components/work/types";

export const workStateLabels: Record<(typeof workStates)[number], string> = {
  SEEN: "Seen",
  ACKNOWLEDGED: "Acknowledged",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
};

export const workStateActionLabels: Record<"ACKNOWLEDGED" | "COMPLETED" | "VERIFIED", string> = {
  ACKNOWLEDGED: "Acknowledge",
  COMPLETED: "Complete",
  VERIFIED: "Verify",
};

export const triggerLabels: Record<string, string> = {
  routine: "Routine",
  "event-based": "Event",
  "item/order-triggered": "Order / item",
};

export function workStateLabel(state: WorkInstanceView["state"]) {
  return workStateLabels[state];
}

export function triggerLabel(category: string | undefined) {
  if (!category) return "Not configured";
  return triggerLabels[category] ?? category;
}

export function evidenceStatusLabel(instance: Pick<WorkInstanceView, "evidenceRequired" | "evidencePresence">) {
  if (!instance.evidenceRequired) return "Not required";
  return instance.evidencePresence ? "Recorded" : "Required";
}

export function verificationStatusLabel(instance: Pick<WorkInstanceView, "verificationRequired" | "verificationPresence" | "state">) {
  if (!instance.verificationRequired) return "Not required";
  if (instance.verificationPresence) return "Recorded";
  if (instance.state === "COMPLETED") return "Required before verify";
  if (instance.state === "VERIFIED") return "Required";
  return "Required after completion";
}

export function nextActionLabel(instance: Pick<WorkInstanceView, "allowedNextState" | "nextTransitionReady">) {
  if (!instance.allowedNextState) return "No further action";
  const action = workStateActionLabels[instance.allowedNextState];
  return instance.nextTransitionReady ? action : `${action} blocked`;
}

export function snapshotTitle(instance: WorkInstanceView) {
  return instance.definitionSnapshot.title ?? "Work instance";
}

export function assignedLabel(instance: WorkInstanceView) {
  if (instance.assignedEmployee) {
    return `${instance.assignedEmployee.person.displayName} (${instance.assignedEmployee.employeeCode})`;
  }
  return instance.assignedEmployeeId ? "Assigned employee" : "Unassigned";
}

export function hasSourceMetadata(metadata: Record<string, unknown> | undefined) {
  return !!metadata && Object.keys(metadata).length > 0;
}

export function transitionConfirmCopy(state: "ACKNOWLEDGED" | "COMPLETED" | "VERIFIED") {
  if (state === "ACKNOWLEDGED") return "Mark this work as acknowledged? This cannot be reversed.";
  if (state === "COMPLETED") return "Mark this work as completed? Evidence gates have already been checked by the server.";
  return "Mark this work as verified? Completion and verification stay separate.";
}
