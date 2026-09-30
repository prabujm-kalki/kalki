import { db } from "@/db";
import { advanceTypeDefinitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface AdvanceTypePayload {
  organizationId: string;
  locationId?: string;
  code: string;
  name: string;
  calculationBasis?: string;
  maxCapPercentage?: number;
  maxCeilingAmount?: string | number;
  maxCountMonthly?: number;
  maxCountWeekly?: number;
  minTenureDays?: number;
  minNoticeDays?: number;
  minCycleDaysWorked?: number;
  holdbackDays?: number;
  maxRepaymentMonths?: number;
  allowedPaymentModes?: string;
  allowConcurrentAdvances?: boolean;
  isActive?: boolean;
}

export async function createAdvanceType(data: AdvanceTypePayload) {
  const [created] = await db.insert(advanceTypeDefinitions).values({
    organizationId: data.organizationId,
    locationId: data.locationId,
    code: data.code,
    name: data.name,
    calculationBasis: data.calculationBasis,
    maxCapPercentage: data.maxCapPercentage,
    maxCeilingAmount: data.maxCeilingAmount ? data.maxCeilingAmount.toString() : null,
    maxCountMonthly: data.maxCountMonthly,
    maxCountWeekly: data.maxCountWeekly,
    minTenureDays: data.minTenureDays,
    minNoticeDays: data.minNoticeDays,
    minCycleDaysWorked: data.minCycleDaysWorked,
    holdbackDays: data.holdbackDays,
    maxRepaymentMonths: data.maxRepaymentMonths,
    allowedPaymentModes: data.allowedPaymentModes,
    allowConcurrentAdvances: data.allowConcurrentAdvances || false,
    isActive: data.isActive !== undefined ? data.isActive : true,
  }).returning();
  return created;
}

export async function getAdvanceTypes(organizationId: string) {
  return await db
    .select()
    .from(advanceTypeDefinitions)
    .where(eq(advanceTypeDefinitions.organizationId, organizationId));
}

export async function updateAdvanceType(id: string, data: Partial<AdvanceTypePayload>) {
  const [updated] = await db
    .update(advanceTypeDefinitions)
    .set({
      ...data,
      maxCeilingAmount: data.maxCeilingAmount !== undefined ? data.maxCeilingAmount.toString() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(advanceTypeDefinitions.id, id))
    .returning();
  return updated;
}

export async function deleteAdvanceType(id: string) {
  const [deleted] = await db
    .delete(advanceTypeDefinitions)
    .where(eq(advanceTypeDefinitions.id, id))
    .returning();
  return deleted;
}
