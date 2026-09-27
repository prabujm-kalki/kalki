"use server";

import { z } from "zod";
import { db } from "@/db";
import { employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, salaryAdvances } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const upsertSalaryStructureSchema = z.object({
  organizationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  effectiveFrom: z.string().date(),
  isEpfApplicable: z.boolean().default(false),
  isEsiApplicable: z.boolean().default(false),
  isPtApplicable: z.boolean().default(false),
  components: z.array(z.object({
    componentId: z.string().uuid(),
    amount: z.string(), // numeric
  }))
});

export type UpsertSalaryStructureInput = z.infer<typeof upsertSalaryStructureSchema>;

export async function upsertSalaryStructure(input: UpsertSalaryStructureInput) {
  // Validate auth
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders
  });
  
  if (!session) {
    throw new Error("Authentication required");
  }
  
  const parsed = upsertSalaryStructureSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input: " + parsed.error.message);
  }
  
  return await db.transaction(async (tx) => {
    // Insert header
    const [structure] = await tx.insert(employeeSalaryStructures).values({
      organizationId: parsed.data.organizationId,
      employeeId: parsed.data.employeeId,
      effectiveFrom: parsed.data.effectiveFrom,
      isEpfApplicable: parsed.data.isEpfApplicable,
      isEsiApplicable: parsed.data.isEsiApplicable,
      isPtApplicable: parsed.data.isPtApplicable,
    }).returning();
    
    // Insert components
    if (parsed.data.components.length > 0) {
      await tx.insert(employeeSalaryStructureComponents).values(
        parsed.data.components.map(c => ({
          structureId: structure.id,
          componentId: c.componentId,
          amount: c.amount,
        }))
      );
    }
    
    return structure;
  });
}

export const createSalaryAdvanceSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  amount: z.string().min(1, "Amount is required"),
  reason: z.string().optional(),
  dateGiven: z.string().optional(),
  repaymentMethod: z.enum(["DEDUCT_FROM_PAYROLL", "MANUAL_CASH"]).default("DEDUCT_FROM_PAYROLL"),
});

import { headers } from "next/headers";

export async function createSalaryAdvance(input: z.infer<typeof createSalaryAdvanceSchema>) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const parsed = createSalaryAdvanceSchema.parse(input);
    
    await db.insert(salaryAdvances).values({
      organizationId: parsed.organizationId,
      locationId: parsed.locationId,
      employeeId: parsed.employeeId,
      amount: parsed.amount,
      reason: parsed.reason || null,
      dateGiven: parsed.dateGiven ? new Date(parsed.dateGiven) : new Date(),
      repaymentMethod: parsed.repaymentMethod,
      status: 'PENDING',
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating salary advance:", error);
    return { error: "Failed to record salary advance." };
  }
}
