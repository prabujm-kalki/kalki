import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { whatsappCommunications, customers, vendors } from "@/db/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { sendWhatsAppTextMessage, sendWhatsAppTemplate } from "@/lib/whatsapp";

/**
 * WhatsApp Communications Real-time Query & Reply API
 * 
 * GET: Lists communication ledger items with customer/vendor details, filters by phone, customerId, vendorId
 * POST: Sends an outbound response (text message or template) and logs it in real-time
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const customerId = searchParams.get("customerId");
    const vendorId = searchParams.get("vendorId");
    const phone = searchParams.get("phone");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const conditions = [eq(whatsappCommunications.organizationId, organizationId)];

    if (customerId) {
      conditions.push(eq(whatsappCommunications.customerId, customerId));
    }
    if (vendorId) {
      conditions.push(eq(whatsappCommunications.vendorId, vendorId));
    }
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      conditions.push(
        or(
          sql`${whatsappCommunications.senderNumber} LIKE ${`%${cleanPhone}%`}`,
          sql`${whatsappCommunications.recipientNumber} LIKE ${`%${cleanPhone}%`}`
        )!
      );
    }

    const logs = await db
      .select({
        id: whatsappCommunications.id,
        direction: whatsappCommunications.direction,
        status: whatsappCommunications.status,
        messageType: whatsappCommunications.messageType,
        content: whatsappCommunications.content,
        mediaUrl: whatsappCommunications.mediaUrl,
        metadata: whatsappCommunications.metadata,
        senderNumber: whatsappCommunications.senderNumber,
        recipientNumber: whatsappCommunications.recipientNumber,
        metaMessageId: whatsappCommunications.metaMessageId,
        createdAt: whatsappCommunications.createdAt,
        customerId: whatsappCommunications.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        vendorId: whatsappCommunications.vendorId,
        vendorName: vendors.name,
      })
      .from(whatsappCommunications)
      .leftJoin(customers, eq(whatsappCommunications.customerId, customers.id))
      .leftJoin(vendors, eq(whatsappCommunications.vendorId, vendors.id))
      .where(and(...conditions))
      .orderBy(desc(whatsappCommunications.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    console.error("[WhatsApp Logs API Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch communications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, to, text, templateName, templateParams } = body;

    if (!organizationId || !to) {
      return NextResponse.json({ error: "organizationId and 'to' recipient number are required." }, { status: 400 });
    }

    let result;
    if (templateName) {
      result = await sendWhatsAppTemplate(to, templateName, templateParams || [], organizationId);
    } else if (text) {
      result = await sendWhatsAppTextMessage(to, text, organizationId);
    } else {
      return NextResponse.json({ error: "Either 'text' or 'templateName' must be provided." }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("[WhatsApp Outbound API Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to dispatch message" }, { status: 500 });
  }
}
