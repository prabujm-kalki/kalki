import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const searchParams = req.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");
    
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const data = await db.select().from(customers).where(
      eq(customers.organizationId, organizationId)
    );
    
    return NextResponse.json({ items: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
