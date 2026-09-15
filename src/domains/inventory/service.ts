import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vendors, vendorItems, inventoryLedger, inventoryEventTypes, purchaseSchedules } from "@/db/schema";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions, type EmployeePermission } from "@/lib/authorization-policy";

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
      | "INSUFFICIENT_STOCK",
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

const createVendorSchema = scopeSchema.extend({
  name: z.string().trim().min(1).max(200),
  contactDetails: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).default({}),
  paymentTerms: z.string().nullable().optional(),
  creditDays: z.number().int().min(0).nullable().optional(),
}).strict();

export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export async function createVendor(actor: Actor, input: CreateVendorInput) {
  requireActor(actor);
  const parsed = createVendorSchema.safeParse(input);
  if (!parsed.success) throw new InventoryServiceError("Invalid vendor input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);

  const [vendor] = await db.insert(vendors).values({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    name: parsed.data.name,
    contactDetails: parsed.data.contactDetails,
    paymentTerms: parsed.data.paymentTerms ?? null,
    creditDays: parsed.data.creditDays ?? null,
  }).returning();

  return vendor;
}

const updateVendorSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  contactDetails: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  paymentTerms: z.string().nullable().optional(),
  creditDays: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();

export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export async function updateVendor(actor: Actor, input: UpdateVendorInput) {
  requireActor(actor);
  const parsed = updateVendorSchema.safeParse(input);
  if (!parsed.success) throw new InventoryServiceError("Invalid vendor input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, employeePermissions.update);

  const [vendor] = await db.update(vendors).set({
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.contactDetails !== undefined ? { contactDetails: parsed.data.contactDetails } : {}),
    ...(parsed.data.paymentTerms !== undefined ? { paymentTerms: parsed.data.paymentTerms } : {}),
    ...(parsed.data.creditDays !== undefined ? { creditDays: parsed.data.creditDays } : {}),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
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
  await requireScopeAccess(actor, scope, employeePermissions.read);

  return db.select().from(vendors).where(and(
    eq(vendors.organizationId, scope.organizationId),
    eq(vendors.locationId, scope.locationId),
    eq(vendors.isActive, true)
  ));
}

const addVendorItemSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
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
  
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);

  const [item] = await db.insert(vendorItems).values({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    vendorId: parsed.data.vendorId,
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
  await requireScopeAccess(actor, scope, employeePermissions.read);

  return db.select().from(vendorItems).where(and(
    eq(vendorItems.organizationId, scope.organizationId),
    eq(vendorItems.locationId, scope.locationId),
    eq(vendorItems.vendorId, vendorId),
    eq(vendorItems.isActive, true)
  ));
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
  
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);

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
  await requireScopeAccess(actor, scope, employeePermissions.read);

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
  
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);

  const [schedule] = await db.insert(purchaseSchedules).values({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    vendorId: parsed.data.vendorId,
    responsibleRoleId: parsed.data.responsibleRoleId,
    frequencyRule: parsed.data.frequencyRule,
    reminderTime: parsed.data.reminderTime,
  }).returning();

  return schedule;
}

export async function listPurchaseSchedules(actor: Actor, scope: z.infer<typeof scopeSchema>, vendorId?: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success) {
    throw new InventoryServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, employeePermissions.read);

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
  await requireScopeAccess(actor, scope, employeePermissions.read);

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


