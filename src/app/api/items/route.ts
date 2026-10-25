import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { items, vendorItems, vendors, itemCategories, itemSubcategories } from '@/db/schema';
import { requireAuthenticatedUser } from '@/lib/authorization';
import { z } from 'zod';

const itemSchema = z.object({
  nameEn: z.string().min(1, 'English name is required'),
  nameTa: z.string().optional().default(''),
  nameHi: z.string().optional().default(''),
  currentPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  unit: z.string().min(1),
  purchaseUnit: z.string().optional().nullable(),
  purchaseUnitConversion: z.number().positive().optional().nullable(),
  prepUnit: z.string().optional().nullable(),
  prepUnitConversion: z.number().positive().optional().nullable(),
  roundToWhole: z.boolean().optional().default(false),
  baseMinStock: z.number().nonnegative(),
  targetStock: z.number().nonnegative().optional(),
  replenishmentStrategy: z.string().optional().default('top_up'),
  reorderQuantity: z.number().nonnegative().optional(),
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
  itemType: z.enum(['RAW_MATERIAL', 'EXPENSE', 'MENU_ITEM']).optional().default('RAW_MATERIAL'),
  categoryId: z.string().uuid().optional().nullable(),
  subcategoryId: z.string().uuid().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const locationId = searchParams.get('locationId');
    const itemType = searchParams.get('itemType'); // 'RAW_MATERIAL', 'EXPENSE', 'MENU_ITEM', 'ALL'
    if (!organizationId || !locationId) {
      return NextResponse.json({ error: 'Missing organizationId or locationId' }, { status: 400 });
    }

    const conditions = [
      eq(items.organizationId, organizationId),
      eq(items.locationId, locationId),
      eq(items.isActive, true)
    ];

    if (itemType && itemType !== 'ALL') {
      conditions.push(eq(items.itemType, itemType));
    }

    const fetchedItems = await db.select({
      id: items.id,
      organizationId: items.organizationId,
      locationId: items.locationId,
      nameEn: items.nameEn,
      nameTa: items.nameTa,
      nameHi: items.nameHi,
      currentPrice: items.currentPrice,
      maxPrice: items.maxPrice,
      unit: items.unit,
      purchaseUnit: items.purchaseUnit,
      purchaseUnitConversion: items.purchaseUnitConversion,
      prepUnit: items.prepUnit,
      prepUnitConversion: items.prepUnitConversion,
      baseMinStock: items.baseMinStock,
      targetStock: items.targetStock,
      replenishmentStrategy: items.replenishmentStrategy,
      reorderQuantity: items.reorderQuantity,
      orderFrequency: items.orderFrequency,
      fridaySurge: items.fridaySurge,
      saturdaySurge: items.saturdaySurge,
      isActive: items.isActive,
      isTrackable: items.isTrackable,
      itemType: items.itemType,
      categoryId: items.categoryId,
      categoryName: itemCategories.name,
      subcategoryId: items.subcategoryId,
      subcategoryName: itemSubcategories.name,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
      .from(items)
      .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
      .leftJoin(itemSubcategories, eq(items.subcategoryId, itemSubcategories.id))
      .where(and(...conditions))
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
        purchaseUnit: parsed.purchaseUnit,
        purchaseUnitConversion: parsed.purchaseUnitConversion?.toString(),
        prepUnit: parsed.prepUnit,
        prepUnitConversion: parsed.prepUnitConversion?.toString(),
        roundToWhole: parsed.roundToWhole,
        baseMinStock: parsed.baseMinStock.toString(),
        targetStock: parsed.targetStock?.toString(),
        replenishmentStrategy: parsed.replenishmentStrategy,
        reorderQuantity: parsed.reorderQuantity?.toString(),
        orderFrequency: parsed.orderFrequency,
        fridaySurge: parsed.fridaySurge?.toString() || '0',
        saturdaySurge: parsed.saturdaySurge?.toString() || '0',
        isActive: parsed.isActive,
        isTrackable: parsed.isTrackable,
        itemType: parsed.itemType || 'RAW_MATERIAL',
        categoryId: parsed.categoryId || null,
        subcategoryId: parsed.subcategoryId || null,
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
