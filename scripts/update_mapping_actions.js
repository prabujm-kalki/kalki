const fs = require('fs');
let code = fs.readFileSync('src/app/sales/settings/integrations/mapping-actions.ts', 'utf8');

if (!code.includes('tmbillConfigs')) {
  code = code.replace(
    'import { posChannelMappings, salesChannels } from "@/db/schema";',
    'import { posChannelMappings, salesChannels, tmbillConfigs, tmbillOrders } from "@/db/schema";\nimport { sql } from "drizzle-orm";'
  );

  code += `
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
      const result = await db.execute(sql\`
        SELECT DISTINCT raw_data->>'table_name' as ext_string 
        FROM \${tmbillOrders} 
        WHERE organization_id = \${organizationId}
          AND raw_data->>'table_name' IS NOT NULL
      \`);
      return { success: true, data: result.rows.map(r => r.ext_string) };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching unmapped strings:', error);
    return { success: false, error: 'Failed to fetch data' };
  }
}
`;
  fs.writeFileSync('src/app/sales/settings/integrations/mapping-actions.ts', code);
}
console.log('done');
