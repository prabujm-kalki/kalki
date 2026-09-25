import * as fs from 'fs';
import * as path from 'path';

const actionsFile = path.join(__dirname, 'src', 'domains', 'payroll', 'actions.ts');
let content = fs.readFileSync(actionsFile, 'utf8');

// Also need to import salaryAdvances if not imported.
if (!content.includes('salaryAdvances')) {
  content = content.replace(
    'import { employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents } from "@/db/schema";',
    'import { employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, salaryAdvances } from "@/db/schema";'
  );
}

content += `
export const createSalaryAdvanceSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  amount: z.string().min(1, "Amount is required"),
  reason: z.string().optional(),
  dateGiven: z.string().optional(),
  repaymentMethod: z.enum(["DEDUCT_FROM_PAYROLL", "MANUAL_CASH"]).default("DEDUCT_FROM_PAYROLL"),
});

export async function createSalaryAdvance(input: z.infer<typeof createSalaryAdvanceSchema>) {
  try {
    const session = await auth();
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
`;

fs.writeFileSync(actionsFile, content, 'utf8');
console.log("Appended createSalaryAdvance to actions.ts");
