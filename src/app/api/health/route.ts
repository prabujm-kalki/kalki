import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "kalki-bos",
    stage: 3,
    timestamp: new Date().toISOString(),
  });
}
