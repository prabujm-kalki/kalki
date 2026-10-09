const fs = require('fs');

const content = `
export async function createSalesReturn(data: any) {
  const { organizationId, locationId, invoiceId, returnDate, reason, status, items: returnItems, totalAmount } = data;

  if (!organizationId || !locationId || !invoiceId) {
    throw new Error("Missing required fields for Sales Return");
  }

  const returnNumber = \`RET-\${Date.now()}\`;

  const [newReturn] = await db.insert(salesReturns).values({
    organizationId,
    locationId,
    returnNumber,
    invoiceId,
    returnDate: new Date(returnDate || Date.now()),
    reason,
    status,
    totalAmount: totalAmount.toString(),
    createdUserId: "system"
  }).returning();

  const linesToInsert = returnItems.filter((item: any) => item.returnQty > 0).map((item: any) => ({
    returnId: newReturn.id,
    itemId: item.itemId,
    description: item.description,
    returnQty: item.returnQty.toString(),
    unitPrice: item.rate.toString(),
    addToInventory: item.addToInventory
  }));

  if (linesToInsert.length > 0) {
    await db.insert(salesReturnLines).values(linesToInsert);
    
    // TODO: Connect to Inventory Module here once it is built.
    // Example: if (item.addToInventory) { inventoryService.addStock(item.itemId, item.returnQty) }
  }

  return { success: true, returnId: newReturn.id };
}
`;

fs.appendFileSync('src/app/sales/actions.ts', content);
