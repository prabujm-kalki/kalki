import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { items, vendorItems } from '@/db/schema';
import { requireAuthenticatedUser } from '@/lib/authorization';
import { z } from 'zod';

const itemSchema = z.object({
  nameEn: z.string().min(1, 'English name is required'),
  nameTa: z.string().optional().default(''),
  nameHi: z.string().optional().default(''),
  currentPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  unit: z.string().min(1),
  purchaseUnit: z.string().optional(),
  purchaseUnitConversion: z.number().positive().optional(),
  baseMinStock: z.number().nonnegative(),
  targetStock: z.number().nonnegative().optional(),
  orderFrequency: z.object({
    daily: z.boolean().optional(),
    mon: z.boolean().optional(),
    tue: z.boolean().optional(),
    wed: z.boolean().optional(),
    thu: z.boolean().optional(),
    fri: z.boolean().optional(),
    sat: z.boolean().optional(),
    sun: z.boolean().optional(),
    customIntervalDays: z.number().int().positive().optional(),
  }),
  fridaySurge: z.number().nonnegative().optional(),
  saturdaySurge: z.number().nonnegative().optional(),
  isActive: z.boolean(),
  isTrackable: z.boolean().optional().default(true),
  vendorIds: z.array(z.string().uuid()).min(1, 'At least one vendor is required'),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await params;
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const locationId = searchParams.get('locationId');
    if (!organizationId || !locationId) {
      return NextResponse.json({ error: 'Missing organizationId or locationId' }, { status: 400 });
    }

    const [item] = await db.select()
      .from(items)
      .where(and(
        eq(items.id, itemId),
        eq(items.organizationId, organizationId),
        eq(items.locationId, locationId)
      ));

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const linkedVendors = await db.select({ vendorId: vendorItems.vendorId })
      .from(vendorItems)
      .where(and(
        eq(vendorItems.itemId, item.id),
        eq(vendorItems.organizationId, organizationId),
        eq(vendorItems.locationId, locationId)
      ));

    return NextResponse.json({ item, vendorIds: linkedVendors.map(v => v.vendorId) });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await params;
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = itemSchema.parse(body);

    const organizationId = parsed.organizationId;
    const locationId = parsed.locationId;

    await db.transaction(async (tx) => {
      await tx.update(items)
        .set({
          nameEn: parsed.nameEn,
          nameTa: parsed.nameTa,
          nameHi: parsed.nameHi,
          currentPrice: parsed.currentPrice.toString(),
          maxPrice: parsed.maxPrice.toString(),
          unit: parsed.unit,
          purchaseUnit: parsed.purchaseUnit,
          purchaseUnitConversion: parsed.purchaseUnitConversion?.toString() ?? null,
          baseMinStock: parsed.baseMinStock.toString(),
          targetStock: parsed.targetStock?.toString() ?? null,
          orderFrequency: parsed.orderFrequency,
          fridaySurge: parsed.fridaySurge?.toString() || '0',
          saturdaySurge: parsed.saturdaySurge?.toString() || '0',
          isActive: parsed.isActive,
          isTrackable: parsed.isTrackable,
        })
        .where(and(
          eq(items.id, itemId),
          eq(items.organizationId, organizationId),
          eq(items.locationId, locationId)
        ));

      // Re-link vendors by deleting and re-inserting
      await tx.delete(vendorItems).where(eq(vendorItems.itemId, itemId));

      if (parsed.vendorIds.length > 0) {
        const vendorLinks = parsed.vendorIds.map(vendorId => ({
          organizationId,
          locationId,
          vendorId,
          itemId: itemId,
          itemName: parsed.nameEn,
          unitOfMeasure: parsed.unit,
        }));
        await tx.insert(vendorItems).values(vendorLinks);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
