import { requireAuthenticatedUser } from "@/lib/authorization";
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { getActiveImportFields } from "@/domains/settings/import-fields.service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    
    const organizationId = formData.get("organizationId") as string;
    if (!organizationId) {
      return NextResponse.json({ error: "No organizationId provided." }, { status: 400 });
    }

    const configuredFields = await getActiveImportFields(organizationId, "SALES_TRANSACTION");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const wb = xlsx.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // Convert to array of arrays
    const rawData = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
    
    // Find the header row by looking for the row with the most string columns
    // or just return the first 20 rows and let the frontend do it.
    // Auto-detect header row: usually it has more than 3 columns and contains "Date" or "No" or "Item"
    let headerRowIndex = 0;
    let maxCols = 0;

    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      const validCols = row.filter(cell => typeof cell === 'string' && cell.trim().length > 0).length;
      if (validCols > maxCols) {
        maxCols = validCols;
        headerRowIndex = i;
      }
    }

    const headers = rawData[headerRowIndex] || [];
    const sampleRows = rawData.slice(headerRowIndex + 1, headerRowIndex + 4);

    return NextResponse.json({
      headerRowIndex,
      headers: headers.map(String),
      sampleRows,
      configuredFields,
    });
  } catch (error: any) {
    console.error("Sales upload analyze error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
