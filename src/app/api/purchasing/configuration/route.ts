import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/authorization';
import { db } from '@/db';
import { purchaseRoutingConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');
    const locationId = url.searchParams.get('locationId');

    if (!organizationId || !locationId) {
       return NextResponse.json({ error: 'organizationId and locationId required' }, { status: 400 });
    }

    const configs = await db.select().from(purchaseRoutingConfigs).where(and(eq(purchaseRoutingConfigs.organizationId, organizationId), eq(purchaseRoutingConfigs.locationId, locationId))).limit(1);
    
    return NextResponse.json({ config: configs[0] || null });
  } catch(error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { organizationId, locationId, targetRoleId } = body;

    if (!organizationId || !locationId || !targetRoleId) {
       return NextResponse.json({ error: 'organizationId, locationId, targetRoleId required' }, { status: 400 });
    }

    const configs = await db.select().from(purchaseRoutingConfigs).where(and(eq(purchaseRoutingConfigs.organizationId, organizationId), eq(purchaseRoutingConfigs.locationId, locationId))).limit(1);

    if (configs.length > 0) {
      await db.update(purchaseRoutingConfigs).set({ targetRoleId, updatedAt: new Date() }).where(eq(purchaseRoutingConfigs.id, configs[0].id));
    } else {
      await db.insert(purchaseRoutingConfigs).values({ organizationId, locationId, targetRoleId });
    }
    
    return NextResponse.json({ success: true });
  } catch(error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
