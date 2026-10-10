const fs = require('fs');

function addFetchChannels(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  if (!code.includes('fetchOrgChannels(scope')) {
    code = code.replace(
      /const locs = await fetchOrgLocations\(scope(\.?organizationId)?\);\s*if\s*\(active\)\s*setLocations\(locs\s*\|\|\s*\[\]\);/g,
      `const locs = await fetchOrgLocations(scope?.organizationId);
          if (active) {
            setLocations(locs || []);
            try {
              const chans = await fetchOrgChannels(scope?.organizationId);
              setChannels(chans || []);
            } catch(e) {}
          }`
    );
    // Alternate regex for sales/page.tsx or item-wise/page.tsx where it might lack `if (active)`
    if (!code.includes('fetchOrgChannels(scope')) {
      code = code.replace(
        /const locs = await fetchOrgLocations\(scope\?.organizationId\);\s*setLocations\(locs\);/g,
        `const locs = await fetchOrgLocations(scope?.organizationId);
          setLocations(locs || []);
          try {
            const chans = await fetchOrgChannels(scope?.organizationId);
            setChannels(chans || []);
          } catch(e) {}`
      );
    }
  }
  fs.writeFileSync(filepath, code);
}

addFetchChannels('src/app/sales/reports/customer/page.tsx');
addFetchChannels('src/app/sales/reports/sales/page.tsx');
addFetchChannels('src/app/sales/reports/item-wise/page.tsx');
console.log('done');
