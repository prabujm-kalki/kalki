import { requireAuthenticatedUser } from "@/lib/authorization";
import { processTMBillExcelUpload } from "@/domains/sales/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const locationId = formData.get("locationId") as string;
    const organizationId = formData.get("organizationId") as string;
    const mappingConfigStr = formData.get("mappingConfig") as string;
    const headerRowIndexStr = formData.get("headerRowIndex") as string;

    if (!locationId || !organizationId || !mappingConfigStr || !headerRowIndexStr) {
      return NextResponse.json(
        { error: "Missing required form fields." },
        { status: 400 }
      );
    }

    const mappingConfig = JSON.parse(mappingConfigStr);
    const headerRowIndex = parseInt(headerRowIndexStr, 10);
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Convert Web File to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processTMBillExcelUpload(
      buffer,
      organizationId,
      locationId,
      user.id,
      mappingConfig,
      headerRowIndex
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sales upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
