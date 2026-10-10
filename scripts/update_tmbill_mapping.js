const fs = require('fs');
let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

if (!code.includes('posChannelMappings')) {
  code = code.replace(
    'import { eq, and, sql } from "drizzle-orm";',
    'import { eq, and, sql, inArray } from "drizzle-orm";\nimport { posChannelMappings } from "@/db/schema";'
  );
}

const replaceTarget = `const invoiceId = randomUUID();
        const paymentStatus = (!order.paymentMode || order.paymentMode.toLowerCase() === "credit" || order.paymentMode.toLowerCase() === "unpaid") ? "PENDING" : "PAID";
        
        try {
          await tx.insert(salesInvoices).values({`;

const replaceWith = `const invoiceId = randomUUID();
        const paymentStatus = (!order.paymentMode || order.paymentMode.toLowerCase() === "credit" || order.paymentMode.toLowerCase() === "unpaid") ? "PENDING" : "PAID";
        
        // Find channel mapping
        let channelId = null;
        if (order.rawData && typeof order.rawData === 'object' && (order.rawData as any).table_name) {
           const extStr = (order.rawData as any).table_name;
           const mappings = await tx.select().from(posChannelMappings).where(
             and(
               eq(posChannelMappings.organizationId, this.organizationId),
               eq(posChannelMappings.providerName, 'TMBILL'),
               eq(posChannelMappings.externalString, extStr)
             )
           ).limit(1);
           if (mappings.length > 0) {
             channelId = mappings[0].internalChannelId;
           }
        }

        try {
          await tx.insert(salesInvoices).values({
          channelId,`;

code = code.replace(replaceTarget, replaceWith);

fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);
console.log('done');
