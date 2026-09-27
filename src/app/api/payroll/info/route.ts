import { NextResponse } from "next/server";
import { db } from "@/db";
import { employeeSalaryInfo } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const infos = await db
      .select()
      .from(employeeSalaryInfo)
      .where(and(
        eq(employeeSalaryInfo.employeeId, employeeId),
        eq(employeeSalaryInfo.isActive, true)
      ))
      .limit(1);

    return NextResponse.json({ info: infos[0] || null });
  } catch (error) {
    console.error("Failed to fetch salary info:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json();

    if (!body.employeeId || !body.organizationId || !body.paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Deactivate previous
    await db.update(employeeSalaryInfo)
      .set({ isActive: false })
      .where(and(
        eq(employeeSalaryInfo.employeeId, body.employeeId),
        eq(employeeSalaryInfo.isActive, true)
      ));

    // Insert new
    const [newInfo] = await db.insert(employeeSalaryInfo).values({
      organizationId: body.organizationId,
      employeeId: body.employeeId,
      paymentMethod: body.paymentMethod,
      accountHolderName: body.accountHolderName || null,
      accountNumber: body.accountNumber || null,
      bankName: body.bankName || null,
      ifscCode: body.ifscCode || null,
      gpayNumber: body.gpayNumber || null,
      bankingName: body.bankingName || null,
      isActive: true,
    }).returning();

    return NextResponse.json({ info: newInfo });
  } catch (error: any) {
    console.error("Failed to upsert salary info:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
