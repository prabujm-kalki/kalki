"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { fixedAssets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { postManualJournal } from "./actions";
import { v4 as uuid } from "uuid";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchFixedAssets(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const data = await db.select().from(fixedAssets).where(eq(fixedAssets.organizationId, organizationId));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runDepreciationRun(input: {
  organizationId: string;
  locationId: string;
  assetId: string;
  depreciationAmount: number;
  assetAccountId: string;
  depreciationExpenseAccountId: string;
}) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    // 1. Log the depreciation in the manual journal (Debit Depreciation Expense, Credit Accumulated Depreciation / Asset)
    await postManualJournal({
      organizationId: input.organizationId,
      locationId: input.locationId,
      category: "DEPRECIATION",
      entryDate: new Date(),
      narration: `Monthly Depreciation for Asset ${input.assetId}`,
      lines: [
        {
          accountId: input.depreciationExpenseAccountId,
          isDebit: true,
          amount: input.depreciationAmount,
          locationId: input.locationId,
          narration: "Depreciation Expense"
        },
        {
          accountId: input.assetAccountId,
          isDebit: false,
          amount: input.depreciationAmount,
          locationId: input.locationId,
          narration: "Accumulated Depreciation"
        }
      ]
    });

    // 2. Update the asset's current value in the database
    // (Assuming Drizzle ORM supports this, but since we just added it, we'll fetch current, subtract, and update)
    const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, input.assetId));
    if (asset) {
      const newValue = parseFloat(asset.currentValue) - input.depreciationAmount;
      await db.update(fixedAssets)
        .set({ currentValue: newValue.toString(), updatedAt: new Date() })
        .where(eq(fixedAssets.id, input.assetId));
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
