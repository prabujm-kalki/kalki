import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  marketingCampaigns,
  marketingCampaignLogs,
  whatsappCommunications,
  customers,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

/**
 * Marketing Campaigns API
 * GET: Lists all campaigns with live delivery metrics
 * POST: Creates and launches a campaign to targeted customer segments
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const campaigns = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.organizationId, organizationId))
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
      description,
      templateName,
      templateLanguage,
      targetAudienceType,
      audienceFilter,
      customPhoneNumbers,
    } = body;

    if (!organizationId || !name || !templateName) {
      return NextResponse.json(
        { error: "organizationId, name, and templateName are required." },
        { status: 400 }
      );
    }

    // 1. Resolve Target Recipients from Kalki BOS Customer Database
    let recipients: Array<{ customerId?: string; phone: string; name?: string }> = [];

    if (customPhoneNumbers && Array.isArray(customPhoneNumbers) && customPhoneNumbers.length > 0) {
      recipients = customPhoneNumbers.map((p: string) => ({ phone: p.trim() }));
    } else {
      // Query customers from this organization
      const custs = await db
        .select({ id: customers.id, phone: customers.phone, name: customers.name })
        .from(customers)
        .where(eq(customers.organizationId, organizationId))
        .limit(1000);

      recipients = custs
        .filter((c) => c.phone && c.phone.trim().length >= 10)
        .map((c) => ({ customerId: c.id, phone: c.phone!.trim(), name: c.name }));
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipient phone numbers found for this campaign audience." },
        { status: 400 }
      );
    }

    // 2. Insert Campaign Record
    const [campaign] = await db
      .insert(marketingCampaigns)
      .values({
        organizationId,
        locationId,
        name,
        description,
        templateName,
        templateLanguage: templateLanguage || "en",
        status: "RUNNING",
        targetAudienceType: targetAudienceType || "ALL_CUSTOMERS",
        audienceFilter: audienceFilter || {},
        totalRecipients: recipients.length,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        startedAt: new Date(),
      })
      .returning();

    // 3. Dispatch Messages & Record Campaign Logs
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const sendResult = await sendWhatsAppTemplate(
          recipient.phone,
          templateName,
          recipient.name ? [recipient.name] : [],
          organizationId,
          templateLanguage
        );

        if (sendResult.success && sendResult.messageId) {
          sentCount++;
          await db.insert(marketingCampaignLogs).values({
            campaignId: campaign.id,
            customerId: recipient.customerId || null,
            recipientPhone: recipient.phone,
            metaMessageId: sendResult.messageId,
            status: "SENT",
            sentAt: new Date(),
          });
        } else {
          failedCount++;
          await db.insert(marketingCampaignLogs).values({
            campaignId: campaign.id,
            customerId: recipient.customerId || null,
            recipientPhone: recipient.phone,
            status: "FAILED",
            errorMessage: sendResult.error || "Dispatch failed",
          });
        }
      } catch (dispatchErr: any) {
        failedCount++;
        await db.insert(marketingCampaignLogs).values({
          campaignId: campaign.id,
          customerId: recipient.customerId || null,
          recipientPhone: recipient.phone,
          status: "FAILED",
          errorMessage: dispatchErr?.message || "Execution exception",
        });
      }
    }

    // 4. Update Campaign Final Batch Stats
    await db
      .update(marketingCampaigns)
      .set({
        status: "COMPLETED",
        sentCount,
        failedCount,
        completedAt: new Date(),
      })
      .where(eq(marketingCampaigns.id, campaign.id));

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
      },
    });
  } catch (err: any) {
    console.error("[Marketing Campaigns API POST Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to launch campaign" }, { status: 500 });
  }
}
