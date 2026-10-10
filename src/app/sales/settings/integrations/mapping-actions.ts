"use server"

import { db } from "@/db";
import { posChannelMappings, salesChannels, tmbillConfigs, tmbillOrders } from "@/db/schema";
import { sql } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
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

export async function getPosMappings(organizationId: string) {
  try {
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
      .where(eq(posChannelMappings.organizationId, organizationId));
    
    return { success: true, mappings };
  } catch (error) {
    console.error("Error fetching POS mappings:", error);
    return { success: false, error: "Failed to fetch mappings" };
  }
}

export async function upsertPosMapping(organizationId: string, payload: { providerName: string, externalString: string, internalChannelId: string }) {
  try {
    const strings = payload.externalString.split(',').map(s => s.trim()).filter(Boolean);
    for (const str of strings) {
      const existing = await db.select().from(posChannelMappings).where(
        and(
          eq(posChannelMappings.organizationId, organizationId),
          eq(posChannelMappings.providerName, payload.providerName),
          eq(posChannelMappings.externalString, str)
        )
      );

      if (existing.length > 0) {
        await db.update(posChannelMappings)
          .set({ internalChannelId: payload.internalChannelId, updatedAt: new Date() })
          .where(eq(posChannelMappings.id, existing[0].id));
      } else {
        await db.insert(posChannelMappings).values({
          organizationId,
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



export async function getConfiguredProviders(organizationId: string) {
  try {
    const configs = await db.select({ providerName: tmbillConfigs.providerName }).from(tmbillConfigs).where(eq(tmbillConfigs.organizationId, organizationId));
    const providers = configs.map(c => c.providerName).filter(Boolean);
    return { success: true, providers: Array.from(new Set(providers)) };
  } catch (error) {
    console.error('Error fetching providers:', error);
    return { success: false, providers: ['TMBILL'] };
  }
}

export async function fetchUnmappedStrings(organizationId: string, providerName: string) {
  try {
    if ((providerName || '').toUpperCase() === 'TMBILL') {
      const result = await db.execute(sql`
        SELECT DISTINCT raw_data->>'table_name' as ext_string 
        FROM ${tmbillOrders} 
        WHERE organization_id = ${organizationId}
          AND raw_data->>'table_name' IS NOT NULL
      `);
      
      const existingMappings = await db.select({ externalString: posChannelMappings.externalString })
        .from(posChannelMappings)
        .where(
          and(
            eq(posChannelMappings.organizationId, organizationId),
            eq(posChannelMappings.providerName, providerName)
          )
        );
      
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
