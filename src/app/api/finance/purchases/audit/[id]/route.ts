import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchaseOrders, purchaseOrderLines, locationRoleAssignments, organizationRoleAssignments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuthenticatedUser, loadAuthorizationGrants } from "@/lib/authorization";
import fs from 'fs/promises';
import path from 'path';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;

  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
  if (!po) return NextResponse.json({ error: "PO not found" }, { status: 404 });

  if (po.billReviewRoleId) {
    const grants = await loadAuthorizationGrants(user.id);
    if (!grants.isOwner) {
      const roleCheck = await db.select().from(locationRoleAssignments).where(
        and(
          eq(locationRoleAssignments.userId, user.id),
          eq(locationRoleAssignments.locationId, po.locationId),
          eq(locationRoleAssignments.roleId, po.billReviewRoleId)
        )
      ).limit(1);

      if (roleCheck.length === 0) {
        const orgRoleCheck = await db.select().from(organizationRoleAssignments).where(
          and(
            eq(organizationRoleAssignments.userId, user.id),
            eq(organizationRoleAssignments.organizationId, po.organizationId),
            eq(organizationRoleAssignments.roleId, po.billReviewRoleId)
          )
        ).limit(1);

        if (orgRoleCheck.length === 0) {
          return NextResponse.json({ error: "Unauthorized: You are not assigned as the Bill Reviewer for this job" }, { status: 403 });
        }
      }
    }
  }

  try {
    const formData = await request.formData();
    
    const verifiedBillAmount = formData.get('verifiedBillAmount') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const notes = formData.get('notes') as string;
    const linesStr = formData.get('lines') as string;
    const billFile = formData.get('billFile') as File;

    if (!verifiedBillAmount || !linesStr) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    if (po.status !== 'audited' && !billFile) {
      return NextResponse.json({ error: "Missing bill file" }, { status: 400 });
    }

    let fileUrl: string | undefined;
    if (billFile) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const buffer = Buffer.from(await billFile.arrayBuffer());
      const filename = `${Date.now()}-${billFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      fileUrl = `/uploads/${filename}`;
    }

    const lines = JSON.parse(linesStr);

    // Run updates in a transaction
    await db.transaction(async (tx) => {
      let nextStatus = 'accounts_pending';
      let nextBillReviewRoleId = po.billReviewRoleId;

      // Limit checking for escalation
      // Get the role of the user performing the action
      let currentRoleId = po.billReviewRoleId;
      
      const { approvalLimits, businessRoles, locationRoleAssignments, organizationRoleAssignments } = await import('@/db/schema');
      
      if (!currentRoleId) {
        // If not explicitly assigned, find the user's active role for this location/org
        const locRole = await tx.select().from(locationRoleAssignments).where(
          and(eq(locationRoleAssignments.userId, user.id), eq(locationRoleAssignments.locationId, po.locationId))
        ).limit(1);
        
        if (locRole.length > 0) {
          currentRoleId = locRole[0].roleId;
        } else {
          const orgRole = await tx.select().from(organizationRoleAssignments).where(
            and(eq(organizationRoleAssignments.userId, user.id), eq(organizationRoleAssignments.organizationId, po.organizationId))
          ).limit(1);
          if (orgRole.length > 0) currentRoleId = orgRole[0].roleId;
        }
      }

      if (currentRoleId) {
        let checkingRoleId: string | null = currentRoleId;
        let finalRoleId: string | null = null;
        let requiresEscalation = false;
        
        while (checkingRoleId) {
          const limitCheck = await tx.select().from(approvalLimits).where(
            and(
              eq(approvalLimits.organizationId, po.organizationId),
              eq(approvalLimits.roleId, checkingRoleId),
              eq(approvalLimits.module, 'purchase_orders'),
              eq(approvalLimits.isActive, true)
            )
          ).limit(1);

          if (limitCheck.length > 0 && limitCheck[0].maxLimit !== null) {
            if (parseFloat(verifiedBillAmount) > parseFloat(limitCheck[0].maxLimit)) {
              // Limit exceeded for this role, must escalate
              requiresEscalation = true;
              const roleInfo = await tx.select().from(businessRoles).where(eq(businessRoles.id, checkingRoleId)).limit(1);
              
              if (roleInfo.length > 0 && roleInfo[0].reportsToRoleId) {
                // Move up the hierarchy
                checkingRoleId = roleInfo[0].reportsToRoleId;
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
          nextBillReviewRoleId = finalRoleId;
          nextStatus = 'audited'; // Escalated bill approval
        }
      }

      // 1. Update purchase order status and cashier fields
      await tx.update(purchaseOrders)
        .set({
          status: nextStatus as any, 
          billReviewRoleId: nextBillReviewRoleId,
          cashierBillAmount: verifiedBillAmount,
          cashierPaymentMethod: paymentMethod || po.paymentMethod || 'cash',
          cashierAttachments: fileUrl ? { notes, fileUrl } : (notes ? { ...(po.cashierAttachments as any || {}), notes } : po.cashierAttachments),
        })
        .where(eq(purchaseOrders.id, id));

      // 2. Update lines
      for (const line of lines) {
        if (line.id) {
          await tx.update(purchaseOrderLines)
            .set({
              receivedQuantity: line.receivedQuantity !== undefined ? String(line.receivedQuantity) : undefined,
              unitRate: line.unitRate !== undefined ? String(line.unitRate) : undefined,
            })
            .where(eq(purchaseOrderLines.id, line.id));
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit processing error:', error);
    return NextResponse.json({ error: 'Failed to process audit' }, { status: 500 });
  }
}
