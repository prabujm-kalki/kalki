const fs = require('fs');

let c = fs.readFileSync('src/app/api/purchase-orders/[id]/approve/route.ts', 'utf8');

c = c.replace('import { eq } from "drizzle-orm";', 'import { eq } from "drizzle-orm";\nimport { purchaseOrderLines } from "@/db/schema";');

c = c.replace(/const \[updatedPo\] = await db[\s\S]*?\.returning\(\);/, `
    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = null;
    }
    
    if (body && body.lines && Array.isArray(body.lines)) {
      // User edited the lines before approving
      let newTotal = 0;
      await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, resolvedParams.id));
      
      const newLines = body.lines.map((l) => {
        newTotal += Number(l.orderedQuantity) * Number(l.unitRate);
        return {
          poId: resolvedParams.id,
          itemId: l.itemId,
          orderedQuantity: l.orderedQuantity.toString(),
          unitRate: l.unitRate.toString()
        };
      });
      
      if (newLines.length > 0) {
        await db.insert(purchaseOrderLines).values(newLines);
      }
      
      const [updatedPo] = await db
        .update(purchaseOrders)
        .set({ status: 'approved', totalAmount: newTotal.toString(), updatedAt: new Date() })
        .where(eq(purchaseOrders.id, resolvedParams.id))
        .returning();
      
      if (!updatedPo) {
        return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, po: updatedPo });
    }

    // Default approval (no line changes)
    const [updatedPo] = await db
      .update(purchaseOrders)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, resolvedParams.id))
      .returning();
`);

fs.writeFileSync('src/app/api/purchase-orders/[id]/approve/route.ts', c);
