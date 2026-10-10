const fs = require('fs');

function fixFetchChannels(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  if (!code.includes('fetchOrgChannels(scope')) {
    // For sales/page.tsx
    code = code.replace(
      /if \(active\) setLocations\(locs\);/g,
      `if (active) {
            setLocations(locs || []);
            try {
              const chans = await fetchOrgChannels(scope?.organizationId);
              setChannels(chans || []);
            } catch(e) {}
          }`
    );
    // For item-wise/page.tsx
    code = code.replace(
      /setLocations\(locs\);\n\s*const chans = await fetchOrgChannels\(scope\?\.organizationId\);\n\s*setChannels\(chans\);/g,
      `setLocations(locs || []);
          try {
            const chans = await fetchOrgChannels(scope?.organizationId);
            setChannels(chans || []);
          } catch(e) {}`
    );
  }
  fs.writeFileSync(filepath, code);
}

fixFetchChannels('src/app/sales/reports/sales/page.tsx');
fixFetchChannels('src/app/sales/reports/item-wise/page.tsx');
console.log('done');
