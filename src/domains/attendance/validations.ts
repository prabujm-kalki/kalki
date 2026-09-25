import { z } from "zod";

export const BiometricPunchRowSchema = z.object({
  biometricId: z.union([z.string(), z.number()]).transform(String),
  punchTimestamp: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  machineId: z.string().min(1, "Machine ID is required").default("UNKNOWN"),
  punchType: z.enum(["IN", "OUT", "UNKNOWN"]).default("UNKNOWN"),
});

export const BiometricPunchBatchSchema = z.array(BiometricPunchRowSchema);

export type BiometricPunchRow = z.infer<typeof BiometricPunchRowSchema>;
export type BiometricPunchBatch = z.infer<typeof BiometricPunchBatchSchema>;

export const LeaveConfigSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  isPaid: z.boolean().default(true),
  annualAllocation: z.union([z.string(), z.number()]).transform(String),
  accrualFrequency: z.enum(["MONTHLY", "YEARLY", "PRO_RATA"]).default("YEARLY"),
  accrualRate: z.union([z.string(), z.number()]).transform(String).optional(),
  carryForwardExpiryMonths: z.union([z.string(), z.number()]).transform(Number).optional(),
  minTenureDays: z.union([z.string(), z.number()]).transform(Number).default(0),
  minNoticeDays: z.union([z.string(), z.number()]).transform(Number).default(0),
  maxConsecutiveDays: z.union([z.string(), z.number()]).transform(Number).optional(),
  isEncashable: z.boolean().default(false),
  encashmentMinTenureDays: z.union([z.string(), z.number()]).transform(Number).default(365),
  encashmentMinBalanceRetained: z.union([z.string(), z.number()]).transform(String).default("3"),
  encashmentOnlyAtYearEnd: z.boolean().default(true),
  restrictedUsageDays: z.array(z.string()).default([]),
  allowedApplicationWindow: z.array(z.string()).default([]),
  rolePolicies: z.array(z.object({
    businessRoleId: z.string().uuid(),
    customAccrualRate: z.union([z.string(), z.number()]).transform(String).optional(),
    maxConcurrentLeaves: z.union([z.string(), z.number()]).transform(Number).optional()
  })).optional().default([]),
  departmentPolicies: z.array(z.object({
    departmentId: z.string().uuid(),
    maxConcurrentLeaves: z.union([z.string(), z.number()]).transform(Number).optional()
  })).optional().default([]),
});

export type LeaveConfigData = z.infer<typeof LeaveConfigSchema>;

export const LeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(), // YYYY-MM-DD
  isHalfDay: z.boolean().default(false),
  reason: z.string().min(1, "Reason is required"),
  evidenceUrl: z.string().optional(),
});

export type LeaveRequestData = z.infer<typeof LeaveRequestSchema>;

export const EncashmentRequestSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  encashmentDays: z.union([z.string(), z.number()]).transform(Number),
  reason: z.string().min(1, "Reason is required"),
});

export type EncashmentRequestData = z.infer<typeof EncashmentRequestSchema>;
