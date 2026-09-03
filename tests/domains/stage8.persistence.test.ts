import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  businessRoles,
  employeeResponsibilityAdditions,
  employees,
  people,
  roleChecklistItems,
  roleChecklists,
  roleKpiDefinitions,
  roleResponsibilities,
  workInstances,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
  locations,
  organizations,
} from "@/db/schema";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const personId = randomUUID();
const employeeId = randomUUID();
const roleId = randomUUID();
const definitionId = randomUUID();

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Stage 8 test organization", code: `S8-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other Stage 8 organization", code: `S8-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values({ id: locationId, organizationId, name: "Stage 8 location", code: "S8-LOC" });
  await db.insert(people).values({ id: personId, firstName: "Stage", displayName: "Stage Eight" });
  await db.insert(employees).values({ id: employeeId, personId, organizationId, locationId, employeeCode: "S8-EMP", employmentStartDate: "2026-09-03" });
});

afterAll(async () => {
  await db.delete(workInstances).where(eq(workInstances.workSituationDefinitionId, definitionId));
  await db.delete(workSituationReminderEscalationStages).where(eq(workSituationReminderEscalationStages.workSituationDefinitionId, definitionId));
  await db.delete(workSituationEvidenceRequirements).where(eq(workSituationEvidenceRequirements.workSituationDefinitionId, definitionId));
  await db.delete(workSituationDefinitions).where(eq(workSituationDefinitions.id, definitionId));
  await db.delete(roleChecklistItems).where(eq(roleChecklistItems.organizationId, organizationId));
  await db.delete(roleChecklists).where(eq(roleChecklists.roleId, roleId));
  await db.delete(roleKpiDefinitions).where(eq(roleKpiDefinitions.roleId, roleId));
  await db.delete(roleResponsibilities).where(eq(roleResponsibilities.roleId, roleId));
  await db.delete(employeeResponsibilityAdditions).where(eq(employeeResponsibilityAdditions.employeeId, employeeId));
  await db.delete(businessRoles).where(eq(businessRoles.id, roleId));
  await db.delete(employees).where(eq(employees.id, employeeId));
  await db.delete(people).where(eq(people.id, personId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Stage 8 persistence foundation", () => {
  it("keeps role baselines, employee additions, and role configuration separate", async () => {
    await db.insert(businessRoles).values({ id: roleId, organizationId, identifier: "OPS", name: "Operations", purpose: "Test role" });
    await expect(db.insert(businessRoles).values({ organizationId, identifier: "OPS", name: "Other", purpose: "Duplicate" })).rejects.toBeDefined();
    await db.insert(roleResponsibilities).values({ organizationId, roleId, responsibility: "Own operations", actualWork: "Review work", position: 10 });
    await db.insert(roleKpiDefinitions).values({ organizationId, roleId, name: "Quality", description: "Extensible KPI" });
    const checklistId = randomUUID();
    await db.insert(roleChecklists).values({ id: checklistId, organizationId, roleId, name: "Role checklist" });
    await db.insert(roleChecklistItems).values({ organizationId, checklistId, definition: "Checklist definition", position: 10 });
    await db.insert(employeeResponsibilityAdditions).values({ organizationId, employeeId, responsibility: "Employee addition", actualWork: "Additional work", position: 10 });

    const [baseline] = await db.select().from(roleResponsibilities).where(eq(roleResponsibilities.roleId, roleId));
    const additions = await db.select().from(employeeResponsibilityAdditions).where(eq(employeeResponsibilityAdditions.employeeId, employeeId));
    expect(baseline.position).toBe(10);
    expect(additions).toHaveLength(1);
    expect(additions[0].responsibility).toBe("Employee addition");
    await expect(db.insert(roleResponsibilities).values({ organizationId: otherOrganizationId, roleId, responsibility: "Invalid", actualWork: "Invalid", position: 20 })).rejects.toBeDefined();
  });

  it("enforces organization-scoped work definitions, evidence, stages, and instances", async () => {
    await db.insert(workSituationDefinitions).values({ id: definitionId, organizationId, triggerCategory: "routine", title: "Opening", description: "Opening work", severity: "high" });
    await db.insert(workSituationEvidenceRequirements).values({ organizationId, workSituationDefinitionId: definitionId, isRequired: true, metadata: { futurePolicy: true } });
    await db.insert(workSituationReminderEscalationStages).values([
      { organizationId, workSituationDefinitionId: definitionId, stage: "due_notification", position: 10 },
      { organizationId, workSituationDefinitionId: definitionId, stage: "reminder", position: 20 },
    ]);
    const instanceIds = await Promise.all(["SEEN", "ACKNOWLEDGED", "COMPLETED", "VERIFIED"].map(async (state) => {
      const id = randomUUID();
      await db.insert(workInstances).values({ id, organizationId, workSituationDefinitionId: definitionId, locationId, assignedEmployeeId: employeeId, state, definitionSnapshot: { title: "Opening" } });
      return id;
    }));
    expect(instanceIds).toHaveLength(4);
    await expect(db.insert(workInstances).values({ organizationId, workSituationDefinitionId: definitionId, state: "TODO" })).rejects.toBeDefined();
    await expect(db.insert(workInstances).values({ organizationId: otherOrganizationId, workSituationDefinitionId: definitionId, state: "SEEN" })).rejects.toBeDefined();
    await expect(db.insert(workSituationReminderEscalationStages).values({ organizationId, workSituationDefinitionId: definitionId, stage: "duplicate-position", position: 10 })).rejects.toBeDefined();
    await expect(db.insert(workSituationDefinitions).values({
      organizationId,
      triggerCategory: "ad-hoc",
      title: "Invalid trigger",
      description: "Invalid trigger",
    })).rejects.toBeDefined();
  });
});
