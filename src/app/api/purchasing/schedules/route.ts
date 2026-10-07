import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseSchedules } from "@/db/schema";
import crypto from "crypto";

export async function POST(request: Request) {
  try {

    // Default organization for now, replace with actual user's org if needed
    // Assuming the frontend sends it or we get it from session.
    const body = await request.json();
    const { organizationId, locationId, vendorId, responsibleRoleId, reviewRoleId, billReviewRoleId, frequencyRule, reminderTime, priority, taskDefinitionId } = body;

    if (!responsibleRoleId) {
      return NextResponse.json({ error: "Responsible Role is strictly required to prevent orphaned tasks." }, { status: 400 });
    }

    const [newSchedule] = await db.insert(purchaseSchedules).values({
      id: crypto.randomUUID(),
      organizationId,
      locationId,
      vendorId,
      responsibleRoleId,
      reviewRoleId: reviewRoleId || null,
      billReviewRoleId: billReviewRoleId || null,
      frequencyRule,
      reminderTime,
      priority: priority || "medium",
      taskDefinitionId: taskDefinitionId || null,
    }).returning();

    return NextResponse.json({ success: true, schedule: newSchedule });
  } catch (error: any) {
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
