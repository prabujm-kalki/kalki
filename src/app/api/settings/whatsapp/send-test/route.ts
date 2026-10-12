import { NextResponse } from "next/server";
import { sendWhatsAppTextMessage, sendWhatsAppTemplate } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const { mobileNumber, messageText, templateName, parameters, organizationId } = await req.json();

    if (!mobileNumber) {
      return NextResponse.json(
        { success: false, error: "Recipient mobile number is required." },
        { status: 400 }
      );
    }

    let result;
    if (templateName) {
      result = await sendWhatsAppTemplate(
        mobileNumber,
        templateName,
        parameters || [],
        organizationId
      );
    } else {
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
        message: "WhatsApp message dispatched successfully!",
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
