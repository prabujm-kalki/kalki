import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { recordPaymentAndAllocate } from "@/domains/finance/service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const payment = await recordPaymentAndAllocate({ id: user.id }, body);
    return NextResponse.json(payment);
  } catch (error: any) {
    if (error.code === "ACCESS_DENIED") return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.code === "INVALID_INPUT") return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === "NOT_FOUND") return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
