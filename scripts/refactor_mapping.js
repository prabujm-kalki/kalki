const fs = require('fs');

// 1. Move actions
let actions = fs.readFileSync('src/app/settings/sales/channels/actions.ts', 'utf8');
actions = actions.replace(/\/settings\/sales\/channels/g, '/sales/settings/integrations');
fs.writeFileSync('src/app/sales/settings/integrations/mapping-actions.ts', actions);

// 2. Move MappingClient
let client = fs.readFileSync('src/app/settings/sales/channels/MappingClient.tsx', 'utf8');
client = client.replace("from './actions'", "from '@/app/sales/settings/integrations/mapping-actions'");
fs.writeFileSync('src/components/integrations/MappingClient.tsx', client);

// 3. Delete old files
fs.unlinkSync('src/app/settings/sales/channels/MappingClient.tsx');
fs.unlinkSync('src/app/settings/sales/channels/actions.ts');
fs.unlinkSync('src/app/settings/sales/channels/page.tsx');
fs.rmdirSync('src/app/settings/sales/channels', { recursive: true });

// 4. Update GeneralSettings to remove card
let gs = fs.readFileSync('src/components/settings/GeneralSettings.tsx', 'utf8');
const cardStart = gs.indexOf('<div className="gs-card">');
const nextCardStart = gs.indexOf('<div className="gs-card">', cardStart + 1);
if (cardStart > -1 && nextCardStart > -1) {
    gs = gs.substring(0, cardStart) + gs.substring(nextCardStart);
    fs.writeFileSync('src/components/settings/GeneralSettings.tsx', gs);
}
console.log('Done moving and cleaning up.');
