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

      // Determine demand surge multiplier for Friday (5) or Saturday (6)
      const dayOfWeek = new Date().getDay();
      let surgePct = 0;
      if (dayOfWeek === 5) {
        surgePct = Number(masterItem.fridaySurge || 0);
      } else if (dayOfWeek === 6) {
        surgePct = Number(masterItem.saturdaySurge || 0);
      }
      const surgeMultiplier = surgePct > 0 ? 1 + (surgePct / 100) : 1;

      const currentStock = Number(input.currentStock);
      // Fallbacks: Use vendor setting, or fallback to master item target/base min stock, boosted by surge multiplier if applicable
      const baseMin = Number(config.minimumStock || masterItem.baseMinStock || 0);
      const minStock = Number((baseMin * surgeMultiplier).toFixed(3));
      const baseNormal = Number(config.normalQuantity || masterItem.targetStock || 0);
      const normalStock = Number((baseNormal * surgeMultiplier).toFixed(3));
      
      // Critical fix: If vendor last rate is missing, fallback to master item's currentPrice
      const lastRate = Number(config.lastRate || masterItem.currentPrice || 0);

      let orderQuantity = 0;
      if (currentStock <= minStock) {
        if (masterItem.replenishmentStrategy === 'fixed') {
          // Fixed Bulk: order the fixed reorder quantity boosted by surge multiplier
          const baseReorder = Number(masterItem.reorderQuantity || 1);
          orderQuantity = Number((baseReorder * surgeMultiplier).toFixed(3));
        } else {
          // Top-Up: order exact amount needed to reach surged target stock
          orderQuantity = Math.max(0, Number((normalStock - currentStock).toFixed(3)));
        }

        if (masterItem.roundToWhole && orderQuantity > 0) {
          orderQuantity = Math.ceil(orderQuantity);
        }
      }

      // Always include all assessed vendor items in the PO for review, even if orderQuantity is 0
      itemsToOrder.push({
        itemId: input.itemId,
        orderedQuantity: orderQuantity.toString(),
        unitRate: lastRate.toString(),
      });
      totalAmount += orderQuantity * lastRate;
    }

    if (itemsToOrder.length === 0) {
      if (taskId) {
        await db.update(taskInstances)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
            completionData: {
              submittedBy: session.user.id,
              reason: "Stock assessment completed. All items above reorder level.",
              poCreated: false
            }
          })
          .where(eq(taskInstances.id, taskId));
      }

      return NextResponse.json({
        message: "Stock assessment completed. All items are currently above reorder levels, so no purchase order was required.",
        created: false
      });
    }

    // 1. Get vendor details for the PO number and communication
    const { vendors, locationRoleAssignments, organizationRoleAssignments, businessRoles } = await import('@/db/schema');
    const { sql } = await import('drizzle-orm');
    const [vendorRec] = await db.select().from(vendors).where(eq(vendors.id, vendorId));
    const shortCode = vendorRec?.shortCode || "PO";

    // 2. Format date for PO number
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateString = `${dd}_${mm}_${yyyy}`;

    // 3. Get sequence number
    const likePattern = `${shortCode}-${dateString}-%`;
    const countRes = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int as count 
      FROM purchase_orders 
      WHERE vendor_id = ${vendorId} AND po_number LIKE ${likePattern}
    `);
    const countVal = (countRes as any).rows ? (countRes as any).rows[0].count : (countRes as any)[0].count;
    const seq = String((countVal || 0) + 1).padStart(2, '0');
    const poNumber = `${shortCode}-${dateString}-${seq}`;

    // 4. Determine roles for workflow (check schedule definition or user reporting hierarchy)
    let processOwnerRoleId = null;
    let reviewRoleId = null;
    let billReviewRoleId = null;

    if (taskId) {
      const [taskRec] = await db
        .select({
          contextData: taskInstances.contextData,
          assignedRoleId: taskInstances.assignedRoleId,
        })
        .from(taskInstances)
        .where(eq(taskInstances.id, taskId))
        .limit(1);

      const schedId = (taskRec?.contextData as any)?.scheduleId;
      if (schedId) {
        const { purchaseSchedules } = await import('@/db/schema');
        const [schedRec] = await db
          .select({
            responsibleRoleId: purchaseSchedules.responsibleRoleId,
            reviewRoleId: purchaseSchedules.reviewRoleId,
            billReviewRoleId: purchaseSchedules.billReviewRoleId,
          })
          .from(purchaseSchedules)
          .where(eq(purchaseSchedules.id, schedId))
          .limit(1);

        if (schedRec) {
          processOwnerRoleId = schedRec.responsibleRoleId;
          reviewRoleId = schedRec.reviewRoleId;
          billReviewRoleId = schedRec.billReviewRoleId;
        }
      }
    }

    // Fallback to user's assigned role and reporting hierarchy if not found on schedule
    if (!processOwnerRoleId || !reviewRoleId) {
      const { locationRoleAssignments, organizationRoleAssignments, businessRoles } = await import('@/db/schema');
      const lRole = await db.select().from(locationRoleAssignments).where(
        and(eq(locationRoleAssignments.userId, session.user.id), eq(locationRoleAssignments.locationId, locationId))
      ).limit(1);
      
      let userRole = null;
      if (lRole.length > 0) {
        userRole = lRole[0].roleId;
      } else {
        const oRole = await db.select().from(organizationRoleAssignments).where(
          and(eq(organizationRoleAssignments.userId, session.user.id), eq(organizationRoleAssignments.organizationId, organizationId))
        ).limit(1);
        if (oRole.length > 0) userRole = oRole[0].roleId;
      }

      if (userRole) {
        if (!processOwnerRoleId) processOwnerRoleId = userRole;
        if (!reviewRoleId) {
          const roleInfo = await db.select().from(businessRoles).where(eq(businessRoles.id, userRole)).limit(1);
          if (roleInfo.length > 0 && roleInfo[0].reportsToRoleId) {
            reviewRoleId = roleInfo[0].reportsToRoleId;
          }
        }
      }
    }

    if (!billReviewRoleId) {
      billReviewRoleId = reviewRoleId;
    }

    // Create PO in 'pending_approval' status so reporting manager reviews it
    const publicToken = crypto.randomBytes(16).toString('hex');
    const [newPo] = await db.insert(purchaseOrders).values({
      organizationId: organizationId,
      locationId: locationId,
      vendorId: vendorId,
      poNumber: poNumber,
      status: "pending_approval",
      totalAmount: totalAmount.toString(),
      publicToken: publicToken,
      processOwnerRoleId: processOwnerRoleId,
      reviewRoleId: reviewRoleId,
      billReviewRoleId: billReviewRoleId,
      createdByUserId: session.user.id,
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

    // If this was triggered from a Task, mark it as complete
    if (taskId) {
      await db.update(taskInstances)
        .set({
          status: 'completed',
          completedAt: new Date(),
          completionData: { submittedBy: session.user.id, poId: newPo.id }
        })
        .where(eq(taskInstances.id, taskId));
    }

    // Fetch organization whatsappPoTemplate
    const { organizations } = await import('@/db/schema');
    const [orgRec] = await db
      .select({ whatsappPoTemplate: organizations.whatsappPoTemplate })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    return NextResponse.json({
      message: "PO Draft created",
      created: true,
      poId: newPo.id,
      purchaseOrder: newPo,
      lines: itemsToOrder.map(item => {
        const row = configuredItems.find(ci => ci.vendorItem.itemId === item.itemId);
        return {
          itemId: item.itemId,
          itemName: row?.item.nameEn || row?.vendorItem.itemName || "Item",
          orderedQuantity: item.orderedQuantity,
          unitOfMeasure: row?.item.purchaseUnit || row?.vendorItem.unitOfMeasure || row?.item.unit || "",
          unitRate: item.unitRate
        };
      }),
      whatsappPoTemplate: orgRec?.whatsappPoTemplate || null,
      vendor: vendorRec ? {
        name: vendorRec.name,
        contactDetails: vendorRec.contactDetails,
        poDeliveryMethod: vendorRec.poDeliveryMethod,
        poWhatsappPreference: vendorRec.poWhatsappPreference,
      } : null,
    });

  } catch (error: any) {
    console.error("Error in stock assessment:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
