import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salesChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.enum(["AGGREGATOR", "IN_STORE", "CORPORATE", "OTHER"]),
  fulfillmentType: z.enum(["IMMEDIATE", "SCHEDULED", "DISPATCH"]),
  requiresDispatch: z.boolean().default(false),
  platformFeePercentage: z.number().min(0).max(100).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  try {
    const channels = await db
      .select()
      .from(salesChannels)
      .where(eq(salesChannels.organizationId, organizationId))
      .orderBy(salesChannels.name);
      
    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Sales Channels GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch sales channels" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.parse(body);

    const [newChannel] = await db.insert(salesChannels).values({
      organizationId: parsed.organizationId,
      locationId: parsed.locationId || null,
      name: parsed.name,
      type: parsed.type,
      fulfillmentType: parsed.fulfillmentType,
      requiresDispatch: parsed.requiresDispatch,
      platformFeePercentage: parsed.platformFeePercentage ? parsed.platformFeePercentage.toString() : null,
    }).returning();

    return NextResponse.json(newChannel);
  } catch (error) {
    console.error("Sales Channels POST Error:", error);
    return NextResponse.json({ error: "Failed to create sales channel" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    
    const [updated] = await db.update(salesChannels)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(salesChannels.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Sales Channels PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update sales channel" }, { status: 500 });
  }
}
