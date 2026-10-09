const fs = require('fs');

let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

const oldFunctionStart = `  async pushToSalesInvoices(userId: string): Promise<number> {`;
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
          tmbillRawData: order.rawData,
          createdUserId: userId
        });

        // Step 3: Insert line items
        const items = await tx.select().from(tmbillOrderItems).where(eq(tmbillOrderItems.orderId, order.id));
        if (items.length > 0) {
          // Find a default item to satisfy FK
          const firstItem = await tx.select({id: sql\`id\`}).from(sql\`items\`).limit(1);
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
  }`;

code = code.substring(0, code.indexOf(oldFunctionStart)) + newFunction + "\n}\n";

fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);
console.log('Fixed pushToSalesInvoices schema fields');
