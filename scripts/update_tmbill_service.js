const fs = require('fs');

let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

// 1. Make sure we import the right tables
if (!code.includes('salesInvoices')) {
  code = code.replace(
    /salesOrderLines\n\} from "@\/db\/schema";/,
    'salesOrderLines,\n  salesInvoices,\n  salesInvoiceLines,\n  customers\n} from "@/db/schema";'
  );
}

// 2. Rewrite pushToSalesTransactions
const oldFunctionStart = `  async pushToSalesTransactions(userId: string): Promise<number> {`;
const newFunction = `  async pushToSalesInvoices(userId: string): Promise<number> {
    let query = db.select().from(tmbillOrders)
      .where(
        and(
          eq(tmbillOrders.organizationId, this.organizationId),
          eq(tmbillOrders.isSyncedToFinance, false)
        )
      );

    const unsyncedOrders = await query;
    if (unsyncedOrders.length === 0) return 0;

    const ordersToProcess = this.locationId 
      ? unsyncedOrders.filter(o => o.locationId === this.locationId)
      : unsyncedOrders;

    if (ordersToProcess.length === 0) return 0;

    return await db.transaction(async (tx) => {
      let insertedCount = 0;
      const batchLocationId = this.locationId || ordersToProcess[0].locationId || this.organizationId; 

      for (const order of ordersToProcess) {
        // Step 1: Find or Create Customer
        let customerId = "";
        const customerName = order.customerName || "Walk-in Customer";
        const customerPhone = order.customerPhone || "0000000000";
        
        const existingCustomers = await tx.select().from(customers).where(and(eq(customers.organizationId, this.organizationId), eq(customers.mobileNumber, customerPhone))).limit(1);
        if (existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
        } else {
          customerId = randomUUID();
          await tx.insert(customers).values({
            id: customerId,
            organizationId: this.organizationId,
            locationId: batchLocationId,
            name: customerName,
            mobileNumber: customerPhone,
            customerType: "B2C",
            isActive: true
          });
        }

        // Step 2: Insert into salesInvoices
        const invoiceId = randomUUID();
        
        await tx.insert(salesInvoices).values({
          id: invoiceId,
          organizationId: this.organizationId,
          locationId: batchLocationId,
          invoiceNumber: String(order.tmbillOrderDisplayId || order.tmbillOrderId),
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
          paymentStatus: "PAID",
          paymentMode: order.paymentMode || "CASH",
          tmbillRawData: order.rawData
        });

        // Step 3: Insert line items
        const items = await tx.select().from(tmbillOrderItems).where(eq(tmbillOrderItems.orderId, order.id));
        if (items.length > 0) {
          await tx.insert(salesInvoiceLines).values(
            items.map((i) => ({
              id: randomUUID(),
              invoiceId: invoiceId,
              itemId: null,
              itemDescription: i.title,
              quantity: String(i.quantity),
              unitRate: String(i.price),
              discountPercent: "0",
              taxableValue: String(Number(i.quantity) * Number(i.price)),
              taxRate: "0",
              taxAmount: String(i.totalTax || 0),
              totalAmount: String(i.totalWithTax),
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
  }`;

code = code.substring(0, code.indexOf(oldFunctionStart)) + newFunction + "\n}\n";

fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);

// Also need to update src/app/api/integrations/tmbill/sync/route.ts to call pushToSalesInvoices
let routeCode = fs.readFileSync('src/app/api/integrations/tmbill/sync/route.ts', 'utf8');
routeCode = routeCode.replace('tmbillService.pushToSalesTransactions', 'tmbillService.pushToSalesInvoices');
fs.writeFileSync('src/app/api/integrations/tmbill/sync/route.ts', routeCode);

console.log('Successfully updated TMBillService to map to salesInvoices.');
