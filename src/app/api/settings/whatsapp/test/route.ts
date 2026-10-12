import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phoneNumberId, apiToken } = await req.json();

    if (!phoneNumberId || !apiToken) {
      return NextResponse.json(
        { success: false, error: "Both Phone Number ID and API Token are required to test." },
        { status: 400 }
      );
    }

    // First try querying as Phone Number ID with display_phone_number and verified_name
    let testUrl = `https://graph.facebook.com/v19.0/${phoneNumberId.trim()}`;
    
    let res = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        "Content-Type": "application/json",
      },
    });

    let data = await res.json().catch(() => ({}));

    // If query failed or succeeded:
    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `HTTP ${res.status}: ${res.statusText}`;
      return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
    }

    const verifiedName = data.verified_name || data.name || "WhatsApp Connected";
    const displayPhone = data.display_phone_number || data.id || "Active";

    return NextResponse.json({
      success: true,
      data: {
        verifiedName,
        displayPhoneNumber: displayPhone,
        qualityRating: data.quality_rating || "GREEN",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to connect to Meta Graph API" },
      { status: 500 }
    );
  }
}
