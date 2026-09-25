const fs = require('fs');
let content = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

const s1 = export const salaryInputSchema = z.object({
  salaryType: z.enum(["Daily", "Weekly", "Monthly"]),
  amount: z.string().regex(/^\\d+(\\.\\d{1,2})?$/),
  paymentMethod: z.enum(["BANK_TRANSFER", "GPAY", "CASH"]),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  gpayNumber: z.string().optional(),
  bankingName: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.paymentMethod === "BANK_TRANSFER") {
    if (!val.accountNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for bank transfer", path: ["accountNumber"] });
    if (!val.bankName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for bank transfer", path: ["bankName"] });
    if (!val.ifscCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for bank transfer", path: ["ifscCode"] });
  } else if (val.paymentMethod === "GPAY") {
    if (!val.gpayNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for GPay", path: ["gpayNumber"] });
    if (!val.bankingName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for GPay", path: ["bankingName"] });
  }
});

export type SalaryInput = z.infer<typeof salaryInputSchema>;;

content = content.replace(s1, '');
content = content.replace('salary: salaryInputSchema.optional(),', '');
content = content.replace('salary: salaryInputSchema.optional(),', '');
content = content.replace('salary: salaryInputSchema.optional(),', '');

fs.writeFileSync('src/domains/employees/service.ts', content);
console.log('Done simple replace');
