import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/authorization';
import { createPurchaseOrder, InventoryServiceError } from '@/domains/inventory/service';
import { db } from '@/db';
import { purchaseOrders, vendors, organizations } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 5);
    const organizationId = url.searchParams.get('organizationId');
    const locationId = url.searchParams.get('locationId');

    if (!organizationId || !locationId) {
       return NextResponse.json({ error: 'organizationId and locationId required' }, { status: 400 });
    }

    const pos = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        createdAt: purchaseOrders.createdAt,
        publicToken: purchaseOrders.publicToken,
        vendorName: vendors.name,
        vendorPhone: vendors.contactDetails,
        poDeliveryMethod: vendors.poDeliveryMethod,
        poWhatsappPreference: vendors.poWhatsappPreference,
        whatsappPoTemplate: organizations.whatsappPoTemplate,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(organizations, eq(purchaseOrders.organizationId, organizations.id))
      .where(and(
        eq(purchaseOrders.organizationId, organizationId),
        eq(purchaseOrders.locationId, locationId)
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(limit);
      
    return NextResponse.json({ purchaseOrders: pos });
  } catch(error) {
    console.error('Error fetching POs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json();
    const po = await createPurchaseOrder(actor, body);

    // Fetch org template for WhatsApp messaging
    let whatsappPoTemplate: string | null = null;
    if (body.organizationId) {
      const [org] = await db
        .select({ whatsappPoTemplate: organizations.whatsappPoTemplate })
        .from(organizations)
        .where(eq(organizations.id, body.organizationId));
      whatsappPoTemplate = org?.whatsappPoTemplate || null;
    }

    return NextResponse.json({ purchaseOrder: po, whatsappPoTemplate }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error('Error creating PO:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
