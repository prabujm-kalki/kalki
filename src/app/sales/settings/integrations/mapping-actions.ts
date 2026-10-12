"use server"

import { db } from "@/db";
import { posChannelMappings, salesChannels, tmbillConfigs, tmbillOrders } from "@/db/schema";
import { sql, eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSalesChannels(organizationId: string) {
  try {
    const channels = await db
      .select({
        id: salesChannels.id,
        name: salesChannels.name,
      })
      .from(salesChannels)
      .where(and(eq(salesChannels.organizationId, organizationId), eq(salesChannels.isActive, true)));
    
    return { success: true, channels };
  } catch (error) {
    console.error("Error fetching sales channels:", error);
    return { success: false, error: "Failed to fetch channels" };
  }
}

export async function getPosMappings(organizationId: string, locationId?: string | null) {
  try {
    const conditions = [eq(posChannelMappings.organizationId, organizationId)];
    if (locationId && locationId !== "all" && locationId !== "null" && locationId !== "undefined") {
      conditions.push(sql`(${posChannelMappings.locationId} IS NULL OR ${posChannelMappings.locationId} = ${locationId})`);
    }

    const mappings = await db
      .select({
        id: posChannelMappings.id,
        providerName: posChannelMappings.providerName,
        externalString: posChannelMappings.externalString,
        internalChannelId: posChannelMappings.internalChannelId,
        internalChannelName: salesChannels.name,
      })
      .from(posChannelMappings)
      .leftJoin(salesChannels, eq(posChannelMappings.internalChannelId, salesChannels.id))
      .where(and(...conditions));
    
    return { success: true, mappings };
  } catch (error) {
    console.error("Error fetching POS mappings:", error);
    return { success: false, error: "Failed to fetch mappings" };
  }
}

export async function upsertPosMapping(
  organizationId: string, 
  payload: { providerName: string, externalString: string, internalChannelId: string, locationId?: string | null }
) {
  try {
    const locId = (payload.locationId && payload.locationId !== "all" && payload.locationId !== "null" && payload.locationId !== "undefined")
      ? payload.locationId
      : null;

    const strings = payload.externalString.split(',').map(s => s.trim()).filter(Boolean);
    for (const str of strings) {
      const condition = locId
        ? and(
            eq(posChannelMappings.organizationId, organizationId),
            eq(posChannelMappings.locationId, locId),
            eq(posChannelMappings.providerName, payload.providerName),
            eq(posChannelMappings.externalString, str)
          )
        : and(
            eq(posChannelMappings.organizationId, organizationId),
            isNull(posChannelMappings.locationId),
            eq(posChannelMappings.providerName, payload.providerName),
            eq(posChannelMappings.externalString, str)
          );

      const existing = await db.select().from(posChannelMappings).where(condition);

      if (existing.length > 0) {
        await db.update(posChannelMappings)
          .set({ internalChannelId: payload.internalChannelId, updatedAt: new Date() })
          .where(eq(posChannelMappings.id, existing[0].id));
      } else {
        await db.insert(posChannelMappings).values({
          organizationId,
          locationId: locId,
          providerName: payload.providerName,
          externalString: str,
          internalChannelId: payload.internalChannelId,
        });
      }
    }

    revalidatePath("/sales/settings/integrations");
    return { success: true };
  } catch (error) {
    console.error("Error upserting mapping:", error);
    return { success: false, error: "Failed to save mapping" };
  }
}

export async function deletePosMapping(organizationId: string, id: string) {
  try {
    await db.delete(posChannelMappings).where(
      and(
        eq(posChannelMappings.organizationId, organizationId),
        eq(posChannelMappings.id, id)
      )
    );

    revalidatePath("/sales/settings/integrations");
    return { success: true };
  } catch (error) {
    console.error("Error deleting mapping:", error);
    return { success: false, error: "Failed to delete mapping" };
  }
}

export async function createSalesChannel(organizationId: string, name: string) {
  try {
    await db.insert(salesChannels).values({
      organizationId,
      name,
      type: 'B2C',
      isActive: true,
    });
    revalidatePath(`/sales/settings/integrations`);
    return { success: true };
  } catch (error) {
    console.error("Error creating sales channel:", error);
    return { success: false, error: "Failed to create channel" };
  }
}

export async function deleteSalesChannel(organizationId: string, id: string) {
  try {
    // Attempt hard delete (will fail if there are FK constraints, which is good for safety)
    await db.delete(salesChannels).where(
      and(
        eq(salesChannels.organizationId, organizationId),
        eq(salesChannels.id, id)
      )
    );
    revalidatePath('/sales/settings/integrations');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting sales channel:', error);
    // 23503 is postgres foreign key violation code
    if (error.code === '23503') {
       return { success: false, error: 'Cannot delete this channel because it is already mapped or in use by invoices.' };
    }
    return { success: false, error: 'Failed to delete channel' };
  }
}

export async function getConfiguredProviders(organizationId: string, locationId?: string | null) {
  try {
    if (locationId && locationId !== "all" && locationId !== "null" && locationId !== "undefined") {
      const locConfigs = await db
        .select({ providerName: tmbillConfigs.providerName })
        .from(tmbillConfigs)
        .where(and(eq(tmbillConfigs.organizationId, organizationId), eq(tmbillConfigs.locationId, locationId)));
      
      const locProviders = locConfigs.map(c => c.providerName).filter((p): p is string => Boolean(p));
      if (locProviders.length > 0) {
        return { success: true, providers: Array.from(new Set(locProviders)) };
      }
    }

    const configs = await db
      .select({ providerName: tmbillConfigs.providerName })
      .from(tmbillConfigs)
      .where(and(eq(tmbillConfigs.organizationId, organizationId), isNull(tmbillConfigs.locationId)));
    
    const providers = configs.map(c => c.providerName).filter((p): p is string => Boolean(p));
    return { success: true, providers: Array.from(new Set(providers)) };
  } catch (error) {
    console.error('Error fetching providers:', error);
    return { success: false, providers: ['TMBILL'] };
  }
}

export async function fetchUnmappedStrings(organizationId: string, providerName: string, locationId?: string | null) {
  try {
    const pUpper = (providerName || '').trim().toUpperCase();
    const isTMBill = pUpper.includes('TMBILL');
    
    if (isTMBill) {
      const locCondition = (locationId && locationId !== "all" && locationId !== "null" && locationId !== "undefined")
        ? sql`AND location_id = ${locationId}`
        : sql``;

      const result = await db.execute(sql`
        SELECT DISTINCT raw_data->>'table_name' as ext_string 
        FROM ${tmbillOrders} 
        WHERE organization_id = ${organizationId}
          ${locCondition}
          AND raw_data->>'table_name' IS NOT NULL
      `);
      
      const mappingConditions = [
        eq(posChannelMappings.organizationId, organizationId),
        eq(posChannelMappings.providerName, providerName)
      ];
      if (locationId && locationId !== "all" && locationId !== "null" && locationId !== "undefined") {
        mappingConditions.push(sql`(${posChannelMappings.locationId} IS NULL OR ${posChannelMappings.locationId} = ${locationId})`);
      }

      const existingMappings = await db.select({ externalString: posChannelMappings.externalString })
        .from(posChannelMappings)
        .where(and(...mappingConditions));
      
      const mappedSet = new Set(existingMappings.map(m => m.externalString));
      const unmapped = result.rows.map(r => r.ext_string as string).filter(s => !mappedSet.has(s));
      
      return { success: true, data: unmapped };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching unmapped strings:', error);
    return { success: false, error: 'Failed to fetch data' };
  }
}
