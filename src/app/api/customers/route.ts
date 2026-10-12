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
    const locationId = searchParams.get("locationId");
    
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const { crmCustomerProfiles } = await import("@/db/schema");

    const conditions = [eq(customers.organizationId, organizationId)];
    if (locationId && locationId !== "ALL") {
      conditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
    }

    const data = await db
      .select({
        id: customers.id,
        organizationId: customers.organizationId,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        taxId: customers.taxId,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        customerType: crmCustomerProfiles.customerType,
        preferredLocationId: crmCustomerProfiles.preferredLocationId,
        rfmSegment: crmCustomerProfiles.rfmSegment,
        priorityScore: crmCustomerProfiles.priorityScore,
        lifecycleStage: crmCustomerProfiles.lifecycleStage,
        monetarySpend: crmCustomerProfiles.monetarySpend,
        frequencyOrders: crmCustomerProfiles.frequencyOrders,
        recencyDays: crmCustomerProfiles.recencyDays,
      })
      .from(customers)
      .leftJoin(crmCustomerProfiles, eq(customers.id, crmCustomerProfiles.customerId))
      .where(and(...conditions));
    
    return NextResponse.json({ items: data, customers: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
