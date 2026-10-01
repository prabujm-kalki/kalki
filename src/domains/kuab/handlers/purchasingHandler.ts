import { db } from "@/db";
import { vendorItems, purchaseOrders, purchaseOrderLines } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";

export interface PurchaseStockEnteredPayload {
  organizationId: string;
  locationId: string;
  vendorId: string;
  stockData: { itemId: string; currentStock: number }[];
}

export async function handlePurchaseStockEntered(payload: PurchaseStockEnteredPayload) {
  const { organizationId, locationId, vendorId, stockData } = payload;

  if (!stockData || stockData.length === 0) return { success: true, message: "No stock data provided." };

  const itemIds = stockData.map((s) => s.itemId);
  
  // Fetch configured vendor items to check min stock & reorder qty
  const configuredItems = await db
    .select()
    .from(vendorItems)
    .where(
      and(
        eq(vendorItems.vendorId, vendorId),
        inArray(vendorItems.itemId, itemIds)
      )
    );

  const linesToOrder: any[] = [];
  let totalAmount = 0;

  for (const stockEntry of stockData) {
    const config = configuredItems.find((c) => c.itemId === stockEntry.itemId);
    
    // Only process items that have configuration
    if (!config || config.minimumStock === null || config.normalQuantity === null) continue;

    const currentStock = Number(stockEntry.currentStock);
    const minStock = Number(config.minimumStock);
    
    // Check if reorder is needed
    if (currentStock < minStock) {
      const orderQty = Number(config.normalQuantity);
      const unitRate = Number(config.lastRate || 0); // fallback to 0 if no last rate

      linesToOrder.push({
        itemId: config.itemId,
        orderedQuantity: orderQty.toString(),
        unitRate: unitRate.toString(),
      });
      totalAmount += orderQty * unitRate;
    }
  }

  // If no items needed reordering, do nothing
  if (linesToOrder.length === 0) {
    return { success: true, message: "Stock is sufficient. No PO created." };
  }

  // Create Purchase Order in Draft status (awaiting Manager Review)
  const [po] = await db.insert(purchaseOrders).values({
    organizationId,
    locationId,
    vendorId,
    status: "draft",
    paymentMethod: "credit",
    totalAmount: totalAmount.toString(),
  }).returning();

  // Create Purchase Order Lines
  for (const line of linesToOrder) {
    await db.insert(purchaseOrderLines).values({
      poId: po.id,
      itemId: line.itemId!,
      orderedQuantity: line.orderedQuantity,
      unitRate: line.unitRate,
    });
  }

  return { success: true, poId: po.id, message: `PO created with ${linesToOrder.length} items.` };
}
