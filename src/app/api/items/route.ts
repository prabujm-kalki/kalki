import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { items, vendorItems, vendors } from '@/db/schema';
import { requireAuthenticatedUser } from '@/lib/authorization';
import { z } from 'zod';

const itemSchema = z.object({
  nameEn: z.string().min(1),
  nameTa: z.string().min(1),
  nameHi: z.string().min(1),
  currentPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  unit: z.string().min(1),
  baseMinStock: z.number().nonnegative(),
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
  vendorIds: z.array(z.string().uuid()).min(1, 'At least one vendor is required'),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const locationId = searchParams.get('locationId');
    if (!organizationId || !locationId) {
      return NextResponse.json({ error: 'Missing organizationId or locationId' }, { status: 400 });
    }

    const fetchedItems = await db.select()
      .from(items)
      .where(and(
        eq(items.organizationId, organizationId),
        eq(items.locationId, locationId),
        eq(items.isActive, true)
      ))
      .orderBy(desc(items.createdAt));

    return NextResponse.json({ items: fetchedItems });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = itemSchema.parse(body);

    const organizationId = parsed.organizationId;
    const locationId = parsed.locationId;

    const result = await db.transaction(async (tx) => {
      const [newItem] = await tx.insert(items).values({
        organizationId,
        locationId,
        nameEn: parsed.nameEn,
        nameTa: parsed.nameTa,
        nameHi: parsed.nameHi,
        currentPrice: parsed.currentPrice.toString(),
        maxPrice: parsed.maxPrice.toString(),
        unit: parsed.unit,
        baseMinStock: parsed.baseMinStock.toString(),
        orderFrequency: parsed.orderFrequency,
        fridaySurge: parsed.fridaySurge?.toString() || '0',
        saturdaySurge: parsed.saturdaySurge?.toString() || '0',
        isActive: parsed.isActive,
      }).returning({ id: items.id });

      // Link vendors
      if (parsed.vendorIds.length > 0) {
        const vendorLinks = parsed.vendorIds.map(vendorId => ({
          organizationId,
          locationId,
          vendorId,
          itemId: newItem.id,
          itemName: parsed.nameEn, // Sync item name for legacy/denormalized reference
          unitOfMeasure: parsed.unit,
        }));
        await tx.insert(vendorItems).values(vendorLinks);
      }

      return newItem;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
