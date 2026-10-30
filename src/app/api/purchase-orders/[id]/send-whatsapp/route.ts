import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, vendors, organizations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp";
import { buildPoWhatsappMessage, resolveWhatsappPreferences } from "@/lib/whatsapp-po";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [po] = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        publicToken: purchaseOrders.publicToken,
        organizationId: purchaseOrders.organizationId,
        vendorId: purchaseOrders.vendorId,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const [vendor] = await db
      .select({
        name: vendors.name,
        contactDetails: vendors.contactDetails,
        poDeliveryMethod: vendors.poDeliveryMethod,
        poWhatsappPreference: vendors.poWhatsappPreference,
      })
      .from(vendors)
      .where(eq(vendors.id, po.vendorId));

    const [org] = await db
      .select({
        whatsappPoTemplate: organizations.whatsappPoTemplate,
        whatsappDispatchMode: organizations.whatsappDispatchMode,
        whatsappContentFormat: organizations.whatsappContentFormat,
      })
      .from(organizations)
      .where(eq(organizations.id, po.organizationId));

    const resolved = resolveWhatsappPreferences({
      orgDispatchMode: org?.whatsappDispatchMode,
      orgContentFormat: org?.whatsappContentFormat,
      vendorPreference: vendor?.poWhatsappPreference,
      vendorDeliveryMethod: vendor?.poDeliveryMethod,
    });

    if (resolved.isGloballyDisabled || resolved.dispatchMode === "NO_WHATSAPP") {
      return NextResponse.json({
        skipped: true,
        reason: "WhatsApp dispatch is suppressed by organization or vendor configuration.",
      });
    }

    const vendorPhoneRaw =
      (vendor?.contactDetails as any)?.phone ||
      (vendor?.contactDetails as any)?.whatsapp ||
      (vendor?.contactDetails as any)?.mobile ||
      "";
    const phoneDigits = vendorPhoneRaw.replace(/\D/g, "");

    if (!phoneDigits) {
      return NextResponse.json({
        skipped: true,
        reason: "Vendor phone number is missing.",
      });
    }

    const poNumber = po.poNumber || `PO-${po.id.slice(0, 8).toUpperCase()}`;

    const { text } = buildPoWhatsappMessage({
      poNumber,
      totalAmount: po.totalAmount,
      publicToken: po.publicToken,
      vendorPhone: phoneDigits,
      poWhatsappPreference: vendor?.poWhatsappPreference,
      orgWhatsappContentFormat: org?.whatsappContentFormat,
      whatsappPoTemplate: org?.whatsappPoTemplate,
    });

    const sendRes = await sendWhatsAppTextMessage(phoneDigits, text, po.organizationId);

    if (sendRes.success) {
      await db
        .update(purchaseOrders)
        .set({ status: "sent_to_vendor" })
        .where(eq(purchaseOrders.id, id));

      return NextResponse.json({
        success: true,
        messageId: sendRes.messageId,
        message: `PO #${poNumber} dispatched automatically to ${vendor?.name || "vendor"} via WhatsApp API.`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: sendRes.error || "Failed to deliver WhatsApp message via API.",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error in WhatsApp API PO dispatch:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

