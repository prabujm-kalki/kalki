import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vendors, vendorItems, purchaseOrders, purchaseOrderLines, inventoryLedger, inventoryEventTypes, purchaseSchedules, taskDefinitions, items, taskInstances } from "@/db/schema";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { inventoryPermissions, type EmployeePermission } from "@/lib/authorization-policy";

type Actor = { id: string } | null;

export class InventoryServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "AUTHENTICATION_REQUIRED"
      | "ACCESS_DENIED"
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "DUPLICATE_RECORD"
      | "INSUFFICIENT_STOCK"
      | "CREDIT_EXCEEDED",
  ) {
    super(message);
    this.name = "InventoryServiceError";
  }
}

function requireActor(actor: Actor): asserts actor is { id: string } {
  if (!actor) throw new InventoryServiceError("Authentication required", "AUTHENTICATION_REQUIRED");
}

async function requireScopeAccess(
  actor: { id: string },
  scope: { organizationId: string; locationId: string },
  permission: EmployeePermission,
) {
  const allowed = await authorizeEmployeeOperation({ userId: actor.id, ...scope, permission });
  if (!allowed) throw new InventoryServiceError("Access denied", "ACCESS_DENIED");
}

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export const PaymentTermsMap: Record<string, number> = {
  "DUE_ON_RECEIPT": 0,
  "CASH_IN_ADVANCE": 0,
  "NET_7": 7,
  "NET_15": 15,
  "NET_30": 30,
  "NET_45": 45,
  "NET_60": 60,
  "NET_90": 90,
};

const createVendorSchema = scopeSchema.extend({
  name: z.string().trim().min(1).max(200),
  shortCode: z.string().trim().optional(),
  contactDetails: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).default({}),
  paymentTerms: z.enum(Object.keys(PaymentTermsMap) as [string, ...string[]]).nullable().optional(),
  creditDays: z.number().int().min(0).nullable().optional(),
  creditLimitAmount: z.number().min(0).nullable().optional(),
  poDeliveryMethod: z.enum(["WHATSAPP", "EMAIL", "MANUAL"]).optional().default("WHATSAPP"),
  poWhatsappPreference: z.enum(["TEXT_ONLY", "PDF_LINK_ONLY", "TEXT_AND_PDF_LINK"]).optional().default("TEXT_AND_PDF_LINK"),
}).strict().refine((data) => {
  if (data.paymentTerms) {
    return data.creditDays === PaymentTermsMap[data.paymentTerms];
  }
  return true;
}, {
  message: "Credit days must strictly match the selected payment terms standard.",
  path: ["creditDays"]
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export async function createVendor(actor: Actor, input: CreateVendorInput) {
  requireActor(actor);
  const parsed = createVendorSchema.safeParse(input);
  if (!parsed.success) throw new InventoryServiceError("Invalid vendor input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, inventoryPermissions.create);

  const [vendor] = await db.insert(vendors).values({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    name: parsed.data.name,
    shortCode: parsed.data.shortCode ?? null,
    contactDetails: parsed.data.contactDetails,
    paymentTerms: parsed.data.paymentTerms ?? null,
    creditDays: parsed.data.creditDays ?? null,
    creditLimitAmount: parsed.data.creditLimitAmount?.toString() ?? null,
    poDeliveryMethod: parsed.data.poDeliveryMethod,
    poWhatsappPreference: parsed.data.poWhatsappPreference,
  }).returning();

  return vendor;
}

const updateVendorSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  shortCode: z.string().trim().optional(),
  contactDetails: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  paymentTerms: z.string().nullable().optional(),
  creditDays: z.number().int().min(0).nullable().optional(),
  creditLimitAmount: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  poDeliveryMethod: z.enum(["WHATSAPP", "EMAIL", "MANUAL"]).optional(),
  poWhatsappPreference: z.enum(["TEXT_ONLY", "PDF_LINK_ONLY", "TEXT_AND_PDF_LINK"]).optional(),
}).strict();

export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export async function updateVendor(actor: Actor, input: UpdateVendorInput) {
  requireActor(actor);
  const parsed = updateVendorSchema.safeParse(input);
  if (!parsed.success) throw new InventoryServiceError("Invalid vendor input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, inventoryPermissions.update);

  const [vendor] = await db.update(vendors).set({
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.shortCode !== undefined ? { shortCode: parsed.data.shortCode } : {}),
    ...(parsed.data.contactDetails !== undefined ? { contactDetails: parsed.data.contactDetails } : {}),
    ...(parsed.data.paymentTerms !== undefined ? { paymentTerms: parsed.data.paymentTerms } : {}),
    ...(parsed.data.creditDays !== undefined ? { creditDays: parsed.data.creditDays } : {}),
    ...(parsed.data.creditLimitAmount !== undefined ? { creditLimitAmount: parsed.data.creditLimitAmount?.toString() ?? null } : {}),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    ...(parsed.data.poDeliveryMethod !== undefined ? { poDeliveryMethod: parsed.data.poDeliveryMethod } : {}),
    ...(parsed.data.poWhatsappPreference !== undefined ? { poWhatsappPreference: parsed.data.poWhatsappPreference } : {}),
  }).where(and(
    eq(vendors.id, parsed.data.vendorId),
    eq(vendors.organizationId, parsed.data.organizationId),
    eq(vendors.locationId, parsed.data.locationId),
  )).returning();

  if (!vendor) throw new InventoryServiceError("Vendor not found", "NOT_FOUND");
  return vendor;
}

export async function listVendors(actor: Actor, scope: z.infer<typeof scopeSchema>) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success) throw new InventoryServiceError("Invalid scope", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, inventoryPermissions.read);

  return db.select().from(vendors).where(and(
    eq(vendors.organizationId, scope.organizationId),
    eq(vendors.locationId, scope.locationId),
    eq(vendors.isActive, true)
  ));
}

const addVendorItemSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
  itemId: z.string().uuid(),
  itemName: z.string().trim().min(1).max(200),
  itemCode: z.string().nullable().optional(),
  unitOfMeasure: z.string().min(1).max(50),
  normalQuantity: z.string().regex(/^\d+(\.\d+)?$/).nullable().optional(),
  minimumStock: z.string().regex(/^\d+(\.\d+)?$/).nullable().optional(),
}).strict();

export type AddVendorItemInput = z.infer<typeof addVendorItemSchema>;

export async function addVendorItem(actor: Actor, input: AddVendorItemInput) {
  requireActor(actor);
  const parsed = addVendorItemSchema.safeParse(input);
  if (!parsed.success) throw new InventoryServiceError("Invalid vendor item input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, inventoryPermissions.create);

  // Check if exists
  const existing = await db.select().from(vendorItems).where(
    and(
      eq(vendorItems.vendorId, parsed.data.vendorId),
      eq(vendorItems.itemId, parsed.data.itemId)
    )
  );
  if (existing.length > 0) {
    const [updated] = await db.update(vendorItems).set({
      isActive: true,
      minimumStock: parsed.data.minimumStock ?? null,
      normalQuantity: parsed.data.normalQuantity ?? null,
    }).where(eq(vendorItems.id, existing[0].id)).returning();
    return updated;
  }

  const [item] = await db.insert(vendorItems).values({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    vendorId: parsed.data.vendorId,
    itemId: parsed.data.itemId,
    itemName: parsed.data.itemName,
    itemCode: parsed.data.itemCode ?? null,
    unitOfMeasure: parsed.data.unitOfMeasure,
    normalQuantity: parsed.data.normalQuantity ?? null,
    minimumStock: parsed.data.minimumStock ?? null,
  }).returning();

  return item;
}

export async function listVendorItems(actor: Actor, scope: z.infer<typeof scopeSchema>, vendorId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(vendorId).success) {
    throw new InventoryServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, inventoryPermissions.read);

  const res = await db.select({
    vendorItem: vendorItems,
    itemName: items.nameEn,
    unitOfMeasure: items.unit,
    baseMinStock: items.baseMinStock,
    targetStock: items.targetStock,
    replenishmentStrategy: items.replenishmentStrategy,
    reorderQuantity: items.reorderQuantity,
    purchaseUnit: items.purchaseUnit,
    purchaseUnitConversion: items.purchaseUnitConversion,
  })
  .from(vendorItems)
  .innerJoin(items, eq(vendorItems.itemId, items.id))
  .where(and(
    eq(vendorItems.organizationId, scope.organizationId),
    eq(vendorItems.locationId, scope.locationId),
    eq(vendorItems.vendorId, vendorId),
    eq(vendorItems.isActive, true)
  ));

  return res.map(r => ({
    ...r.vendorItem,
    itemName: r.itemName,
    unitOfMeasure: r.unitOfMeasure,
    baseMinStock: r.baseMinStock,
    targetStock: r.targetStock,
    replenishmentStrategy: r.replenishmentStrategy,
    reorderQuantity: r.reorderQuantity,
    purchaseUnit: r.purchaseUnit,
    purchaseUnitConversion: r.purchaseUnitConversion,
  }));
}

const recordMovementSchema = scopeSchema.extend({
  vendorItemId: z.string().uuid(),
  eventType: z.enum(inventoryEventTypes),
  quantityChange: z.string().regex(/^-?\d+(\.\d+)?$/),
  referenceId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  recordedByEmployeeId: z.string().uuid(),
}).strict();

export type RecordMovementInput = z.infer<typeof recordMovementSchema>;

export async function recordInventoryMovement(actor: Actor, input: RecordMovementInput) {
  requireActor(actor);
  const parsed = recordMovementSchema.safeParse(input);
  if (!parsed.success) throw new InventoryServiceError("Invalid movement input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, inventoryPermissions.create);

  // We use a transaction to lock the latest ledger row and append a new one securely
  const ledgerEntry = await db.transaction(async (tx) => {
    // 1. Get the current balance
    const [latest] = await tx.select({ balanceAfter: inventoryLedger.balanceAfter })
      .from(inventoryLedger)
      .where(and(
        eq(inventoryLedger.organizationId, parsed.data.organizationId),
        eq(inventoryLedger.locationId, parsed.data.locationId),
        eq(inventoryLedger.vendorItemId, parsed.data.vendorItemId)
      ))
      .orderBy(desc(inventoryLedger.recordedAt))
      .limit(1)
      .for("update"); // Lock for update to prevent concurrent race conditions

    const currentBalance = latest ? parseFloat(latest.balanceAfter) : 0;
    const change = parseFloat(parsed.data.quantityChange);
    const newBalance = currentBalance + change;

    // Optional: Business logic check (e.g. negative stock policy)
    // For now we allow negative stock but you can add restrictions here based on location settings.
    
    // 2. Insert the ledger entry
    const [entry] = await tx.insert(inventoryLedger).values({
      organizationId: parsed.data.organizationId,
      locationId: parsed.data.locationId,
      vendorItemId: parsed.data.vendorItemId,
      eventType: parsed.data.eventType,
      quantityChange: parsed.data.quantityChange,
      balanceAfter: newBalance.toFixed(4),
      referenceId: parsed.data.referenceId ?? null,
      notes: parsed.data.notes ?? null,
      recordedBy: parsed.data.recordedByEmployeeId,
    }).returning();

    return entry;
  });

  return ledgerEntry;
}

export async function getInventoryBalance(actor: Actor, scope: z.infer<typeof scopeSchema>, vendorItemId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(vendorItemId).success) {
    throw new InventoryServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, inventoryPermissions.read);

  const [latest] = await db.select({ balanceAfter: inventoryLedger.balanceAfter })
    .from(inventoryLedger)
    .where(and(
      eq(inventoryLedger.organizationId, scope.organizationId),
      eq(inventoryLedger.locationId, scope.locationId),
      eq(inventoryLedger.vendorItemId, vendorItemId)
    ))
    .orderBy(desc(inventoryLedger.recordedAt))
    .limit(1);

  return latest ? parseFloat(latest.balanceAfter) : 0;
}

const purchaseScheduleSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
  responsibleRoleId: z.string().uuid(),
  frequencyRule: z.string().min(1).max(200),
  reminderTime: z.string().min(1).max(50),
}).strict();

export type CreatePurchaseScheduleInput = z.infer<typeof purchaseScheduleSchema>;

export async function createPurchaseSchedule(actor: Actor, input: CreatePurchaseScheduleInput) {
  requireActor(actor);
  const parsed = purchaseScheduleSchema.safeParse(input);
  if (!parsed.success) throw new InventoryServiceError("Invalid purchase schedule input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, inventoryPermissions.create);

  const [schedule] = await db.insert(purchaseSchedules).values({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    vendorId: parsed.data.vendorId,
    responsibleRoleId: parsed.data.responsibleRoleId,
    frequencyRule: parsed.data.frequencyRule,
    reminderTime: parsed.data.reminderTime,
  }).returning();

  // Create the corresponding Task Engine Blueprint
  // We use standard cron notation derived from the inputs
  const cronExpr = parsed.data.frequencyRule === "daily" 
    ? `0 ${parsed.data.reminderTime.split(':')[0]} * * *` 
    : `0 9 * * 1`; // Default to weekly for others in demo
  
  await db.insert(taskDefinitions).values({
    organizationId: parsed.data.organizationId,
    module: "purchase",
    title: `Purchase Order - ${parsed.data.frequencyRule.toUpperCase()}`,
    description: `Generate PO for vendor ${parsed.data.vendorId}`,
    triggerType: "time",
    triggerConfig: { cron: cronExpr },
    targetRoleId: parsed.data.responsibleRoleId,
    priority: "high",
    evidenceRequirementType: "none", // They will proceed to the module to complete it
    contextTemplate: { 
      actionUrl: `/purchasing/manual?vendorId=${parsed.data.vendorId}`,
      actionLabel: "Proceed to PO Generation",
      linkedScheduleId: schedule.id,
      locationId: parsed.data.locationId
    }
  });

  return schedule;
}

export async function listPurchaseSchedules(actor: Actor, scope: z.infer<typeof scopeSchema>, vendorId?: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success) {
    throw new InventoryServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, inventoryPermissions.read);

  const conditions = [
    eq(purchaseSchedules.organizationId, scope.organizationId),
    eq(purchaseSchedules.locationId, scope.locationId),
    eq(purchaseSchedules.isActive, true)
  ];
  
  if (vendorId) {
    if (!z.string().uuid().safeParse(vendorId).success) throw new InventoryServiceError("Invalid vendorId", "INVALID_INPUT");
    conditions.push(eq(purchaseSchedules.vendorId, vendorId));
  }

  return db.select().from(purchaseSchedules).where(and(...conditions));
}

export async function getInventoryDashboard(actor: Actor, scope: z.infer<typeof scopeSchema>) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success) {
    throw new InventoryServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, inventoryPermissions.read);

  const items = await db.select({
    id: vendorItems.id,
    itemName: vendorItems.itemName,
    vendorName: vendors.name,
    unitOfMeasure: vendorItems.unitOfMeasure,
    minimumStock: vendorItems.minimumStock,
  })
  .from(vendorItems)
  .innerJoin(vendors, eq(vendorItems.vendorId, vendors.id))
  .where(and(
    eq(vendorItems.organizationId, scope.organizationId),
    eq(vendorItems.locationId, scope.locationId),
    eq(vendorItems.isActive, true)
  ));

  const balancesResult = await db.execute<{ vendorItemId: string, balanceAfter: string }>(sql`
    SELECT DISTINCT ON (vendor_item_id)
      vendor_item_id as "vendorItemId",
      balance_after as "balanceAfter"
    FROM inventory_ledger
    WHERE organization_id = ${scope.organizationId}
      AND location_id = ${scope.locationId}
    ORDER BY vendor_item_id, recorded_at DESC
  `);

  const balancesMap = new Map(
    (balancesResult as any).rows
      ? (balancesResult as any).rows.map((r: any) => [r.vendorItemId, parseFloat(r.balanceAfter)])
      : (balancesResult as any).map((r: any) => [r.vendorItemId, parseFloat(r.balanceAfter)])
  );

  return items.map(item => ({
    ...item,
    currentBalance: balancesMap.get(item.id) || 0
  }));
}




const createPOSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
  paymentMethod: z.string().default('credit'),
  scheduleId: z.string().uuid().optional(),
  lines: z.array(z.object({
    itemId: z.string().uuid(),
    orderedQuantity: z.number().positive(),
    unitRate: z.number().nonnegative()
  })),
}).strict();

export type CreatePOInput = z.infer<typeof createPOSchema>;

export async function createPurchaseOrder(actor: Actor, input: CreatePOInput) {
  requireActor(actor);
  const parsed = createPOSchema.safeParse(input);
  if (!parsed.success) {
    const errorMsg = "Invalid PO input: " + parsed.error.issues.map(i => i.path.join(".") + " " + i.message).join(", ");
    throw new InventoryServiceError(errorMsg, "INVALID_INPUT");
  }
  
  await requireScopeAccess(actor, parsed.data, inventoryPermissions.create); // Use appropriate permission

  const { organizationId, locationId, vendorId, paymentMethod, scheduleId, lines } = parsed.data;

  if (lines.length === 0 && !scheduleId) {
    throw new InventoryServiceError("You must order at least 1 item.", "INVALID_INPUT");
  }

  // Calculate total
  const totalAmount = lines.reduce((acc, line) => acc + (line.orderedQuantity * line.unitRate), 0);

  // Credit limit check if not cash
  if (paymentMethod !== 'cash') {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId));
    if (!vendor) throw new InventoryServiceError("Vendor not found", "NOT_FOUND");
    
    if (vendor.creditLimitAmount !== null) {
      const limit = parseFloat(vendor.creditLimitAmount);
      // In a real app, calculate current outstanding balance. Assuming 0 for now as stub.
      const currentOutstanding = 0; 
      if (currentOutstanding + totalAmount > limit) {
        throw new InventoryServiceError(`Credit limit exceeded. Limit: ₹${limit}, Order: ₹${totalAmount}`, "CREDIT_EXCEEDED");
      }
    }
  }

  const result = await db.transaction(async (tx) => {
    let po = null;
    
    if (lines.length > 0) {
      // 1. Get vendor details for the PO number
      const [vendorRec] = await tx.select().from(vendors).where(eq(vendors.id, vendorId));
      const shortCode = vendorRec?.shortCode || "PO";

      // 2. Format date
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const dateString = `${dd}_${mm}_${yyyy}`;

      // 3. Get sequence number
      const likePattern = `${shortCode}-${dateString}-%`;
      const countRes = await tx.execute<{count: number}>(sql`
        SELECT COUNT(*)::int as count 
        FROM purchase_orders 
        WHERE vendor_id = ${vendorId} AND po_number LIKE ${likePattern}
      `);
      // handle execute return structure safely
      const countVal = countRes.rows ? (countRes.rows[0] as any).count : (countRes[0] as any).count;
      const seq = String((countVal || 0) + 1).padStart(2, '0');
      const poNumber = `${shortCode}-${dateString}-${seq}`;

      [po] = await tx.insert(purchaseOrders).values({
        organizationId,
        locationId,
        vendorId,
        poNumber,
        totalAmount: totalAmount.toString(),
        paymentMethod,
        status: scheduleId ? 'pending_approval' : 'draft',
        publicToken: crypto.randomUUID(),
      }).returning();

      const poLines = lines.map(line => ({
        poId: po.id,
        itemId: line.itemId,
        orderedQuantity: line.orderedQuantity.toString(),
        unitRate: line.unitRate.toString()
      }));

      await tx.insert(purchaseOrderLines).values(poLines);
    }
    
    if (scheduleId) {
      // Find active tasks associated with this schedule directly in the database
      const activeInstances = await tx.select({
        id: taskInstances.id,
        priority: taskInstances.priority,
      })
      .from(taskInstances)
      .where(
        and(
          inArray(taskInstances.status, ['pending', 'in_progress']),
          sql`${taskInstances.contextData}->>'scheduleId' = ${scheduleId}`
        )
      );

      // Complete or route to audit depending on priority (Task Engine Standard)
      for (const t of activeInstances) {
        let nextStatus: "completed" | "audit_pending" = "completed";
        if (t.priority === "medium" || t.priority === "high" || t.priority === "very_high") {
          nextStatus = "audit_pending";
        }
        
        await tx.update(taskInstances).set({
          status: nextStatus,
          completedAt: new Date(),
          updatedAt: new Date()
        }).where(eq(taskInstances.id, t.id));
      }
    }

    return po || { success: true, message: "Assessment completed without PO" };
  });

  return result;
}

export async function removeVendorItem(actor: Actor, scope: z.infer<typeof scopeSchema>, vendorItemId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(vendorItemId).success) {
    throw new InventoryServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, inventoryPermissions.update);

  // Soft delete by setting isActive to false
  await db.update(vendorItems)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(vendorItems.id, vendorItemId),
      eq(vendorItems.organizationId, scope.organizationId),
      eq(vendorItems.locationId, scope.locationId)
    ));
}
