import fs from 'fs';

const schemaPath = 'src/db/schema.ts';
let code = fs.readFileSync(schemaPath, 'utf8');

// 1. Add fields to items table
const itemsTarget = '    isTrackable: boolean("is_trackable").notNull().default(true),';
const itemsAddition = `    isTrackable: boolean("is_trackable").notNull().default(true),
    allowSpotPurchase: boolean("allow_spot_purchase").notNull().default(false),
    spotPurchasePriceLimit: numeric("spot_purchase_price_limit"),
    isInventoryTracked: boolean("is_inventory_tracked").notNull().default(true),`;

if (code.includes(itemsTarget)) {
  code = code.replace(itemsTarget, itemsAddition);
  console.log("Successfully patched items table with spot purchase fields.");
} else {
  console.error("Could not find itemsTarget in schema.ts");
}

// 2. Append branch_purchase_policies and spot_purchases tables at the bottom
const newTables = `
// ==========================================
// 11. QUICK PURCHASE / MICRO-PROCUREMENT (KALKI-SPEC-PURCHASE-004)
// ==========================================

export const branchPurchasePolicies = pgTable(
  "branch_purchase_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    maxSpotPurchaseTransactionLimit: decimal("max_spot_purchase_transaction_limit", { precision: 12, scale: 2 })
      .notNull()
      .default("2000.00"),
    maxDailySpotPurchaseTotal: decimal("max_daily_spot_purchase_total", { precision: 12, scale: 2 })
      .notNull()
      .default("5000.00"),
    maxItemDailyFrequency: integer("max_item_daily_frequency").notNull().default(3),
    requirePhotoEvidence: boolean("require_photo_evidence").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("branch_purchase_policies_org_loc_idx").on(table.organizationId, table.locationId),
    unique("branch_purchase_policies_unique").on(table.organizationId, table.locationId),
  ]
);

export const spotPurchaseAuditStatuses = ["PENDING_AUDIT", "AUDITED_CLEARED", "FLAGGED_DISCREPANCY"] as const;

export const spotPurchases = pgTable(
  "spot_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    voucherNumber: varchar("voucher_number", { length: 50 }).notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id),
    vendorName: varchar("vendor_name", { length: 255 }).notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
    uom: varchar("uom", { length: 50 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    paymentSource: varchar("payment_source", { length: 50 }).notNull().default("PETTY_CASH"), // PETTY_CASH, UPI, CASHIER_DRAWER
    receiptPhotoUrl: text("receipt_photo_url"),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => authUsers.id),
    auditStatus: text("audit_status", { enum: spotPurchaseAuditStatuses })
      .notNull()
      .default("PENDING_AUDIT"),
    auditedByUserId: text("audited_by_user_id").references(() => authUsers.id),
    auditNotes: text("audit_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("spot_purchases_org_loc_idx").on(table.organizationId, table.locationId),
    index("spot_purchases_audit_status_idx").on(table.auditStatus),
    unique("spot_purchases_voucher_unique").on(table.organizationId, table.voucherNumber),
  ]
);
`;

code = code + "\n" + newTables;
fs.writeFileSync(schemaPath, code, 'utf8');
console.log("Successfully added branchPurchasePolicies and spotPurchases tables to schema.ts");
