import { NextResponse } from "next/server";
import { db } from "@/db";
import { salaryAdvances, employees, authUsers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const locId = searchParams.get("locId");

    if (!orgId || !locId) {
      return NextResponse.json({ error: "Missing orgId or locId" }, { status: 400 });
    }

    const advances = await db
      .select({
        id: salaryAdvances.id,
        amount: salaryAdvances.amount,
        reason: salaryAdvances.reason,
        dateGiven: salaryAdvances.dateGiven,
        status: salaryAdvances.status,
        repaymentMethod: salaryAdvances.repaymentMethod,
        employee: {
          name: authUsers.name,
          employeeId: employees.employeeCode,
        }
      })
      .from(salaryAdvances)
      .innerJoin(employees, eq(salaryAdvances.employeeId, employees.id))
      .innerJoin(authUsers, eq(employees.userId, authUsers.id))
      .where(
        and(
          eq(salaryAdvances.organizationId, orgId),
          eq(salaryAdvances.locationId, locId)
        )
      )
      .orderBy(desc(salaryAdvances.createdAt));

    return NextResponse.json({ advances });
  } catch (error) {
    console.error("Error fetching salary advances:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
