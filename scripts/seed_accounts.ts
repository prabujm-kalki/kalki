import "dotenv/config";
import { db } from "../src/db";
import { accountTypes, accountGroups, accounts, accountingMappings } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function seedAccounts(organizationId: string) {
  console.log(`Seeding accounts for organization: ${organizationId}`);

  // 1. Create Default Account Types
  const typeDefs = [
    { name: "Current Assets", category: "ASSET" },
    { name: "Current Liabilities", category: "LIABILITY" },
    { name: "Direct Expenses", category: "EXPENSE" },
    { name: "Direct Income", category: "INCOME" },
    { name: "Equity", category: "EQUITY" }
  ];

  const typeIdMap: Record<string, string> = {};
  for (const t of typeDefs) {
    const existing = await db.select().from(accountTypes).where(and(eq(accountTypes.organizationId, organizationId), eq(accountTypes.name, t.name)));
    if (existing.length === 0) {
      const [inserted] = await db.insert(accountTypes).values({
        organizationId,
        name: t.name,
        category: t.category
      }).returning();
      typeIdMap[t.name] = inserted.id;
    } else {
      typeIdMap[t.name] = existing[0].id;
    }
  }

  // 2. Create Default Account Groups
  const groupDefs = [
    { name: "Bank & Cash Accounts", code: "BANK_CASH", type: "Current Assets", systemCategory: "BANK_CASH" },
    { name: "Trade Receivables", code: "AR", type: "Current Assets", systemCategory: "RECEIVABLES" },
    { name: "Inventory", code: "INV", type: "Current Assets", systemCategory: "INVENTORY" },
    { name: "Trade Payables", code: "AP", type: "Current Liabilities", systemCategory: "PAYABLES" },
    { name: "Current Liabilities", code: "CL", type: "Current Liabilities", systemCategory: "CURRENT_LIABILITIES" },
    { name: "Cost of Goods Sold", code: "COGS", type: "Direct Expenses", systemCategory: "COGS" },
    { name: "Sales Revenue", code: "SALES", type: "Direct Income", systemCategory: "REVENUE" }
  ];

  const groupIdMap: Record<string, string> = {};
  for (const g of groupDefs) {
    const existing = await db.select().from(accountGroups).where(and(eq(accountGroups.organizationId, organizationId), eq(accountGroups.code, g.code)));
    if (existing.length === 0) {
      const [inserted] = await db.insert(accountGroups).values({
        organizationId,
        accountTypeId: typeIdMap[g.type],
        name: g.name,
        code: g.code,
        systemCategory: g.systemCategory
      }).returning();
      groupIdMap[g.code] = inserted.id;
    } else {
      groupIdMap[g.code] = existing[0].id;
    }
  }

  // 3. Create Default Accounts
  const accDefs = [
    { name: "Main Bank Account", code: "BANK-001", group: "BANK_CASH", isSystem: false },
    { name: "Petty Cash", code: "CASH-001", group: "BANK_CASH", isSystem: false },
    { name: "Accounts Receivable Control", code: "AR-CTRL", group: "AR", isSystem: true, controlType: "CUSTOMER_RECEIVABLE" },
    { name: "Accounts Payable Control", code: "AP-CTRL", group: "AP", isSystem: true, controlType: "VENDOR_PAYABLE" },
    { name: "GRNI Suspense", code: "GRNI-001", group: "CL", isSystem: true, controlType: null },
    { name: "Raw Material Inventory", code: "INV-RM", group: "INV", isSystem: false, controlType: null },
    { name: "Inter-Branch Clearing", code: "INTER-BRANCH", group: "CL", isSystem: true, controlType: null },
  ];

  const accIdMap: Record<string, string> = {};
  for (const a of accDefs) {
    const existing = await db.select().from(accounts).where(and(eq(accounts.organizationId, organizationId), eq(accounts.code, a.code)));
    if (existing.length === 0) {
      const [inserted] = await db.insert(accounts).values({
        organizationId,
        accountGroupId: groupIdMap[a.group],
        name: a.name,
        code: a.code,
        isSystemAccount: a.isSystem,
        controlAccountType: a.controlType
      }).returning();
      accIdMap[a.code] = inserted.id;
    } else {
      accIdMap[a.code] = existing[0].id;
    }
  }

  // 4. Create Standard Mappings
  const mapDefs = [
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "GRNI_SUSPENSE", accountCode: "GRNI-001" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "VENDOR_PAYABLE", accountCode: "AP-CTRL" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "BANK_CASH", accountCode: "BANK-001" },
    { sourceModule: "SYSTEM", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "INTER_BRANCH_RECEIVABLE", accountCode: "INTER-BRANCH" },
    { sourceModule: "SYSTEM", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "INTER_BRANCH_PAYABLE", accountCode: "INTER-BRANCH" },
  ];

  for (const m of mapDefs) {
    const existing = await db.select().from(accountingMappings).where(and(
      eq(accountingMappings.organizationId, organizationId),
      eq(accountingMappings.sourceModule, m.sourceModule),
      eq(accountingMappings.mappingType, m.mappingType),
      eq(accountingMappings.sourceReferenceId, m.sourceReferenceId)
    ));
    
    if (existing.length === 0) {
      await db.insert(accountingMappings).values({
        organizationId,
        sourceModule: m.sourceModule,
        mappingType: m.mappingType,
        sourceReferenceId: m.sourceReferenceId,
        accountId: accIdMap[m.accountCode]
      });
      console.log(`Created mapping: ${m.sourceModule} -> ${m.sourceReferenceId}`);
    }
  }

  console.log("Account seeding completed successfully.");
}

if (require.main === module) {
  const orgId = process.argv[2];
  if (!orgId) {
    console.error("Usage: npx tsx scripts/seed_accounts.ts <organizationId>");
    process.exit(1);
  }
  seedAccounts(orgId).then(() => process.exit(0)).catch(console.error);
}
