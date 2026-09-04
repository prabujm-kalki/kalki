import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  employees,
  locations,
  organizations,
  people,
  workInstanceEvidencePresences,
  workInstanceVerificationPresences,
  workInstances,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
} from "@/db/schema";
import { captureEvidence, captureVerification } from "@/domains/evidence/service";
import { createWorkInstance, createWorkSituationDefinition, transitionWorkInstance } from "@/domains/roles-work/service";
import { ensureSystemOwner } from "../helpers/system-owner";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const otherLocationId = randomUUID();
const personId = randomUUID();
const employeeId = randomUUID();
const createdDefinitionIds: string[] = [];
const createdInstanceIds: string[] = [];
let userId = "";

const scope = { organizationId, locationId };
const otherScope = { organizationId: otherOrganizationId, locationId: otherLocationId };

beforeAll(async () => {
  userId = (await ensureSystemOwner()).userId;
  await db.insert(organizations).values([
    { id: organizationId, name: "Evidence organization", code: `EV-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other evidence organization", code: `EV-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Evidence location", code: "EV-LOC" },
    { id: otherLocationId, organizationId: otherOrganizationId, name: "Other evidence location", code: "EV-OTHER" },
  ]);
  await db.insert(people).values({ id: personId, firstName: "Evidence", displayName: "Evidence Owner" });
  await db.insert(employees).values({
    id: employeeId,
    personId,
    organizationId,
    locationId,
    employeeCode: "EV-EMP",
    employmentStartDate: "2026-09-03",
  });
});

afterAll(async () => {
  for (const instanceId of createdInstanceIds) {
    await db.delete(workInstanceEvidencePresences).where(eq(workInstanceEvidencePresences.workInstanceId, instanceId));
    await db.delete(workInstanceVerificationPresences).where(eq(workInstanceVerificationPresences.workInstanceId, instanceId));
    await db.delete(workInstances).where(eq(workInstances.id, instanceId));
  }
  for (const definitionId of createdDefinitionIds) {
    await db.delete(workSituationEvidenceRequirements).where(eq(workSituationEvidenceRequirements.workSituationDefinitionId, definitionId));
    await db.delete(workSituationDefinitions).where(eq(workSituationDefinitions.id, definitionId));
  }
  await db.delete(employees).where(eq(employees.id, employeeId));
  await db.delete(people).where(eq(people.id, personId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, otherLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("evidence capture", () => {
  it("records and updates evidence metadata through one idempotent write boundary", async () => {
    const definition = await createWorkSituationDefinition({ id: userId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Evidence capture work",
      description: "Work used to verify the evidence write boundary",
      evidenceRequired: true,
      verificationRequired: true,
    });
    createdDefinitionIds.push(definition.id);
    const instance = await createWorkInstance({ id: userId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      assignedEmployeeId: employeeId,
      sourceReference: "evidence-boundary-001",
    });
    createdInstanceIds.push(instance.id);

    await expect(captureVerification({ id: userId }, {
      ...scope,
      workInstanceId: instance.id,
      metadata: { result: "too-early" },
    })).rejects.toMatchObject({ code: "PREREQUISITE_NOT_SATISFIED" });

    const first = await captureEvidence({ id: userId }, {
      ...scope,
      workInstanceId: instance.id,
      metadata: { note: "first capture", reference: "EV-001" },
    });
    const second = await captureEvidence({ id: userId }, {
      ...scope,
      workInstanceId: instance.id,
      metadata: { note: "corrected capture", reference: "EV-002" },
    });

    expect(first.id).toBe(second.id);
    expect(second.metadata).toEqual({ note: "corrected capture", reference: "EV-002" });
    expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(first.updatedAt.getTime());

    const [stored] = await db.select().from(workInstanceEvidencePresences).where(and(
      eq(workInstanceEvidencePresences.organizationId, organizationId),
      eq(workInstanceEvidencePresences.workInstanceId, instance.id),
    ));
    expect(stored).toMatchObject({ id: first.id, metadata: { note: "corrected capture", reference: "EV-002" } });

    await transitionWorkInstance({ id: userId }, { ...scope, instanceId: instance.id, state: "ACKNOWLEDGED" });
    await transitionWorkInstance({ id: userId }, { ...scope, instanceId: instance.id, state: "COMPLETED" });

    const verification = await captureVerification({ id: userId }, {
      ...scope,
      workInstanceId: instance.id,
      metadata: { result: "reviewed" },
    });
    expect(verification.metadata).toEqual({ result: "reviewed" });
    expect(verification.workInstanceId).toBe(instance.id);
  });

  it("does not allow a work instance to be addressed through another organization scope", async () => {
    const definition = await createWorkSituationDefinition({ id: userId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Cross scope evidence work",
      description: "Work used to verify organization isolation",
      evidenceRequired: true,
    });
    createdDefinitionIds.push(definition.id);
    const instance = await createWorkInstance({ id: userId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      sourceReference: "evidence-cross-scope-001",
    });
    createdInstanceIds.push(instance.id);

    await expect(captureEvidence({ id: userId }, {
      ...otherScope,
      workInstanceId: instance.id,
      metadata: { attempted: true },
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
