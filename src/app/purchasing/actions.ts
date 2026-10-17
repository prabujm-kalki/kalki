"use server";

import { db } from "@/db";
import { 
  items, 
  branchPurchasePolicies, 
  spotPurchases, 
  inventoryLedger, 
  vendorItems, 
  journalEntries, 
  journalLineItems, 
  accounts,
  accountGroups,
  accountTypes
} from "@/db/schema";
import { eq, ne, and, desc, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface QuickPurchaseInput {
  organizationId: string;
  locationId: string;
  itemId: string;
  vendorName: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  totalAmount: number;
  paymentSource?: "PETTY_CASH" | "CASH_DRAWER";
  receiptPhotoUrl?: string | null;
  submittedByUserId: string;
  notes?: string;
}

export interface QuickPurchasePolicyCheckResult {
  allowed: boolean;
  reason?: string;
  policy?: {
    maxSpotPurchaseTransactionLimit: number;
    maxDailySpotPurchaseTotal: number;
    maxItemDailyFrequency: number;
    requirePhotoEvidence: boolean;
  };
  todaySpent: number;
  todayItemCount: number;
}

/**
 * Validates Ex-Ante rules against branch purchase policies and item configuration.
 */
export async function validateQuickPurchase(
  organizationId: string,
  locationId: string,
  itemId: string,
  amount: number,
  receiptPhotoUrl?: string | null,
  unitPrice?: number | null
): Promise<QuickPurchasePolicyCheckResult> {
  // 1. Fetch Item details
  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.organizationId, organizationId)))
    .limit(1);

  if (!item) {
    return {
      allowed: false,
      reason: "Item not found or does not belong to this organization.",
      todaySpent: 0,
      todayItemCount: 0,
    };
  }

  if (!item.allowSpotPurchase) {
    return {
      allowed: false,
      reason: `Item '${item.nameEn}' is not configured for Quick / Spot Purchase. Please enable it in Settings.`,
      todaySpent: 0,
      todayItemCount: 0,
    };
  }

  if (item.spotPurchasePriceLimit && unitPrice !== undefined && unitPrice !== null && unitPrice > parseFloat(item.spotPurchasePriceLimit.toString())) {
    const limit = parseFloat(item.spotPurchasePriceLimit.toString()).toFixed(2);
    return {
      allowed: false,
      reason: `Unit price ₹${unitPrice.toFixed(2)} exceeds maximum price cap of ₹${limit} for ${item.nameEn}.`,
      todaySpent: 0,
      todayItemCount: 0,
    };
  }

  // 2. Fetch Branch Policy (or fallback defaults)
  const [policy] = await db
    .select()
    .from(branchPurchasePolicies)
    .where(
      and(
        eq(branchPurchasePolicies.organizationId, organizationId),
        eq(branchPurchasePolicies.locationId, locationId)
      )
    )
    .limit(1);

  const maxTxLimit = policy ? parseFloat(policy.maxSpotPurchaseTransactionLimit.toString()) : 2000;
  const maxDailyLimit = policy ? parseFloat(policy.maxDailySpotPurchaseTotal.toString()) : 5000;
  const maxItemDailyFreq = policy ? policy.maxItemDailyFrequency : 3;
  const requirePhoto = policy ? policy.requirePhotoEvidence : true;

  // Check single transaction limit
  if (amount > maxTxLimit) {
    return {
      allowed: false,
      reason: `Amount ₹${amount.toFixed(2)} exceeds branch per-transaction spot limit of ₹${maxTxLimit.toFixed(2)}.`,
      policy: {
        maxSpotPurchaseTransactionLimit: maxTxLimit,
        maxDailySpotPurchaseTotal: maxDailyLimit,
        maxItemDailyFrequency: maxItemDailyFreq,
        requirePhotoEvidence: requirePhoto,
      },
      todaySpent: 0,
      todayItemCount: 0,
    };
  }

  // Photo check
  if (requirePhoto && (!receiptPhotoUrl || receiptPhotoUrl.trim() === "")) {
    return {
      allowed: false,
      reason: "Branch policy requires photo evidence (receipt/bill/weighment slip) for spot purchases.",
      policy: {
        maxSpotPurchaseTransactionLimit: maxTxLimit,
        maxDailySpotPurchaseTotal: maxDailyLimit,
        maxItemDailyFrequency: maxItemDailyFreq,
        requirePhotoEvidence: requirePhoto,
      },
      todaySpent: 0,
      todayItemCount: 0,
    };
  }

  // 3. Check today's spot purchases for this location
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySpotPurchases = await db
    .select({
      totalAmount: spotPurchases.totalAmount,
      itemId: spotPurchases.itemId,
    })
    .from(spotPurchases)
    .where(
      and(
        eq(spotPurchases.organizationId, organizationId),
        eq(spotPurchases.locationId, locationId),
        gte(spotPurchases.createdAt, todayStart)
      )
    );

  const todaySpent = todaySpotPurchases.reduce((acc, row) => acc + parseFloat(row.totalAmount.toString()), 0);
  const todayItemCount = todaySpotPurchases.filter(row => row.itemId === itemId).length;

  if (todaySpent + amount > maxDailyLimit) {
    return {
      allowed: false,
      reason: `Cumulative daily spot purchases would reach ₹${(todaySpent + amount).toFixed(2)}, which exceeds the branch daily cap of ₹${maxDailyLimit.toFixed(2)}.`,
      policy: {
        maxSpotPurchaseTransactionLimit: maxTxLimit,
        maxDailySpotPurchaseTotal: maxDailyLimit,
        maxItemDailyFrequency: maxItemDailyFreq,
        requirePhotoEvidence: requirePhoto,
      },
      todaySpent,
      todayItemCount,
    };
  }

  if (todayItemCount >= maxItemDailyFreq) {
    return {
      allowed: false,
      reason: `Daily frequency limit reached (${maxItemDailyFreq} purchases/day) for this item.`,
      policy: {
        maxSpotPurchaseTransactionLimit: maxTxLimit,
        maxDailySpotPurchaseTotal: maxDailyLimit,
        maxItemDailyFrequency: maxItemDailyFreq,
        requirePhotoEvidence: requirePhoto,
      },
      todaySpent,
      todayItemCount,
    };
  }

  return {
    allowed: true,
    policy: {
      maxSpotPurchaseTransactionLimit: maxTxLimit,
      maxDailySpotPurchaseTotal: maxDailyLimit,
      maxItemDailyFrequency: maxItemDailyFreq,
      requirePhotoEvidence: requirePhoto,
    },
    todaySpent,
    todayItemCount,
  };
}

/**
 * Executes a Quick Purchase atomically within a database transaction.
 */
export async function executeQuickPurchase(input: QuickPurchaseInput) {
  return await db.transaction(async (tx) => {
    // 1. Re-validate Ex-Ante constraints inside transaction
    const [item] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, input.itemId), eq(items.organizationId, input.organizationId)))
      .limit(1)
      .for("share");

    if (!item) {
      throw new Error("Target item not found.");
    }

    if (!item.allowSpotPurchase) {
      throw new Error(`Item '${item.nameEn}' is not configured for Quick / Spot Purchase.`);
    }

    if (item.spotPurchasePriceLimit && input.unitPrice > parseFloat(item.spotPurchasePriceLimit.toString())) {
      throw new Error(
        `Unit price ₹${input.unitPrice.toFixed(2)} exceeds item limit cap of ₹${parseFloat(item.spotPurchasePriceLimit.toString()).toFixed(2)}.`
      );
    }

    // Branch policy check
    const [policy] = await tx
      .select()
      .from(branchPurchasePolicies)
      .where(
        and(
          eq(branchPurchasePolicies.organizationId, input.organizationId),
          eq(branchPurchasePolicies.locationId, input.locationId)
        )
      )
      .limit(1)
      .for("share");

    const maxTxLimit = policy ? parseFloat(policy.maxSpotPurchaseTransactionLimit.toString()) : 2000;
    const maxDailyLimit = policy ? parseFloat(policy.maxDailySpotPurchaseTotal.toString()) : 5000;
    const maxItemDailyFreq = policy ? policy.maxItemDailyFrequency : 3;
    const requirePhoto = policy ? policy.requirePhotoEvidence : true;

    if (input.totalAmount > maxTxLimit) {
      throw new Error(`Amount ₹${input.totalAmount.toFixed(2)} exceeds branch limit of ₹${maxTxLimit.toFixed(2)}.`);
    }

    if (requirePhoto && (!input.receiptPhotoUrl || input.receiptPhotoUrl.trim() === "")) {
      throw new Error("Branch policy requires receipt photo evidence for spot purchases.");
    }

    // Check today's totals
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRows = await tx
      .select({
        totalAmount: spotPurchases.totalAmount,
        itemId: spotPurchases.itemId,
      })
      .from(spotPurchases)
      .where(
        and(
          eq(spotPurchases.organizationId, input.organizationId),
          eq(spotPurchases.locationId, input.locationId),
          gte(spotPurchases.createdAt, todayStart)
        )
      );

    const currentDailyTotal = todayRows.reduce((acc, r) => acc + parseFloat(r.totalAmount.toString()), 0);
    const currentItemCount = todayRows.filter(r => r.itemId === input.itemId).length;

    if (currentDailyTotal + input.totalAmount > maxDailyLimit) {
      throw new Error(`Daily spot purchase total would exceed branch cap of ₹${maxDailyLimit.toFixed(2)}.`);
    }

    if (currentItemCount >= maxItemDailyFreq) {
      throw new Error(`Item ${item.nameEn} has already reached daily spot purchase frequency limit (${maxItemDailyFreq}).`);
    }

    // 2. Generate Voucher Number (SPOT-YYYYMMDD-XXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const seqCount = todayRows.length + 1;
    const voucherNumber = `SPOT-${dateStr}-${seqCount.toString().padStart(3, "0")}`;

    // 3. Insert Spot Purchase Ledger Record
    const [record] = await tx
      .insert(spotPurchases)
      .values({
        organizationId: input.organizationId,
        locationId: input.locationId,
        voucherNumber,
        itemId: input.itemId,
        vendorName: input.vendorName,
        quantity: input.quantity.toString(),
        uom: input.uom,
        unitPrice: input.unitPrice.toString(),
        totalAmount: input.totalAmount.toString(),
        paymentSource: input.paymentSource || "PETTY_CASH",
        receiptPhotoUrl: input.receiptPhotoUrl || null,
        submittedByUserId: input.submittedByUserId,
        auditStatus: "PENDING_AUDIT",
        auditNotes: input.notes || null,
      })
      .returning();

    // 4. Update Inventory Ledger if item is inventory tracked
    if (item.isInventoryTracked) {
      // Find or link a vendorItem for this location/item
      let [vItem] = await tx
        .select()
        .from(vendorItems)
        .where(
          and(
            eq(vendorItems.organizationId, input.organizationId),
            eq(vendorItems.locationId, input.locationId),
            eq(vendorItems.itemId, input.itemId)
          )
        )
        .limit(1);

      if (!vItem) {
        // Need a vendor to associate with vendorItem if required by foreign key
        const [defaultVendor] = await tx
          .select({ vendorId: vendorItems.vendorId })
          .from(vendorItems)
          .where(eq(vendorItems.organizationId, input.organizationId))
          .limit(1);

        if (defaultVendor) {
          const [newVItem] = await tx
            .insert(vendorItems)
            .values({
              organizationId: input.organizationId,
              locationId: input.locationId,
              vendorId: defaultVendor.vendorId,
              itemId: input.itemId,
              itemName: item.nameEn,
              itemCode: null,
              unitOfMeasure: input.uom,
              normalQuantity: "0",
              minimumStock: "0",
              lastRate: input.unitPrice.toString(),
              isActive: true,
            })
            .returning();
          vItem = newVItem;
        }
      }

      if (vItem) {
        // Read current balance
        const [latestLedger] = await tx
          .select({ balanceAfter: inventoryLedger.balanceAfter })
          .from(inventoryLedger)
          .where(
            and(
              eq(inventoryLedger.organizationId, input.organizationId),
              eq(inventoryLedger.locationId, input.locationId),
              eq(inventoryLedger.vendorItemId, vItem.id)
            )
          )
          .orderBy(desc(inventoryLedger.recordedAt))
          .limit(1)
          .for("update");

        const currentBalance = latestLedger ? parseFloat(latestLedger.balanceAfter) : 0;
        const newBalance = currentBalance + input.quantity;

        // Lookup employee for recorded_by constraint
        const [emp] = await tx
          .select({ id: sql<string>`id` })
          .from(sql`employees`)
          .where(
            sql`organization_id = ${input.organizationId} AND (user_id = ${input.submittedByUserId} OR id::text = ${input.submittedByUserId})`
          )
          .limit(1);

        const [fallbackEmp] = emp ? [emp] : await tx
          .select({ id: sql<string>`id` })
          .from(sql`employees`)
          .where(sql`organization_id = ${input.organizationId}`)
          .limit(1);

        if (fallbackEmp) {
          await tx.insert(inventoryLedger).values({
            organizationId: input.organizationId,
            locationId: input.locationId,
            vendorItemId: vItem.id,
            eventType: "RECEIPT",
            quantityChange: input.quantity.toString(),
            balanceAfter: newBalance.toFixed(4),
            referenceId: record.id,
            notes: `Quick Purchase: ${voucherNumber} - ${input.vendorName}`,
            recordedBy: fallbackEmp.id,
          });
        }
      }
    }

    // 5. Post Double-Entry Accounting Entry
    const orgAccounts = await tx
      .select({
        id: accounts.id,
        code: accounts.code,
        name: accounts.name,
        category: accountTypes.category,
      })
      .from(accounts)
      .leftJoin(accountGroups, eq(accounts.accountGroupId, accountGroups.id))
      .leftJoin(accountTypes, eq(accountGroups.accountTypeId, accountTypes.id))
      .where(
        and(
          eq(accounts.organizationId, input.organizationId),
          eq(accounts.isActive, true)
        )
      );

    // Credit account: Petty Cash
    const creditAccount = orgAccounts.find(
      a => a.code === "1120" || a.code === "CASH-001" || a.name.toLowerCase().includes("petty cash")
    ) || orgAccounts.find(
      a => a.code === "1110" || a.name.toLowerCase().includes("cash")
    ) || orgAccounts[0];

    // Debit account: Consumables / Food Cost / Expense
    const debitAccount = orgAccounts.find(
      a => a.code === "5100" || a.name.toLowerCase().includes("food cost") || a.name.toLowerCase().includes("consumables")
    ) || orgAccounts.find(
      a => a.category === "EXPENSE"
    ) || orgAccounts[0];

    if (creditAccount && debitAccount) {
      const entryNumber = `JE-SPOT-${dateStr}-${seqCount.toString().padStart(3, "0")}`;
      
      const [journalEntry] = await tx
        .insert(journalEntries)
        .values({
          organizationId: input.organizationId,
          entryNumber,
          entryDate: new Date().toISOString().split("T")[0],
          narration: `Spot Purchase ${voucherNumber} - ${item.nameEn} from ${input.vendorName}`,
          sourceModule: "SPOT_PURCHASE",
          sourceReferenceId: record.id,
          totalAmount: input.totalAmount.toString(),
          status: "POSTED",
          createdById: input.submittedByUserId,
        })
        .returning();

      await tx.insert(journalLineItems).values([
        {
          journalEntryId: journalEntry.id,
          accountId: debitAccount.id,
          locationId: input.locationId,
          partyType: "VENDOR",
          debit: input.totalAmount.toString(),
          credit: "0",
          narration: `Spot purchase of ${item.nameEn} (${input.quantity} ${input.uom})`,
        },
        {
          journalEntryId: journalEntry.id,
          accountId: creditAccount.id,
          locationId: input.locationId,
          partyType: "VENDOR",
          debit: "0",
          credit: input.totalAmount.toString(),
          narration: `Paid via ${input.paymentSource || "Petty Cash"} drawer`,
        },
      ]);
    }

    return record;
  });
}

/**
 * Manager audit action for Shift-End verification.
 */
export async function auditSpotPurchase(
  spotPurchaseId: string,
  organizationId: string,
  locationId: string,
  auditStatus: "AUDITED_CLEARED" | "FLAGGED_DISCREPANCY",
  auditedByUserId: string,
  auditNotes?: string
) {
  const [updated] = await db
    .update(spotPurchases)
    .set({
      auditStatus,
      auditedByUserId,
      auditNotes: auditNotes || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(spotPurchases.id, spotPurchaseId),
        eq(spotPurchases.organizationId, organizationId),
        eq(spotPurchases.locationId, locationId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Spot purchase record not found or unauthorized access.");
  }

  try {
    revalidatePath("/purchasing");
  } catch {}
  return updated;
}

/**
 * Fetches pending audit spot purchases for a specific branch.
 */
export async function getPendingAuditSpotPurchases(
  organizationId: string,
  locationId: string,
  status: "PENDING_AUDIT" | "AUDITED_CLEARED" | "FLAGGED_DISCREPANCY" | "ALL" = "PENDING_AUDIT"
) {
  const conditions = [
    eq(spotPurchases.organizationId, organizationId),
    eq(spotPurchases.locationId, locationId),
  ];

  if (status !== "ALL") {
    conditions.push(eq(spotPurchases.auditStatus, status));
  }

  return await db
    .select({
      id: spotPurchases.id,
      voucherNumber: spotPurchases.voucherNumber,
      itemId: spotPurchases.itemId,
      itemName: items.nameEn,
      itemCode: sql<string | null>`NULL`,
      vendorName: spotPurchases.vendorName,
      quantity: spotPurchases.quantity,
      uom: spotPurchases.uom,
      unitPrice: spotPurchases.unitPrice,
      totalAmount: spotPurchases.totalAmount,
      paymentSource: spotPurchases.paymentSource,
      receiptPhotoUrl: spotPurchases.receiptPhotoUrl,
      submittedByUserId: spotPurchases.submittedByUserId,
      auditStatus: spotPurchases.auditStatus,
      auditedByUserId: spotPurchases.auditedByUserId,
      auditNotes: spotPurchases.auditNotes,
      createdAt: spotPurchases.createdAt,
    })
    .from(spotPurchases)
    .leftJoin(items, eq(spotPurchases.itemId, items.id))
    .where(and(...conditions))
    .orderBy(desc(spotPurchases.createdAt));
}

/**
 * Fetches branch purchase policy or creates default.
 */
export async function getBranchPurchasePolicy(organizationId: string, locationId: string) {
  let [policy] = await db
    .select()
    .from(branchPurchasePolicies)
    .where(
      and(
        eq(branchPurchasePolicies.organizationId, organizationId),
        eq(branchPurchasePolicies.locationId, locationId)
      )
    )
    .limit(1);

  if (!policy) {
    const [created] = await db
      .insert(branchPurchasePolicies)
      .values({
        organizationId,
        locationId,
        maxSpotPurchaseTransactionLimit: "2000.00",
        maxDailySpotPurchaseTotal: "5000.00",
        maxItemDailyFrequency: 3,
        requirePhotoEvidence: true,
        slaHours: 4,
        escalationRoleId: null,
        autoEscalateToOwner: true,
      })
      .returning();
    policy = created;
  }

  return policy;
}

/**
 * Updates branch purchase policy limits.
 */
export async function updateBranchPurchasePolicy(
  organizationId: string,
  locationId: string,
  data: {
    maxSpotPurchaseTransactionLimit: number;
    maxDailySpotPurchaseTotal: number;
    maxItemDailyFrequency: number;
    requirePhotoEvidence: boolean;
    slaHours?: number;
    reviewRoleId?: string | null;
    escalationRoleId?: string | null;
    autoEscalateToOwner?: boolean;
  }
) {
  const [existing] = await db
    .select()
    .from(branchPurchasePolicies)
    .where(
      and(
        eq(branchPurchasePolicies.organizationId, organizationId),
        eq(branchPurchasePolicies.locationId, locationId)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(branchPurchasePolicies)
      .set({
        maxSpotPurchaseTransactionLimit: data.maxSpotPurchaseTransactionLimit.toFixed(2),
        maxDailySpotPurchaseTotal: data.maxDailySpotPurchaseTotal.toFixed(2),
        maxItemDailyFrequency: data.maxItemDailyFrequency,
        requirePhotoEvidence: data.requirePhotoEvidence,
        slaHours: data.slaHours ?? 4,
        reviewRoleId: data.reviewRoleId || null,
        escalationRoleId: data.escalationRoleId || null,
        autoEscalateToOwner: data.autoEscalateToOwner ?? true,
        updatedAt: new Date(),
      })
      .where(eq(branchPurchasePolicies.id, existing.id))
      .returning();
    try {
      revalidatePath("/settings/purchasing");
    } catch {}
    return updated;
  } else {
    const [created] = await db
      .insert(branchPurchasePolicies)
      .values({
        organizationId,
        locationId,
        maxSpotPurchaseTransactionLimit: data.maxSpotPurchaseTransactionLimit.toFixed(2),
        maxDailySpotPurchaseTotal: data.maxDailySpotPurchaseTotal.toFixed(2),
        maxItemDailyFrequency: data.maxItemDailyFrequency,
        requirePhotoEvidence: data.requirePhotoEvidence,
        slaHours: data.slaHours ?? 4,
        reviewRoleId: data.reviewRoleId || null,
        escalationRoleId: data.escalationRoleId || null,
        autoEscalateToOwner: data.autoEscalateToOwner ?? true,
      })
      .returning();
    try {
      revalidatePath("/settings/purchasing");
    } catch {}
    return created;
  }
}

/**
 * Updates an item's spot purchase settings.
 */
export async function updateItemSpotPurchaseConfig(
  itemId: string,
  organizationId: string,
  data: {
    allowSpotPurchase: boolean;
    spotPurchasePriceLimit?: number | null;
    isInventoryTracked?: boolean;
  }
) {
  const [updated] = await db
    .update(items)
    .set({
      allowSpotPurchase: data.allowSpotPurchase,
      spotPurchasePriceLimit: data.spotPurchasePriceLimit !== undefined && data.spotPurchasePriceLimit !== null 
        ? data.spotPurchasePriceLimit.toFixed(2) 
        : null,
      isInventoryTracked: data.isInventoryTracked !== undefined ? data.isInventoryTracked : true,
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, itemId), eq(items.organizationId, organizationId)))
    .returning();

  try {
    revalidatePath("/settings/purchasing");
  } catch {}
  return updated;
}

/**
 * Gets all items with spot purchase configuration.
 */
export async function getSpotPurchaseItems(organizationId: string, locationId: string) {
  return await db
    .select({
      id: items.id,
      nameEn: items.nameEn,
      nameTa: items.nameTa,
      unit: items.unit,
      currentPrice: items.currentPrice,
      allowSpotPurchase: items.allowSpotPurchase,
      spotPurchasePriceLimit: items.spotPurchasePriceLimit,
      isInventoryTracked: items.isInventoryTracked,
    })
    .from(items)
    .where(
      and(
        eq(items.organizationId, organizationId),
        eq(items.locationId, locationId),
        eq(items.isActive, true),
        ne(items.itemType, 'MENU_ITEM')
      )
    )
    .orderBy(items.nameEn);
}
