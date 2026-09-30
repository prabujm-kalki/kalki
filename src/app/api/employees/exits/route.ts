import { NextResponse } from "next/server";
import { db } from "@/db";
import { employeeExits, employees, people } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();

    const { organizationId, employeeId, reason, requestedLastWorkingDay, type } = body;

    if (!organizationId || !employeeId || !reason || !requestedLastWorkingDay) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if there is already an active exit request (PENDING or APPROVED)
    const existingExits = await db.select()
      .from(employeeExits)
      .where(and(
        eq(employeeExits.employeeId, employeeId),
        inArray(employeeExits.status, ["PENDING", "APPROVED"])
      ))
      .limit(1);

    if (existingExits.length > 0) {
      return NextResponse.json({ error: "An active exit request (PENDING or APPROVED) already exists for this employee." }, { status: 400 });
    }

    const [exitRequest] = await db.insert(employeeExits).values({
      organizationId,
      employeeId,
      type: type || "RESIGNATION",
      reason,
      requestedLastWorkingDay: new Date(requestedLastWorkingDay),
      status: "PENDING",
    }).returning();

    // Set employee status to NOTICE_PERIOD when they initiate resignation
    await db.update(employees)
      .set({ status: "NOTICE_PERIOD", updatedAt: new Date() })
      .where(eq(employees.id, employeeId));

    return NextResponse.json({ success: true, exitRequest });
  } catch (error: any) {
    console.error("Failed to submit exit request:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const organizationId = url.searchParams.get("organizationId");

    if (!employeeId && !organizationId) {
      return NextResponse.json({ error: "employeeId or organizationId is required" }, { status: 400 });
    }

    let fullQuery = db
      .select({
        exit: employeeExits,
        employeeCode: employees.employeeCode,
        employeeName: people.displayName,
        locationId: employees.locationId
      })
      .from(employeeExits)
      .innerJoin(employees, eq(employeeExits.employeeId, employees.id))
      .innerJoin(people, eq(employees.personId, people.id));

    if (employeeId) {
      fullQuery = fullQuery.where(eq(employeeExits.employeeId, employeeId)) as any;
    } else if (organizationId) {
      fullQuery = fullQuery.where(eq(employeeExits.organizationId, organizationId)) as any;
    }

    const fullExits = await fullQuery;
    const formattedExits = fullExits.map(row => ({
      ...row.exit,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      locationId: row.locationId
    }));

    return NextResponse.json({ exits: formattedExits });
  } catch (error) {
    console.error("Failed to fetch exit requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

