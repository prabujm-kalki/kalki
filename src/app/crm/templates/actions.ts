"use server";

import { db } from "@/db";
import { marketingTemplates, marketingTemplateAudiences, customers, items, vendors, employees } from "@/db/schema";
import { eq, inArray, and, ilike, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";

export async function validateAudienceList(targetEntityType: string, entityIds: string[]) {
  noStore();
  if (!entityIds.length) return [];

  // Query active enrollments and customer consent settings
  const [activeEnrollments, customerRecords] = await Promise.all([
    db
      .select({
        targetEntityId: marketingTemplateAudiences.targetEntityId,
        templateName: marketingTemplates.name,
      })
      .from(marketingTemplateAudiences)
      .innerJoin(marketingTemplates, eq(marketingTemplateAudiences.templateId, marketingTemplates.id))
      .where(
        and(
          eq(marketingTemplateAudiences.targetEntityType, targetEntityType),
          inArray(marketingTemplateAudiences.targetEntityId, entityIds),
          eq(marketingTemplateAudiences.enrollmentStatus, "ACTIVE"),
          eq(marketingTemplates.status, "ACTIVE")
        )
      ),
    targetEntityType.toUpperCase() === "CUSTOMER"
      ? db
          .select({
            id: customers.id,
            crmWhatsappConsent: sql<boolean | null>`(SELECT "whatsapp_consent" FROM "crm_customer_profiles" WHERE "crm_customer_profiles"."customer_id" = "customers"."id" LIMIT 1)`,
          })
          .from(customers)
          .where(inArray(customers.id, entityIds))
      : Promise.resolve([]),
  ]);

  const activeMap = new Map(
    activeEnrollments.map((record) => [record.targetEntityId, record.templateName])
  );

  const optedOutCustomerSet = new Set(
    customerRecords
      .filter((c) => c.crmWhatsappConsent === false)
      .map((c) => c.id)
  );

  return entityIds.map((id) => {
    const isAlreadyActive = activeMap.has(id);
    const isOptedOut = optedOutCustomerSet.has(id);
    const isEligible = !isAlreadyActive && !isOptedOut;

    return {
      targetEntityId: id,
      isEligible,
      activeTemplateName: activeMap.get(id),
      reason: isOptedOut ? "WhatsApp Opted-Out (Spam Protection)" : isAlreadyActive ? `Active in ${activeMap.get(id)}` : undefined,
    };
  });
}

export async function createMarketingTemplate(payload: {
  organizationId: string;
  locationId?: string;
  name: string;
  cycleDurationWeeks: number;
  targetEntityType: string;
  entityIds: string[];
}) {
  const { organizationId, locationId, name, cycleDurationWeeks, targetEntityType, entityIds } = payload;

  if (!entityIds.length) {
    throw new Error("No entities selected for the template.");
  }

  // Application-Level Integrity Check: Verify that all entityIds actually exist in the database
  const normalizedType = targetEntityType.toUpperCase();
  let existingRecords: { id: string }[] = [];

  switch (normalizedType) {
    case "CUSTOMER":
      existingRecords = await db
        .select({ id: customers.id })
        .from(customers)
        .where(inArray(customers.id, entityIds));
      break;
    case "ITEM":
      existingRecords = await db
        .select({ id: items.id })
        .from(items)
        .where(inArray(items.id, entityIds));
      break;
    case "VENDOR":
      existingRecords = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(inArray(vendors.id, entityIds));
      break;
    case "EMPLOYEE":
      existingRecords = await db
        .select({ id: employees.id })
        .from(employees)
        .where(inArray(employees.id, entityIds));
      break;
    default:
      throw new Error(`Unsupported target entity type: ${targetEntityType}`);
  }

  const existingIdSet = new Set(existingRecords.map((r) => r.id));
  const invalidIds = entityIds.filter((id) => !existingIdSet.has(id));

  if (invalidIds.length > 0) {
    throw new Error(
      `Application Integrity Lock: ${invalidIds.length} invalid entity ID(s) detected for type '${targetEntityType}'.`
    );
  }

  // Double check eligibility to strictly prevent spam
  const validation = await validateAudienceList(targetEntityType, entityIds);
  const eligibleEntityIds = validation
    .filter((v) => v.isEligible)
    .map((v) => v.targetEntityId);

  if (eligibleEntityIds.length === 0) {
    throw new Error("None of the selected targets are eligible (Spam Protection).");
  }

  const [newTemplate] = await db
    .insert(marketingTemplates)
    .values({
      organizationId,
      locationId: locationId || null,
      targetEntityType: normalizedType,
      name,
      cycleDurationWeeks,
      status: "ACTIVE",
    })
    .returning();

  const audienceValues = eligibleEntityIds.map((id) => ({
    templateId: newTemplate.id,
    targetEntityType: normalizedType,
    targetEntityId: id,
    enrollmentStatus: "ACTIVE",
  }));

  await db.insert(marketingTemplateAudiences).values(audienceValues);

  revalidatePath("/crm/templates");

  return { success: true, templateId: newTemplate.id, enrolledCount: eligibleEntityIds.length };
}

export async function removeAudienceFromTemplate(templateId: string, targetEntityId: string) {
  await db
    .delete(marketingTemplateAudiences)
    .where(
      and(
        eq(marketingTemplateAudiences.templateId, templateId),
        eq(marketingTemplateAudiences.targetEntityId, targetEntityId)
      )
    );

  revalidatePath(`/crm/templates/${templateId}`);
  return { success: true };
}

// Backwards-compatible alias for existing customer removal calls
export async function removeCustomerFromTemplate(templateId: string, customerId: string) {
  return removeAudienceFromTemplate(templateId, customerId);
}

export async function getNextTemplateName(basePrefix: string) {
  const templates = await db
    .select({ name: marketingTemplates.name })
    .from(marketingTemplates)
    .where(ilike(marketingTemplates.name, `${basePrefix}%`));

  let maxCount = 0;
  for (const t of templates) {
    const match = t.name.match(new RegExp(`^${basePrefix}_(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxCount) maxCount = num;
    }
  }

  return `${basePrefix}_${maxCount + 1}`;
}

export async function deleteMarketingTemplate(templateId: string) {
  // First, delete enrolled audiences to prevent orphan records
  await db.delete(marketingTemplateAudiences).where(eq(marketingTemplateAudiences.templateId, templateId));
  // Then, delete the template
  await db.delete(marketingTemplates).where(eq(marketingTemplates.id, templateId));

  revalidatePath("/crm/templates");
  return { success: true };
}

export async function toggleTemplateStatus(templateId: string, newStatus: "ACTIVE" | "INACTIVE") {
  await db
    .update(marketingTemplates)
    .set({ status: newStatus })
    .where(eq(marketingTemplates.id, templateId));

  revalidatePath("/crm/templates");
  revalidatePath(`/crm/templates/${templateId}`);
  return { success: true };
}
