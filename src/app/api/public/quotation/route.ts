import { NextRequest, NextResponse } from "next/server";
import { fetchPublicQuotation } from "@/app/sales/quotations/actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const result = await fetchPublicQuotation(token);
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || "Not found" }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

