import { NextResponse } from "next/server";
import { sendWhatsAppTextMessage, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { db } from "@/db";
import { whatsappTemplates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const {
      mobileNumber,
      messageText,
      templateName,
      languageCode,
      parameters,
      organizationId,
    } = await req.json();

    if (!mobileNumber) {
      return NextResponse.json(
        { success: false, error: "Recipient mobile number is required." },
        { status: 400 }
      );
    }

    let targetTemplate = templateName;
    let targetLang = languageCode;
    let templateDisplayName = "";

    // If templateName is hello_world or not provided, try to find an APPROVED template in the database
    if (!targetTemplate || targetTemplate === "hello_world") {
      try {
        let query = db
          .select()
          .from(whatsappTemplates)
          .where(eq(whatsappTemplates.status, "APPROVED"))
          .orderBy(desc(whatsappTemplates.createdAt))
          .limit(1);

        if (organizationId) {
          query = db
            .select()
            .from(whatsappTemplates)
            .where(
              and(
                eq(whatsappTemplates.organizationId, organizationId),
                eq(whatsappTemplates.status, "APPROVED")
              )
            )
            .orderBy(desc(whatsappTemplates.createdAt))
            .limit(1);
        }

        const approvedTpls = await query;
        if (approvedTpls.length > 0) {
          targetTemplate = approvedTpls[0].name;
          targetLang = targetLang || approvedTpls[0].language;
          templateDisplayName = approvedTpls[0].displayName || approvedTpls[0].name;
        }
      } catch (dbErr) {
        console.warn("[WhatsApp send-test] DB lookup for approved templates warning:", dbErr);
      }
    } else {
      // If a specific template was chosen, check if we have its language in DB
      try {
        const found = await db
          .select({ language: whatsappTemplates.language, displayName: whatsappTemplates.displayName })
          .from(whatsappTemplates)
          .where(eq(whatsappTemplates.name, targetTemplate))
          .limit(1);
        if (found.length > 0) {
          targetLang = targetLang || found[0].language;
          templateDisplayName = found[0].displayName || targetTemplate;
        }
      } catch (_) {}
    }

    let result;
    if (targetTemplate && targetTemplate !== "hello_world") {
      result = await sendWhatsAppTemplate(
        mobileNumber,
        targetTemplate,
        parameters || [],
        organizationId,
        targetLang || "en"
      );
    } else if (templateName === "hello_world") {
      // Sandbox fallback if no registered template found
      result = await sendWhatsAppTemplate(
        mobileNumber,
        "hello_world",
        parameters || [],
        organizationId,
        "en_US"
      );
    } else {
      // Freeform text message
      result = await sendWhatsAppTextMessage(
        mobileNumber,
        messageText || "Test message from Kalki BOS Meta Cloud API integration.",
        organizationId
      );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        templateUsed: targetTemplate,
        templateDisplayName: templateDisplayName || targetTemplate,
        message: targetTemplate
          ? `WhatsApp message delivered successfully using template '${targetTemplate}'!`
          : "WhatsApp message dispatched successfully!",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to dispatch WhatsApp message.",
          status: result.status,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
