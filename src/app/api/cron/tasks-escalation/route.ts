import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskInstances } from "@/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  // In production, this must be secured (e.g., using a CRON_SECRET or Vercel specific headers)
  // For Kalki BOS testing phase, we leave it open so it can be triggered manually via browser.

  try {
    const now = new Date();
    
    // ==========================================
    // STAGE 1: Assignee Deadline Breach 
    // ==========================================
    // Find tasks that are pending/in_progress but dueAt is in the past
    const missedTasks = await db.select().from(taskInstances)
      .where(and(
        inArray(taskInstances.status, ['pending', 'in_progress']),
        lt(taskInstances.dueAt, now)
      ));

    let missedCount = 0;
    if (missedTasks.length > 0) {
      for (const t of missedTasks) {
        const ctx: any = t.contextData || {};
        ctx.escalated = true;
        ctx.escalationReason = "Deadline missed by Assignee";
        
        await db.update(taskInstances)
          .set({ 
            // Instantly escalate it to the audit queue so management can see the failure
            status: 'audit_pending', 
            contextData: ctx,
            updatedAt: now 
          })
          .where(eq(taskInstances.id, t.id));
      }
      missedCount = missedTasks.length;
    }

    // ==========================================
    // STAGE 2: Auditor Grace Period Breach
    // ==========================================
    // If a manager ignores an audit for > 24 hours, automatically push to next hierarchy level.
    // (For testing purposes, we could lower this, but 24 hours is the 10-year robust default).
    const gracePeriodHours = 24;
    const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;
    const graceCutoff = new Date(now.getTime() - gracePeriodMs);

    const stagnantAudits = await db.select().from(taskInstances)
      .where(and(
        eq(taskInstances.status, 'audit_pending'),
        lt(taskInstances.updatedAt, graceCutoff)
      ));

    let escalatedAuditCount = 0;
    if (stagnantAudits.length > 0) {
      for (const t of stagnantAudits) {
        const ctx: any = t.contextData || {};
        const currentAuditLevel = ctx.auditLevel || 1;
        const newAuditLevel = currentAuditLevel + 1;
        
        ctx.auditLevel = newAuditLevel;
        ctx.escalationReason = `Auditor ignored task for > ${gracePeriodHours} hours. Escalated to Level ${newAuditLevel}`;
        ctx.escalated = true;
        
        await db.update(taskInstances).set({
          contextData: ctx,
          updatedAt: now // Reset the timer so Level 2 gets 24 hours to respond
        }).where(eq(taskInstances.id, t.id));
        
        escalatedAuditCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Escalation Engine successfully processed tasks.",
      escalatedMissedTasks: missedCount,
      escalatedStagnantAudits: escalatedAuditCount
    });
  } catch (error: any) {
    console.error("Escalation cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
