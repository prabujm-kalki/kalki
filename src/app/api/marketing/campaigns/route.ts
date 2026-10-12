import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { marketingCampaigns } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { launchMarketingCampaign } from "@/domains/marketing/campaignService";

/**
 * Marketing Campaigns API
 * GET: Lists all campaigns with live delivery and attribution metrics
 * POST: Launches a campaign through the campaignService and logs audience attribution
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    const locationId = searchParams.get("locationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const conditions = [eq(marketingCampaigns.organizationId, organizationId)];
    if (locationId && locationId !== "ALL") {
      conditions.push(eq(marketingCampaigns.locationId, locationId));
    }

    const campaigns = await db
      .select()
      .from(marketingCampaigns)
      .where(and(...conditions))
      .orderBy(desc(marketingCampaigns.createdAt));

    return NextResponse.json({ success: true, data: campaigns });
  } catch (err: any) {
    console.error("[Marketing Campaigns API GET Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationId,
      locationId,
      name,
      templateName,
      templateLanguage,
      audienceType = "ALL_CUSTOMERS",
      customPhoneNumbers,
      templateParams,
      channel,
    } = body;

    const result = await launchMarketingCampaign({
      organizationId,
      locationId,
      name,
      templateName,
      templateLanguage,
      channel: channel || "WHATSAPP",
      audienceType: audienceType === "CUSTOM_LIST" ? "CUSTOM_LIST" : "ALL_CUSTOMERS",
      customNumbers: customPhoneNumbers,
      templateParams,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[Marketing Campaigns API POST Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to launch campaign" }, { status: 500 });
  }
}
