import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, purchaseRoutingConfigs } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, and } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    
    const receivedLinesStr = formData.get("receivedLines");
    if (!receivedLinesStr || typeof receivedLinesStr !== 'string') {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    
    const receivedLines = JSON.parse(receivedLinesStr);
    if (!Array.isArray(receivedLines)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    // Verify PO
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    // Handle process owner proof file upload
    const proofFile = formData.get("processOwnerProof") as File | null;
    let processOwnerAttachments: string[] | null = null;
    
    if (proofFile) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "process_owner");
      await fs.mkdir(uploadDir, { recursive: true });
      
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${id}_${Date.now()}.${fileExt}`;
      const filePath = path.join(uploadDir, fileName);
      
      const buffer = Buffer.from(await proofFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      
      processOwnerAttachments = [`/uploads/process_owner/${fileName}`];
    }

    // Update lines
    for (const line of receivedLines) {
      let status = 'PENDING';
      const rQty = Number(line.receivedQuantity);
      const oQty = Number(line.orderedQuantity);
      
      if (rQty === 0) status = 'NOT_RECEIVED';
      else if (rQty === oQty) status = 'OK';
      else status = 'MODIFIED';

      await db.update(purchaseOrderLines)
        .set({
          receivedQuantity: rQty.toString(),
          receivingStatus: status,
        })
        .where(eq(purchaseOrderLines.id, line.id));
    }

    // Check for custom routing config
    const [config] = await db.select().from(purchaseRoutingConfigs)
      .where(and(eq(purchaseRoutingConfigs.organizationId, po.organizationId), eq(purchaseRoutingConfigs.locationId, po.locationId)))
      .limit(1);

    const updateData: any = { 
      status: 'received',
      receivedByUserId: user.id 
    };

    if (config && config.targetRoleId) {
      updateData.billReviewRoleId = config.targetRoleId;
    }

    if (processOwnerAttachments) {
      updateData.processOwnerAttachments = processOwnerAttachments;
    }

    await db.update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id));

    return NextResponse.json({ message: "Goods receipt processed successfully" });
  } catch (error: any) {
    console.error("Error receiving PO:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
