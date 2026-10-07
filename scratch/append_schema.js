const fs = require('fs');

const appendText = `\n
export const tmbillSyncLogs = pgTable("tmbill_sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  locationId: uuid("location_id"),
  syncType: text("sync_type").notNull(), 
  status: text("status").notNull(),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorDetails: text("error_details"),
  metadata: jsonb("metadata").default({}),
});

export const tmbillOrders = pgTable("tmbill_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  locationId: uuid("location_id"),
  tmbillOrderId: text("tmbill_order_id").notNull(),
  tmbillOrderDisplayId: text("tmbill_order_display_id"),
  tableName: text("table_name"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  orderState: text("order_state"),
  orderSubtotal: numeric("order_subtotal", { precision: 12, scale: 2 }),
  orderTotal: numeric("order_total", { precision: 12, scale: 2 }),
  orderDateTime: timestamp("order_date_time", { withTimezone: true }),
  paymentMode: text("payment_mode"),
  isSyncedToFinance: boolean("is_synced_to_finance").notNull().default(false),
  financeJournalEntryId: uuid("finance_journal_entry_id"), 
  financeSalesInvoiceId: uuid("finance_sales_invoice_id"),
  rawData: jsonb("raw_data").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tmbillOrderItems = pgTable("tmbill_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  orderId: uuid("order_id").notNull().references(() => tmbillOrders.id, { onDelete: "cascade" }),
  tmbillItemId: text("tmbill_item_id").notNull(),
  title: text("title").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  totalWithTax: numeric("total_with_tax", { precision: 12, scale: 2 }).notNull(),
  totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull(),
  productGroupName: text("product_group_name"),
  rawData: jsonb("raw_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
`;

fs.appendFileSync('src/db/schema.ts', appendText);
console.log('Appended to schema');
