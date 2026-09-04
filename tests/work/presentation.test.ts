import { describe, expect, it } from "vitest";
import {
  assignedLabel,
  evidenceStatusLabel,
  nextActionLabel,
  triggerLabel,
  verificationStatusLabel,
  workStateLabel,
} from "@/components/work/presentation";
import type { WorkInstanceView } from "@/components/work/types";

const base: WorkInstanceView = {
  id: "11111111-1111-1111-1111-111111111111",
  organizationId: "22222222-2222-2222-2222-222222222222",
  locationId: "33333333-3333-3333-3333-333333333333",
  state: "SEEN",
  assignedEmployeeId: null,
  assignedEmployee: null,
  sourceReference: null,
  sourceMetadata: {},
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  definitionSnapshot: { title: "Open", triggerCategory: "routine" },
  evidenceRequired: true,
  verificationRequired: true,
  evidencePresence: null,
  verificationPresence: null,
  allowedNextState: "ACKNOWLEDGED",
  nextTransitionReady: true,
};

describe("work operations presentation", () => {
  it("keeps lifecycle labels as overlays on the domain states", () => {
    expect(workStateLabel("SEEN")).toBe("Seen");
    expect(workStateLabel("VERIFIED")).toBe("Verified");
    expect(triggerLabel("item/order-triggered")).toBe("Order / item");
    expect(assignedLabel(base)).toBe("Unassigned");
  });

  it("distinguishes evidence and verification gates without inventing due dates", () => {
    expect(evidenceStatusLabel(base)).toBe("Required");
    expect(verificationStatusLabel(base)).toBe("Required after completion");
    expect(verificationStatusLabel({ ...base, state: "COMPLETED" })).toBe("Required before verify");
    expect(nextActionLabel({ ...base, allowedNextState: "COMPLETED", nextTransitionReady: false })).toBe("Complete blocked");
  });
});
