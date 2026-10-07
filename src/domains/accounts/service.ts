import { db } from "@/db";
import { accounts, accountGroups, accountTypes, accountingMappings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export class AccountsServiceError extends Error {
  constructor(message: string, public readonly code: "INVALID_INPUT" | "DUPLICATE_RECORD" | "NOT_FOUND") {
    super(message);
    this.name = "AccountsServiceError";
  }
}

export async function getChartOfAccounts(organizationId: string) {
  const allTypes = await db.select().from(accountTypes).where(eq(accountTypes.organizationId, organizationId));
  const allGroups = await db.select().from(accountGroups).where(eq(accountGroups.organizationId, organizationId));
  const allAccounts = await db.select().from(accounts).where(eq(accounts.organizationId, organizationId));

  return {
    types: allTypes,
    groups: allGroups,
    accounts: allAccounts,
  };
}

const createAccountSchema = z.object({
  organizationId: z.string().uuid(),
  accountGroupId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  isSystemAccount: z.boolean().default(false),
});

export async function createAccount(input: z.infer<typeof createAccountSchema>) {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    throw new AccountsServiceError("Invalid input", "INVALID_INPUT");
  }

  const existing = await db.select().from(accounts).where(
    eq(accounts.organizationId, parsed.data.organizationId)
  );
  
  if (existing.some(a => a.code === parsed.data.code)) {
    throw new AccountsServiceError(`Account code ${parsed.data.code} already exists`, "DUPLICATE_RECORD");
  }

  const [newAccount] = await db.insert(accounts).values({
    organizationId: parsed.data.organizationId,
    accountGroupId: parsed.data.accountGroupId,
    name: parsed.data.name,
    code: parsed.data.code,
    description: parsed.data.description,
    isSystemAccount: parsed.data.isSystemAccount,
  }).returning();

  return newAccount;
}

export async function getAccountingMappings(organizationId: string) {
  return await db.select().from(accountingMappings).where(eq(accountingMappings.organizationId, organizationId));
}

const createMappingSchema = z.object({
  organizationId: z.string().uuid(),
  sourceModule: z.string().min(1),
  mappingType: z.string().min(1),
  sourceReferenceId: z.string().min(1),
  accountId: z.string().uuid(),
});

export async function createAccountingMapping(input: z.infer<typeof createMappingSchema>) {
  const parsed = createMappingSchema.safeParse(input);
  if (!parsed.success) throw new AccountsServiceError("Invalid input", "INVALID_INPUT");
  
  const existing = await db.select().from(accountingMappings).where(
    and(
      eq(accountingMappings.organizationId, parsed.data.organizationId),
      eq(accountingMappings.sourceModule, parsed.data.sourceModule),
      eq(accountingMappings.mappingType, parsed.data.mappingType),
      eq(accountingMappings.sourceReferenceId, parsed.data.sourceReferenceId)
    )
  );

  if (existing.length > 0) {
    // Update existing mapping
    const [updated] = await db.update(accountingMappings)
      .set({ accountId: parsed.data.accountId, updatedAt: new Date() })
      .where(eq(accountingMappings.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [newMapping] = await db.insert(accountingMappings).values({
      organizationId: parsed.data.organizationId,
      sourceModule: parsed.data.sourceModule,
      mappingType: parsed.data.mappingType,
      sourceReferenceId: parsed.data.sourceReferenceId,
      accountId: parsed.data.accountId,
    }).returning();
    return newMapping;
  }
}


const createAccountGroupSchema = z.object({
  organizationId: z.string().uuid(),
  accountTypeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
});

export async function createAccountGroup(input: z.infer<typeof createAccountGroupSchema>) {
  const parsed = createAccountGroupSchema.safeParse(input);
  if (!parsed.success) {
    throw new AccountsServiceError("Invalid input", "INVALID_INPUT");
  }

  const existing = await db.select().from(accountGroups).where(
    eq(accountGroups.organizationId, parsed.data.organizationId)
  );
  
  if (existing.some(g => g.code === parsed.data.code)) {
    throw new AccountsServiceError(`Account group code ${parsed.data.code} already exists`, "DUPLICATE_RECORD");
  }

  const [newGroup] = await db.insert(accountGroups).values({
    organizationId: parsed.data.organizationId,
    accountTypeId: parsed.data.accountTypeId,
    name: parsed.data.name,
    code: parsed.data.code,
  }).returning();

  return newGroup;
}

export const updateAccountSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  accountGroupId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  isActive: z.boolean(),
});

export async function updateAccount(input: z.infer<typeof updateAccountSchema>) {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) throw new AccountsServiceError("Invalid input", "INVALID_INPUT");

  const existing = await db.select().from(accounts).where(and(
    eq(accounts.id, parsed.data.id),
    eq(accounts.organizationId, parsed.data.organizationId)
  ));
  
  if (existing.length === 0) throw new AccountsServiceError("Account not found", "NOT_FOUND");
  if (existing[0].isSystemAccount && !parsed.data.isActive) {
    throw new AccountsServiceError("System accounts cannot be deactivated", "INVALID_INPUT");
  }

  const [updated] = await db.update(accounts).set({
    accountGroupId: parsed.data.accountGroupId,
    name: parsed.data.name,
    code: parsed.data.code,
    description: parsed.data.description,
    isActive: parsed.data.isActive,
    updatedAt: new Date()
  }).where(eq(accounts.id, parsed.data.id)).returning();

  return updated;
}

export const updateAccountGroupSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
});

export async function updateAccountGroup(input: z.infer<typeof updateAccountGroupSchema>) {
  const parsed = updateAccountGroupSchema.safeParse(input);
  if (!parsed.success) throw new AccountsServiceError("Invalid input", "INVALID_INPUT");

  const existing = await db.select().from(accountGroups).where(and(
    eq(accountGroups.id, parsed.data.id),
    eq(accountGroups.organizationId, parsed.data.organizationId)
  ));
  
  if (existing.length === 0) throw new AccountsServiceError("Group not found", "NOT_FOUND");

  const [updated] = await db.update(accountGroups).set({
    name: parsed.data.name,
    code: parsed.data.code,
    updatedAt: new Date()
  }).where(eq(accountGroups.id, parsed.data.id)).returning();

  return updated;
}
