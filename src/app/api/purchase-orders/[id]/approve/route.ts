import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, vendorItems, approvalLimits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const user = await requireAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentPo] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, resolvedParams.id));
    if (!currentPo) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = null;
    }
    
    const action = body?.action || 'accept';
    let nextStatus = 'approved';
    let finalTotalAmount = Number(currentPo.totalAmount || 0);
    let finalCashierBillAmount = currentPo.cashierBillAmount;
    let newLinesToInsert: any[] = [];
    const hasLineChanges = body && body.lines && Array.isArray(body.lines);

    if (currentPo.status === 'audited') {
      if (action === 'reject') nextStatus = 'rejected';
      else if (action === 'return') nextStatus = 'pending_receipt';
      else nextStatus = 'accounts_pending';
      finalTotalAmount = Number(currentPo.totalAmount || 0);
    }

    if (hasLineChanges) {
      const hasInvalidItem = body.lines.some((l: any) => !l.itemId);
      if (hasInvalidItem) return NextResponse.json({ error: "Missing itemId in payload" }, { status: 400 });
      
      let newTotal = 0;
      
      newLinesToInsert = body.lines.map((l: any) => {
        const qty = currentPo.status === 'audited' ? l.receivedQuantity : l.orderedQuantity;
        newTotal += (Number(qty || 0) * Number(l.unitRate || 0)) || 0;
        return {
          poId: resolvedParams.id,
          itemId: l.itemId,
          orderedQuantity: String(l.orderedQuantity || 0),
          receivedQuantity: l.receivedQuantity != null ? String(l.receivedQuantity) : (currentPo.status === 'audited' ? String(l.orderedQuantity || 0) : null), 
          unitRate: String(l.unitRate || 0)
        };
      });
      
      if (currentPo.status === 'audited' && newTotal > 0) {
        finalCashierBillAmount = newTotal.toString();
      } else if (currentPo.status !== 'audited' && newTotal > 0) {
        finalTotalAmount = newTotal;
      }
    }

    let nextReviewRoleId = currentPo.reviewRoleId;

    // --- APPROVAL LIMITS LOGIC ---
    if (currentPo.status === 'draft' || currentPo.status === 'pending_review') {
      if (currentPo.status === 'pending_review' && currentPo.cashierBillAmount) {
        // This was escalated from the Cashier Bill Audit phase!
        nextStatus = 'accounts_pending';
      } else {
        // PO Approval Phase or Draft Phase: Check if current reviewer's limit is sufficient
        let roleToCheck = currentPo.status === 'draft' ? currentPo.processOwnerRoleId : currentPo.reviewRoleId;
        
        if (roleToCheck) {
          let checkingRoleId: string | null = roleToCheck;
          let finalRoleId: string | null = null;
          let requiresEscalation = false;
          const { businessRoles } = await import('@/db/schema');
  
          while (checkingRoleId) {
            const [limitRecord] = await db.select().from(approvalLimits).where(
              and(
                eq(approvalLimits.organizationId, currentPo.organizationId),
                eq(approvalLimits.roleId, checkingRoleId),
                eq(approvalLimits.module, 'purchase_orders'),
                eq(approvalLimits.isActive, true)
              )
            );
  
            if (limitRecord && limitRecord.maxLimit !== null) {
              if (finalTotalAmount > Number(limitRecord.maxLimit)) {
                // Limit exceeded for this role, must escalate
                requiresEscalation = true;
                const [roleInfo] = await db.select().from(businessRoles).where(eq(businessRoles.id, checkingRoleId));
                
                if (roleInfo && roleInfo.reportsToRoleId) {
                  checkingRoleId = roleInfo.reportsToRoleId;
                } else {
                  // Reached top of hierarchy but limit is still insufficient, escalate to System Owner
                  checkingRoleId = null;
                  finalRoleId = null;
                  break; // break out of while
                }
              } else {
                // Limit is sufficient for this role
                finalRoleId = checkingRoleId;
                break; // break out of while
              }
            } else {
              // No limit configured (meaning unlimited), sufficient
              finalRoleId = checkingRoleId;
              break; // break out of while
            }
          }
  
          if (requiresEscalation) {
            nextReviewRoleId = finalRoleId;
            nextStatus = 'pending_review';
          } else {
            nextStatus = 'approved';
          }
        } else {
          // If reviewRoleId is null, it's being approved by the System Owner (infinite limit)
          nextStatus = 'approved';
        }
      }
    }

    // Apply DB updates
    if (hasLineChanges) {
      await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, resolvedParams.id));
      if (newLinesToInsert.length > 0) {
        await db.insert(purchaseOrderLines).values(newLinesToInsert);
        
        if (nextStatus === 'completed') {
          for (const line of newLinesToInsert) {
            if (Number(line.unitRate) > 0) {
              await db.update(vendorItems)
                .set({ lastRate: line.unitRate, updatedAt: new Date() })
                .where(and(eq(vendorItems.vendorId, currentPo.vendorId), eq(vendorItems.itemId, line.itemId)));
            }
          }
        }
      }
    }
    
    const [updatedPo] = await db
      .update(purchaseOrders)
      .set({ 
        status: nextStatus as any, 
        reviewRoleId: nextReviewRoleId,
        totalAmount: finalTotalAmount.toString(),
        cashierBillAmount: finalCashierBillAmount,
        approvedByUserId: user.id,
        updatedAt: new Date() 
      })
      .where(eq(purchaseOrders.id, resolvedParams.id))
      .returning();
    
    return NextResponse.json({ success: true, po: updatedPo });
  } catch (error) {
    console.error("Failed to approve PO:", error);
    return NextResponse.json({ error: "Failed to approve PO" }, { status: 500 });
  }
}
