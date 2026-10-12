import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  marketingCampaigns,
  whatsappCommunications,
  customers,
} from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

/**
 * Marketing Overview & Analytics API
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    // 1. Total Audiences (Customers with valid phone numbers)
    const audienceStats = await db
      .select({
        totalCustomers: sql<number>`count(*)`,
        reachableOnWhatsApp: sql<number>`count(case when phone is not null and length(phone) >= 10 then 1 end)`,
      })
      .from(customers)
      .where(eq(customers.organizationId, organizationId));

    // 2. Aggregate Campaign Delivery Funnel
    const campaignStats = await db
      .select({
        totalCampaigns: sql<number>`count(*)`,
        totalRecipients: sql<number>`coalesce(sum(total_recipients), 0)`,
        totalSent: sql<number>`coalesce(sum(sent_count), 0)`,
        totalDelivered: sql<number>`coalesce(sum(delivered_count), 0)`,
        totalRead: sql<number>`coalesce(sum(read_count), 0)`,
        totalFailed: sql<number>`coalesce(sum(failed_count), 0)`,
      })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.organizationId, organizationId));

    // 3. Inbound vs Outbound 2-Way Volume
    const commStats = await db
      .select({
        totalOutbound: sql<number>`count(case when direction = 'OUTBOUND' then 1 end)`,
        totalInbound: sql<number>`count(case when direction = 'INBOUND' then 1 end)`,
      })
      .from(whatsappCommunications)
      .where(eq(whatsappCommunications.organizationId, organizationId));

    // 4. Recent Campaigns
    const recentCampaigns = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.organizationId, organizationId))
      .orderBy(desc(marketingCampaigns.createdAt))
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        audience: audienceStats[0] || { totalCustomers: 0, reachableOnWhatsApp: 0 },
        campaigns: campaignStats[0] || { totalCampaigns: 0, totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0 },
        communications: commStats[0] || { totalOutbound: 0, totalInbound: 0 },
        recentCampaigns,
      },
    });
  } catch (err: any) {
    console.error("[Marketing Stats API Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch stats" }, { status: 500 });
  }
}
