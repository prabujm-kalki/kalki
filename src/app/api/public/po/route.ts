import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchaseOrders, purchaseOrderLines, items, vendors, organizations, vendorItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log("vendorItems is:", !!vendorItems);

    const [po] = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        createdAt: purchaseOrders.createdAt,
        vendorId: purchaseOrders.vendorId,
        vendorName: vendors.name,
        orgName: organizations.name,
        paymentMethod: purchaseOrders.paymentMethod,
        cashierBillAmount: purchaseOrders.cashierBillAmount,
        cashierAttachments: purchaseOrders.cashierAttachments,
        processOwnerAttachments: purchaseOrders.processOwnerAttachments,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .innerJoin(organizations, eq(purchaseOrders.organizationId, organizations.id))
      .where(eq(purchaseOrders.publicToken, token));

    if (!po) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const lines = await db
      .select({
        id: purchaseOrderLines.id,
        orderedQuantity: purchaseOrderLines.orderedQuantity,
        receivedQuantity: purchaseOrderLines.receivedQuantity,
        unitRate: purchaseOrderLines.unitRate,
        itemName: items.nameEn, itemId: items.id,
        purchaseUnit: items.purchaseUnit,
        baseUnit: items.unit,
        lastRate: vendorItems.lastRate,
      })
      .from(purchaseOrderLines)
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .leftJoin(vendorItems, and(eq(vendorItems.itemId, purchaseOrderLines.itemId), eq(vendorItems.vendorId, po.vendorId)))
      .where(eq(purchaseOrderLines.poId, po.id));

    const mappedLines = lines.map(l => ({
      ...l,
      unitOfMeasure: l.purchaseUnit || l.baseUnit
    }));

    return NextResponse.json({ po, lines: mappedLines });
  } catch (error: any) {
    console.error('Error fetching public PO:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message, stack: error.stack }, { status: 500 });
  }
}
