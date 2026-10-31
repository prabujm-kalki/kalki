import { NextResponse } from "next/server";
import { db } from "@/db";
import { userManualSections, employeeManualProgress, employees } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get("module") || "purchasing";
    const organizationId = searchParams.get("organizationId");

    // Fetch employee linked to user if available
    let employeeId: string | null = null;
    if (user.id) {
      const empRows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, user.id))
        .limit(1);
      employeeId = empRows[0]?.id || null;
    }

    // Fetch sections for the module ordered by orderIndex
    const sections = await db
      .select()
      .from(userManualSections)
      .where(eq(userManualSections.module, moduleName))
      .orderBy(asc(userManualSections.orderIndex));

    // Fetch employee progress if employee exists
    const progressMap: Record<string, boolean> = {};
    if (employeeId) {
      const progressList = await db
        .select({
          sectionId: employeeManualProgress.sectionId,
        })
        .from(employeeManualProgress)
        .where(eq(employeeManualProgress.employeeId, employeeId));

      progressList.forEach((p) => {
        progressMap[p.sectionId] = true;
      });
    }

    return NextResponse.json({
      sections,
      progress: progressMap,
      employeeId,
    });
  } catch (error) {
    console.error("Failed to fetch manual sections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sectionId, completed, timeSpentSeconds, rating, feedback } = body;

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
    }

    // Find employee linked to user
    const empRows = await db
      .select({ id: employees.id, organizationId: employees.organizationId })
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (empRows.length === 0) {
      return NextResponse.json({ error: "No employee profile found for logged-in user" }, { status: 404 });
    }

    const employee = empRows[0];

    if (completed === false) {
      // Unmark section
      await db
        .delete(employeeManualProgress)
        .where(
          and(
            eq(employeeManualProgress.employeeId, employee.id),
            eq(employeeManualProgress.sectionId, sectionId)
          )
        );
      return NextResponse.json({ success: true, completed: false });
    }

    // Mark as completed
    await db
      .insert(employeeManualProgress)
      .values({
        employeeId: employee.id,
        sectionId,
        timeSpentSeconds: timeSpentSeconds || 30,
        rating: rating || null,
        feedback: feedback || null,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [employeeManualProgress.employeeId, employeeManualProgress.sectionId],
        set: {
          timeSpentSeconds: timeSpentSeconds || 30,
          completedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true, completed: true });
  } catch (error) {
    console.error("Failed to update manual progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

