"use server";

import { z } from "zod";
import { db } from "@/db";
import { employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents } from "@/db/schema";
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
  const session = await auth.api.getSession({
    headers: new Headers() // Assuming NextJS App Router Server Action context
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
