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
  salesOrderLines
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

  async pushToSalesTransactions(userId: string): Promise<number> {
    // Find all unsynced TMBill orders for this organization (and location if set)
    let query = db.select().from(tmbillOrders)
      .where(
        and(
          eq(tmbillOrders.organizationId, this.organizationId),
          eq(tmbillOrders.isSyncedToFinance, false)
        )
      );

    const unsyncedOrders = await query;

    if (unsyncedOrders.length === 0) return 0;

    // Filter by location if specified
    const ordersToProcess = this.locationId 
      ? unsyncedOrders.filter(o => o.locationId === this.locationId)
      : unsyncedOrders;

    if (ordersToProcess.length === 0) return 0;

    return await db.transaction(async (tx) => {
      // 1. Create a Batch
      const batchId = randomUUID();
      const firstDate = ordersToProcess[0].orderDateTime || new Date();
      const operatingDate = firstDate.toISOString().split('T')[0];
      // Ensure locationId is available, fallback to first order's location if not provided to service
      const batchLocationId = this.locationId || ordersToProcess[0].locationId || this.organizationId; 
      
      await tx.insert(salesImportBatches).values({
        id: batchId,
        organizationId: this.organizationId,
        locationId: batchLocationId,
        sourceSystem: "TMBILL_API",
        operatingDate: operatingDate,
        status: "VALIDATED",
        recordedBy: userId,
      });

      let insertedCount = 0;

      // Ensure a Sales Channel exists to attach the orders to
      let defaultChannelId = "";
      const channels = await tx.select().from(salesChannels).where(eq(salesChannels.organizationId, this.organizationId)).limit(1);
      if (channels.length > 0) {
        defaultChannelId = channels[0].id;
      } else {
        defaultChannelId = randomUUID();
        await tx.insert(salesChannels).values({
          id: defaultChannelId,
          organizationId: this.organizationId,
          locationId: batchLocationId,
          name: "TMBill POS (Default)",
          type: "IN_STORE",
          fulfillmentType: "IMMEDIATE"
        });
      }

      for (const order of ordersToProcess) {
        const transactionId = randomUUID();
        
        await tx.insert(salesTransactions).values({
          id: transactionId,
          organizationId: this.organizationId,
          locationId: order.locationId || batchLocationId,
          batchId: batchId,
          sourceSystem: "TMBILL_API",
          sourceBillId: order.tmbillOrderId,
          billTimestamp: order.orderDateTime || new Date(),
          customerName: order.customerName,
          customerContact: order.customerPhone,
          captainName: null, 
          orderType: order.tableName ? `Table: ${order.tableName}` : "POS",
          grossAmount: String(order.orderSubtotal || 0),
          discountAmount: "0", 
          taxAmount: String((Number(order.orderTotal) - Number(order.orderSubtotal)) || 0),
          otherCharges: "0",
          netAmount: String(order.orderTotal || 0),
          paymentMethod: order.paymentMode || "CASH",
        });

        // -- NEW ARCHITECTURE (Zero-Hardcode Sales Orders) --
        const newOrderId = randomUUID();
        await tx.insert(salesOrders).values({
          id: newOrderId,
          organizationId: this.organizationId,
          locationId: order.locationId || batchLocationId,
          channelId: defaultChannelId,
          orderNumber: order.tmbillOrderDisplayId || order.tmbillOrderId,
          status: "DELIVERED",
          customerName: order.customerName,
          customerContact: order.customerPhone,
          grossAmount: String(order.orderSubtotal || 0),
          discountAmount: "0",
          taxAmount: String((Number(order.orderTotal) - Number(order.orderSubtotal)) || 0),
          netAmount: String(order.orderTotal || 0),
          orderTimestamp: order.orderDateTime || new Date(),
        });

        // Get items for this order
        const items = await tx.select().from(tmbillOrderItems).where(eq(tmbillOrderItems.orderId, order.id));
        
        if (items.length > 0) {
          await tx.insert(salesTransactionLines).values(
            items.map((i) => ({
              id: randomUUID(),
              organizationId: this.organizationId,
              locationId: order.locationId || batchLocationId,
              transactionId: transactionId,
              itemName: i.title,
              category: i.productGroupName,
              quantity: String(i.quantity),
              unitPrice: String(i.price),
              lineTotal: String(i.totalWithTax),
            }))
          );

          await tx.insert(salesOrderLines).values(
            items.map((i) => ({
              id: randomUUID(),
              orderId: newOrderId,
              itemId: i.tmbillItemId || "UNKNOWN",
              itemName: i.title,
              quantity: String(i.quantity),
              unitPrice: String(i.price),
              grossAmount: String(Number(i.quantity) * Number(i.price)),
              discountAmount: "0",
              taxAmount: String(i.totalTax || 0),
              netAmount: String(i.totalWithTax),
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

