const fs = require('fs');
let code = fs.readFileSync('src/app/sales/settings/integrations/mapping-actions.ts', 'utf8');

const regex = /export async function upsertPosMapping[\s\S]*?revalidatePath\("\/sales\/settings\/integrations"\);\n    return \{ success: true \};\n  \} catch \(error\) \{\n    console.error\("Error upserting mapping:", error\);\n    return \{ success: false, error: "Failed to save mapping" \};\n  \}\n\}/;

const replacement = `export async function upsertPosMapping(organizationId: string, payload: { providerName: string, externalString: string, internalChannelId: string }) {
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
}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/sales/settings/integrations/mapping-actions.ts', code);
console.log('done');
