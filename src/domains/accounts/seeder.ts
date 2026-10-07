import { db } from "@/db";
import { accountTypes, accountGroups, accounts } from "@/db/schema";

export async function seedDefaultChartOfAccounts(organizationId: string) {
  // Define standard types
  const types = [
    { name: "Assets", category: "ASSET" },
    { name: "Liabilities", category: "LIABILITY" },
    { name: "Equity", category: "EQUITY" },
    { name: "Income", category: "INCOME" },
    { name: "Expenses", category: "EXPENSE" },
  ];

  const typeMap: Record<string, string> = {};

  for (const t of types) {
    const [inserted] = await db.insert(accountTypes).values({
      organizationId,
      name: t.name,
      category: t.category,
    }).returning();
    typeMap[t.category] = inserted.id;
  }

  // Define standard groups
  const groups = [
    { name: "Cash & Cash Equivalents", code: "1100", typeCategory: "ASSET" },
    { name: "Receivables", code: "1200", typeCategory: "ASSET" },
    { name: "Inventory", code: "1300", typeCategory: "ASSET" },
    { name: "Fixed Assets", code: "1500", typeCategory: "ASSET" },
    { name: "Accounts Payable", code: "2100", typeCategory: "LIABILITY" },
    { name: "Taxes Payable", code: "2200", typeCategory: "LIABILITY" },
    { name: "Salary Payable", code: "2300", typeCategory: "LIABILITY" },
    { name: "Owner Capital", code: "3100", typeCategory: "EQUITY" },
    { name: "Retained Earnings", code: "3200", typeCategory: "EQUITY" },
    { name: "Restaurant Sales", code: "4100", typeCategory: "INCOME" },
    { name: "Other Income", code: "4300", typeCategory: "INCOME" },
    { name: "Cost of Goods Sold", code: "5000", typeCategory: "EXPENSE" },
    { name: "Operating Expenses", code: "6000", typeCategory: "EXPENSE" },
  ];

  const groupMap: Record<string, string> = {};

  for (const g of groups) {
    const [inserted] = await db.insert(accountGroups).values({
      organizationId,
      accountTypeId: typeMap[g.typeCategory],
      name: g.name,
      code: g.code,
    }).returning();
    groupMap[g.code] = inserted.id;
  }

  // Define essential system accounts
  const defaultAccounts = [
    { name: "Cash in Hand", code: "1110", groupCode: "1100", isSystem: false },
    { name: "Petty Cash", code: "1120", groupCode: "1100", isSystem: false },
    { name: "Default Bank Account", code: "1130", groupCode: "1100", isSystem: true },
    { name: "Accounts Receivable", code: "1210", groupCode: "1200", isSystem: true },
    { name: "Inter-Branch Receivable", code: "1290", groupCode: "1200", isSystem: true },
    { name: "GRNI Suspense", code: "2105", groupCode: "2100", isSystem: true },
    { name: "Accounts Payable (Vendors)", code: "2110", groupCode: "2100", isSystem: true },
    { name: "Inter-Branch Payable", code: "2190", groupCode: "2100", isSystem: true },
    { name: "GST Input", code: "2210", groupCode: "2200", isSystem: true },
    { name: "GST Output", code: "2220", groupCode: "2200", isSystem: true },
    { name: "Food Cost", code: "5100", groupCode: "5000", isSystem: false },
    { name: "Employee Cost", code: "6100", groupCode: "6000", isSystem: false },
    { name: "Utilities", code: "6200", groupCode: "6000", isSystem: false },
  ];

  for (const a of defaultAccounts) {
    await db.insert(accounts).values({
      organizationId,
      accountGroupId: groupMap[a.groupCode],
      name: a.name,
      code: a.code,
      isSystemAccount: a.isSystem,
    });
  }
}
