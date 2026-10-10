const fs = require('fs');
let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

const target1 = `let channelId = null;`;
const replacement1 = `
        // Find or create 'Unassigned' channel
        const unassignedChannels = await tx.select().from(salesChannels).where(
          and(
            eq(salesChannels.organizationId, this.organizationId),
            eq(salesChannels.name, 'Unassigned')
          )
        ).limit(1);
        
        let unassignedChannelId;
        if (unassignedChannels.length > 0) {
          unassignedChannelId = unassignedChannels[0].id;
        } else {
          unassignedChannelId = randomUUID();
          await tx.insert(salesChannels).values({
            id: unassignedChannelId,
            organizationId: this.organizationId,
            name: 'Unassigned',
            type: 'B2C',
            isActive: true
          });
        }
        
        let channelId = unassignedChannelId;`;

code = code.replace(target1, replacement1);

fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);
console.log('done');
