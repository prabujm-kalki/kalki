import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchaseOrders, purchaseOrderLines, items, vendors, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const [po] = await db
      .select({
        id: purchaseOrders.id,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        createdAt: purchaseOrders.createdAt,
        vendorName: vendors.name,
        orgName: organizations.name,
        paymentMethod: purchaseOrders.paymentMethod,
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
      })
      .from(purchaseOrderLines)
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .where(eq(purchaseOrderLines.poId, po.id));

    return NextResponse.json({ po, lines });
  } catch (error) {
    console.error('Error fetching public PO:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
