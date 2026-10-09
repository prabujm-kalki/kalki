import { db } from "@/db";
import { 
  tmbillSyncLogs,
  tmbillOrders, 
  tmbillOrderItems,
  tmbillConfigs,
  salesImportBatches,
  salesTransactions,
  salesTransactionLines,
  salesChannels,
  salesOrders,
  salesOrderLines,
  salesInvoices,
  salesInvoiceLines,
  customers,
  salesReceipts
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const TMBILL_BASE_URL = "https://api.tmbill.com/tp/v1";

export class TMBillService {
  private organizationId: string;
  private locationId: string | null;
  
  constructor(organizationId: string, locationId: string | null = null) {
    this.organizationId = organizationId;
    this.locationId = locationId;
  }

  private async getConfig() {
    const [config] = await db.select().from(tmbillConfigs).where(eq(tmbillConfigs.organizationId, this.organizationId)).limit(1);
    
    return {
      apiUrl: config?.apiUrl || TMBILL_BASE_URL,
      username: config?.username || process.env.TMBILL_USERNAME,
      password: config?.password || process.env.TMBILL_PASSWORD,
      storeId: config?.storeId || process.env.TMBILL_STORE_ID,
      tmposId: config?.tmposId || process.env.TMBILL_TMPOS_ID,
      businessDayStartTime: config?.businessDayStartTime || "06:00",
    };
  }

  async authenticate(config: any): Promise<string | null> {
    if (!config.username || !config.password) {
      throw new Error("Missing TMBill credentials in configuration.");
    }

    try {
      const res = await fetch(`${config.apiUrl}/store/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: config.username, 
          password: config.password 
        })
      });

      const data = await res.json();
      if (data.access_token) {
        return data.access_token;
      }
      throw new Error(data.message || "Failed to authenticate with TMBill.");
    } catch (error: any) {
      console.error("TMBill Auth Error:", error);
      throw error;
    }
  }

  async syncOrders(fromDate: string, toDate: string): Promise<any> {
    const syncLogId = randomUUID();
    
    // Create initial sync log
    await db.insert(tmbillSyncLogs).values({
      id: syncLogId,
      organizationId: this.organizationId,
      locationId: this.locationId,
      syncType: "ORDERS",
      status: "STARTED",
      startedAt: new Date(),
    });

    try {
      const config = await this.getConfig();
      const token = await this.authenticate(config);
      
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      let totalProcessed = 0;
      let totalFailed = 0;

      while (hasMore) {
        const payload = {
          store_id: config.storeId,
          from: fromDate, // format: "YYYY-MM-DD 00:00:00"
          to: toDate, // format: "YYYY-MM-DD 23:59:59"
          offset: offset,
          limit: limit,
          order_id: ""
        };

        const res = await fetch(`${config.apiUrl}/order/list`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "tmbill-key": token as string
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
          hasMore = false;
          break;
        }

        const orders = data.data;

        for (const order of orders) {
          try {
            await this.processOrder(order);
            totalProcessed++;
          } catch (e: any) {
            console.error(`Error processing TMBill order ${order.order_id}:`, e);
            totalFailed++;
          }
        }

        offset += 1;
      }

      await db.update(tmbillSyncLogs)
        .set({ 
          status: totalFailed > 0 ? "PARTIAL" : "SUCCESS",
          completedAt: new Date(),
          recordsProcessed: totalProcessed,
          recordsFailed: totalFailed
        })
        .where(eq(tmbillSyncLogs.id, syncLogId));

      return { totalProcessed, totalFailed };

    } catch (error: any) {
      console.error("Sync Orders Error:", error);
      await db.update(tmbillSyncLogs)
        .set({ 
          status: "FAILED",
          completedAt: new Date(),
          errorDetails: error.message || String(error)
        })
        .where(eq(tmbillSyncLogs.id, syncLogId));
      throw error;
    }
  }

  private async processOrder(order: any) {
    // Check if order exists
    const existingOrder = await db.select().from(tmbillOrders)
      .where(and(
        eq(tmbillOrders.tmbillOrderId, order.order_id),
        eq(tmbillOrders.organizationId, this.organizationId)
      ))
      .limit(1);

    if (existingOrder.length > 0) {
      // Order exists, maybe update it?
      // In POS context, orders are usually immutable once fulfilled, but we update just in case.
      await db.update(tmbillOrders)
        .set({
          orderState: order.order_state,
          orderSubtotal: String(order.order_subtotal || 0),
          orderTotal: String(order.order_total || 0),
          paymentMode: order.order_payments?.[0]?.payment_option || null,
          rawData: order,
          updatedAt: new Date()
        })
        .where(eq(tmbillOrders.id, existingOrder[0].id));
      return;
    }

    // Insert new order
    const newOrderId = randomUUID();
    const orderDate = order.orderDateTime ? new Date(order.orderDateTime) : null;

    await db.insert(tmbillOrders).values({
      id: newOrderId,
      organizationId: this.organizationId,
      locationId: this.locationId,
      tmbillOrderId: order.order_id,
      tmbillOrderDisplayId: String(order.bill_number),
      tableName: order.table_name,
      customerName: order.cust_name,
      customerPhone: order.phone,
      orderState: order.order_state,
      orderSubtotal: String(order.order_subtotal || 0),
      orderTotal: String(order.order_total || 0),
      orderDateTime: orderDate,
      paymentMode: order.order_payments?.[0]?.payment_option || null,
      rawData: order
    });

    // Insert items
    if (order.order_items && Array.isArray(order.order_items)) {
      for (const item of order.order_items) {
        await db.insert(tmbillOrderItems).values({
          organizationId: this.organizationId,
          orderId: newOrderId,
          tmbillItemId: String(item.item_id),
          title: item.title,
          quantity: String(item.quantity || 0),
          price: String(item.price || 0),
          totalWithTax: String(item.total_with_tax || 0),
          totalTax: String(item.total_tax || 0),
          productGroupName: item.product_group_name,
          rawData: item
        });
      }
    }
  }

  async pushToSalesInvoices(userId: string): Promise<number> {
    let query = db.select().from(tmbillOrders)
      .where(
        and(
          eq(tmbillOrders.organizationId, this.organizationId),
          eq(tmbillOrders.isSyncedToFinance, false)
        )
      );

    const unsyncedOrders = await query;
    if (unsyncedOrders.length === 0) return 0;

    const ordersToProcess = unsyncedOrders;

    return await db.transaction(async (tx) => {
      let insertedCount = 0; 

      for (const order of ordersToProcess) {
        // Step 1: Find or Create Customer
        let customerId = "";
        const customerName = order.customerName || "Walk-in Customer";
        const customerPhone = order.customerPhone || "0000000000";
        
        const existingCustomers = await tx.select().from(customers).where(and(eq(customers.organizationId, this.organizationId), eq(customers.phone, customerPhone))).limit(1);
        if (existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
        } else {
          customerId = randomUUID();
          await tx.insert(customers).values({
            id: customerId,
            organizationId: this.organizationId,
            name: customerName,
            phone: customerPhone
          });
        }

        // Step 2: Insert into salesInvoices
        const invoiceId = randomUUID();
        const paymentStatus = (!order.paymentMode || order.paymentMode.toLowerCase() === "credit" || order.paymentMode.toLowerCase() === "unpaid") ? "PENDING" : "PAID";
        
        try {
          await tx.insert(salesInvoices).values({
          id: invoiceId,
          organizationId: this.organizationId,
          locationId: order.locationId || this.organizationId,
          invoiceNumber: "TM-" + String(order.tmbillOrderId),
          invoiceDate: order.orderDateTime || new Date(),
          issueDate: order.orderDateTime || new Date(),
          customerId: customerId,
          customerName: customerName,
          subtotalAmount: String(order.orderSubtotal || 0),
          discountAmount: "0.00",
          taxableAmount: String(order.orderSubtotal || 0),
          cgstAmount: "0.00",
          sgstAmount: "0.00",
          igstAmount: "0.00",
          taxAmount: String((Number(order.orderTotal) - Number(order.orderSubtotal)) || 0),
          roundOffAmount: "0.00",
          grandTotal: String(order.orderTotal || 0),
          totalAmount: String(order.orderTotal || 0),
          paymentStatus: paymentStatus,
          paymentMode: order.paymentMode || "CREDIT",
          tmbillRawData: order.rawData,
          createdUserId: userId
        });

        // Generate receipt if PAID
        if (paymentStatus === "PAID") {
          await tx.insert(salesReceipts).values({
            organizationId: this.organizationId,
            locationId: order.locationId || this.organizationId,
            customerId: customerId,
            receiptNumber: "REC-TM-" + String(order.tmbillOrderId),
            receiptDate: order.orderDateTime || new Date(),
            amount: String(order.orderTotal || 0),
            paymentMethod: order.paymentMode || "SYSTEM_SYNC"
          });
        }
        
        } catch (e: any) {
          console.error("POSTGRES INSERT ERROR DETAILS:", e, e.detail, e.code);
          throw new Error("PG_ERROR: " + (e.detail || e.message));
        }

        // Step 3: Insert line items
        const items = await tx.select().from(tmbillOrderItems).where(eq(tmbillOrderItems.orderId, order.id));
        if (items.length > 0) {
          // Find a default item to satisfy FK
          const firstItem = await tx.select({id: sql`id`}).from(sql`items`).limit(1);
          let defaultItemId = firstItem.length > 0 ? String(firstItem[0].id) : "00000000-0000-0000-0000-000000000000";

          await tx.insert(salesInvoiceLines).values(
            items.map((i) => ({
              id: randomUUID(),
              invoiceId: invoiceId,
              itemId: defaultItemId,
              description: i.title || "TMBill Item",
              itemDescription: i.title || "TMBill Item",
              uom: "NOS",
              quantity: String(i.quantity || 1),
              unitPrice: String(i.price || 0),
              unitRate: String(i.price || 0),
              discountPercent: "0",
              discountAmount: "0",
              taxableAmount: String(Number(i.quantity || 1) * Number(i.price || 0)),
              gstRate: "0",
              totalAmount: String(i.totalWithTax || 0),
              lineTotal: String(i.totalWithTax || 0)
            }))
          );
        }

        // Mark as synced
        await tx.update(tmbillOrders)
          .set({ isSyncedToFinance: true })
          .where(eq(tmbillOrders.id, order.id));

        insertedCount++;
      }

      return insertedCount;
    });
  }
}
