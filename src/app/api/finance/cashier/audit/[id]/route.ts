import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import { writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    
    const cashierBillAmount = formData.get("cashierBillAmount")?.toString();
    const notes = formData.get("notes")?.toString();
    const linesStr = formData.get("lines")?.toString();
    const billFile = formData.get("billFile") as File | null;

    if (!cashierBillAmount) {
      return NextResponse.json({ error: "Cashier bill amount is required" }, { status: 400 });
    }
    if (!billFile) {
      return NextResponse.json({ error: "Physical bill upload is mandatory" }, { status: 400 });
    }

    // Verify PO
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    if (po.status !== "received") {
      return NextResponse.json({ error: "PO is not in received status" }, { status: 400 });
    }

    // Save File
    const bytes = await billFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${crypto.randomUUID()}-${billFile.name}`;
    const filePath = join(process.cwd(), "public", "uploads", fileName);
    await writeFile(filePath, buffer);
    const billUrl = `/uploads/${fileName}`;

    // Update lines if needed
    if (linesStr) {
      const lines = JSON.parse(linesStr);
      let newTotal = 0;
      for (const line of lines) {
        const p = Number(line.price || 0);
        const q = Number(line.receivedQuantity !== undefined && line.receivedQuantity !== null ? line.receivedQuantity : line.orderedQuantity);
        newTotal += (p * q);
        await db.update(purchaseOrderLines)
          .set({ unitRate: String(p) })
          .where(eq(purchaseOrderLines.id, line.id));
      }
    }

    // Update PO with cashier details and move to 'completed' status
    await db.update(purchaseOrders)
      .set({ 
        cashierBillAmount: String(cashierBillAmount),
        status: 'completed',
        // In reality you might want to save the billUrl to the PO table or an attachments table
        // We'll append it to the internal notes or if there's a column, use it.
        // Assuming no `billUrl` column right now, we can append to notes.
        notes: (po.notes ? po.notes + "\n" : "") + `Audit Notes: ${notes || 'N/A'}\nBill: ${billUrl}`,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, id));

    return NextResponse.json({ message: "PO audited successfully", billUrl });
  } catch (error: any) {
    console.error("Error auditing PO:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
