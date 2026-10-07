import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseDebitNotes, approvalLimits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "better-auth";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    const user = session?.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { vendorId, amount, reason, noteDate, organizationId, locationId } = body;

    if (!vendorId || !amount || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine the status based on approval limits
    let status = "pending_approval";
    
    // Check if the user has a limit defined for debit_notes
    // Assuming you have an employee linked to the user for roles
    const limits = await db.select()
      .from(approvalLimits)
      .where(and(eq(approvalLimits.organizationId, organizationId), eq(approvalLimits.module, "debit_notes")));
      
    // If a limit exists and amount is less than the max limit, auto-approve
    const hasSufficientLimit = limits.some(limit => limit.isActive && Number(limit.maxLimit) >= Number(amount));
    
    if (hasSufficientLimit) {
      status = "approved";
    }
    
    let validLocationId = locationId;
    if (!validLocationId) {
      // Find the primary location for the organization
      const { locations } = await import("@/db/schema");
      const [firstLocation] = await db.select().from(locations).where(eq(locations.organizationId, organizationId)).limit(1);
      if (firstLocation) {
        validLocationId = firstLocation.id;
      } else {
        return NextResponse.json({ error: "No location available for this organization" }, { status: 400 });
      }
    }
    
    const [note] = await db.insert(purchaseDebitNotes).values({
      organizationId,
      locationId: validLocationId,
      vendorId,
      amount: amount.toString(),
      reason,
      noteDate: new Date(noteDate),
      noteNumber: `DN-${Date.now().toString().slice(-6)}`,
      status,
      createdByUserId: user.id
    }).returning();

    // Here we would also integrate with the task_instances table to assign an approval task
    // to the System Owner or Manager if status === "pending_approval"

    return NextResponse.json(note);
  } catch (error: any) {
    console.error("Error creating debit note:", error);
    return NextResponse.json({ error: error.message || "Failed to create debit note" }, { status: 500 });
  }
}
