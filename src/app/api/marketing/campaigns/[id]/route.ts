import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { marketingCampaigns, campaignAudiences, customers, salesInvoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const campaignId = resolvedParams?.id;

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const [campaign] = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, campaignId));

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const audiences = await db
      .select({
        id: campaignAudiences.id,
        campaignId: campaignAudiences.campaignId,
        customerId: campaignAudiences.customerId,
        recipientPhone: campaignAudiences.recipientPhone,
        metaMessageId: campaignAudiences.metaMessageId,
        deliveryStatus: campaignAudiences.deliveryStatus,
        errorMessage: campaignAudiences.errorMessage,
        sentAt: campaignAudiences.sentAt,
        deliveredAt: campaignAudiences.deliveredAt,
        readAt: campaignAudiences.readAt,
        isConverted: campaignAudiences.isConverted,
        convertedInvoiceId: campaignAudiences.convertedInvoiceId,
        conversionWindow: campaignAudiences.conversionWindow,
        conversionAmount: campaignAudiences.conversionAmount,
        convertedAt: campaignAudiences.convertedAt,
        createdAt: campaignAudiences.createdAt,
        customerName: customers.name,
        customerEmail: customers.email,
        invoiceNumber: salesInvoices.invoiceNumber,
        invoiceGrandTotal: salesInvoices.grandTotal,
        invoiceDate: salesInvoices.invoiceDate,
      })
      .from(campaignAudiences)
      .leftJoin(customers, eq(campaignAudiences.customerId, customers.id))
      .leftJoin(salesInvoices, eq(campaignAudiences.convertedInvoiceId, salesInvoices.id))
      .where(eq(campaignAudiences.campaignId, campaignId))
      .orderBy(desc(campaignAudiences.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        campaign,
        audiences,
      },
    });
  } catch (err: any) {
    console.error("[Campaign Details API Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch campaign details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const campaignId = resolvedParams?.id;

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    // 1. Dry run / safety check first: ensure record exists
    const [existing] = await db
      .select({ id: marketingCampaigns.id, name: marketingCampaigns.name })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, campaignId));

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found or already deleted" }, { status: 404 });
    }

    // 2. Cascade delete audiences first (safe explicit targeting)
    await db
      .delete(campaignAudiences)
      .where(eq(campaignAudiences.campaignId, campaignId));

    // 3. Delete campaign record
    await db
      .delete(marketingCampaigns)
      .where(eq(marketingCampaigns.id, campaignId));

    return NextResponse.json({
      success: true,
      message: `Campaign "${existing.name}" deleted successfully.`,
    });
  } catch (err: any) {
    console.error("[Campaign DELETE Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
