import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, vendorItems, items, taskInstances } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, inArray, and } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId, locationId, organizationId, stockInputs, taskId } = await req.json();

    if (!vendorId || !locationId || !stockInputs || !Array.isArray(stockInputs)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Get item configurations for this vendor
    const itemIds = stockInputs.map(i => i.itemId);
    const configuredItems = await db
      .select({
        vendorItem: vendorItems,
        item: items
      })
      .from(vendorItems)
      .innerJoin(items, eq(vendorItems.itemId, items.id))
      .where(
        and(
          eq(vendorItems.vendorId, vendorId),
          inArray(vendorItems.itemId, itemIds),
          eq(vendorItems.isActive, true)
        )
      );

    const itemsToOrder = [];
    let totalAmount = 0;

    for (const input of stockInputs) {
      const row = configuredItems.find(ci => ci.vendorItem.itemId === input.itemId);
      if (!row) continue;
      
      const config = row.vendorItem;
      const masterItem = row.item;

      const currentStock = Number(input.currentStock);
      // Fallbacks: Use vendor setting, or fallback to master item target/base min stock
      const minStock = Number(config.minimumStock || masterItem.baseMinStock || 0);
      const normalStock = Number(config.normalQuantity || masterItem.targetStock || 0);
      
      // Critical fix: If vendor last rate is missing, fallback to master item's currentPrice
      const lastRate = Number(config.lastRate || masterItem.currentPrice || 0);

      if (currentStock <= minStock) {
        let orderQuantity = 0;
        if (masterItem.replenishmentStrategy === 'fixed') {
          // Fixed Bulk: just order the strict fixed amount
          orderQuantity = Number(masterItem.reorderQuantity || 1);
        } else {
          // Top-Up: order exact amount needed to reach target stock
          orderQuantity = Math.max(0, normalStock - currentStock);
        }

        if (orderQuantity > 0) {
          itemsToOrder.push({
            itemId: input.itemId,
            orderedQuantity: orderQuantity.toString(),
            unitRate: lastRate.toString(),
          });
          totalAmount += orderQuantity * lastRate;
        }
      }
    }

    if (itemsToOrder.length === 0) {
      return NextResponse.json({ message: "No items reached reorder level", created: false });
    }

    // Create Draft PO
    const publicToken = crypto.randomBytes(16).toString('hex');
    const [newPo] = await db.insert(purchaseOrders).values({
      organizationId: organizationId,
      locationId: locationId,
      vendorId: vendorId,
      status: "draft", // Or pending_approval depending on the strict flow
      totalAmount: totalAmount.toString(),
      publicToken: publicToken,
    }).returning();

    // Insert Lines
    await db.insert(purchaseOrderLines).values(
      itemsToOrder.map(item => ({
        poId: newPo.id,
        itemId: item.itemId,
        orderedQuantity: item.orderedQuantity,
        unitRate: item.unitRate,
      }))
    );

    // TODO: Generate Task for Reviewer/Manager

    // If this was triggered from a Task, mark it as complete
    if (taskId) {
      await db.update(taskInstances)
        .set({
          status: 'completed',
          completedAt: new Date(),
          completionData: { submittedBy: session.user.id }
        })
        .where(eq(taskInstances.id, taskId));
    }

    return NextResponse.json({ message: "PO Draft created", created: true, poId: newPo.id });

  } catch (error: any) {
    console.error("Error in stock assessment:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
