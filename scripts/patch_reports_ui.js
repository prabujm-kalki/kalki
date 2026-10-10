const fs = require('fs');

function patchPage(filepath, fetchFuncName, addFetchChannels = true) {
  let code = fs.readFileSync(filepath, 'utf8');

  // Add fetchOrgChannels to imports
  if (!code.includes('fetchOrgChannels')) {
    code = code.replace(
      new RegExp(`import \\{.*?${fetchFuncName}.*?\\} from \"../actions\";`),
      (match) => match.replace('}', ', fetchOrgChannels }')
    );
    // If it wasn't added by the above regex (e.g., multiline or different format)
    if (!code.includes('fetchOrgChannels')) {
       code = code.replace(
         `import { ${fetchFuncName}`,
         `import { fetchOrgChannels, ${fetchFuncName}`
       );
    }
  }

  // Add state
  if (!code.includes('const [channels, setChannels]')) {
    code = code.replace(
      'const [locations, setLocations] = useState<any[]>([]);',
      'const [locations, setLocations] = useState<any[]>([]);\n  const [channels, setChannels] = useState<any[]>([]);'
    );
  }

  // Fetch channels in useEffect
  if (!code.includes('fetchOrgChannels(scope.organizationId)')) {
    code = code.replace(
      /const locs = await fetchOrgLocations\(scope\.organizationId\);\s+setLocations\(locs\);/,
      `const locs = await fetchOrgLocations(scope.organizationId);\n        setLocations(locs);\n        const chans = await fetchOrgChannels(scope.organizationId);\n        setChannels(chans);`
    );
  }

  // Get currentChannel from searchParams
  if (!code.includes('currentChannel')) {
    code = code.replace(
      'const currentLocation = searchParams.get("locationId") || "all";',
      'const currentLocation = searchParams.get("locationId") || "all";\n  const currentChannel = searchParams.get("channelId") || "all";'
    );
  }

  // Add to effect dependencies
  code = code.replace(
    /currentLocation, currentRange, currentFrom, currentTo, page, currentSearch(?!, currentChannel)/,
    'currentLocation, currentChannel, currentRange, currentFrom, currentTo, page, currentSearch'
  );

  // Update fetch call
  // Match `fetchCustomerWiseReportData(scope.organizationId, currentLocation, currentFrom, currentTo, page, 15, currentSearch)`
  // Or `fetchSalesReportData(...)`
  // Replace based on function name
  const regex = new RegExp(`${fetchFuncName}\\(.*?\\)`, 'g');
  code = code.replace(regex, (match) => {
    // If it already has currentChannel, ignore
    if (match.includes('currentChannel')) return match;
    // For fetchItemWiseReportData, it has categoryId as 3rd param
    if (fetchFuncName === 'fetchItemWiseReportData') {
      return match.replace(
        'currentSearch',
        'currentSearch, currentChannel'
      );
    }
    // For sales and customer reports
    return match.replace(
      'currentSearch',
      'currentSearch, currentChannel'
    );
  });

  // Add UI dropdown next to location dropdown
  if (!code.includes('updateParam("channelId"')) {
    code = code.replace(
      `<select 
              value={currentLocation} 
              onChange={(e) => updateParam("locationId", e.target.value)}`,
      `<select 
              value={currentChannel} 
              onChange={(e) => updateParam("channelId", e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none", fontSize: "14px", color: "#334155", backgroundColor: "white", minWidth: "150px" }}
            >
              <option value="all">All Categories</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
            <select 
              value={currentLocation} 
              onChange={(e) => updateParam("locationId", e.target.value)}`
    );
  }

  fs.writeFileSync(filepath, code);
}

try {
  patchPage('src/app/sales/reports/sales/page.tsx', 'fetchSalesReportData');
  patchPage('src/app/sales/reports/customer/page.tsx', 'fetchCustomerWiseReportData');
  patchPage('src/app/sales/reports/item-wise/page.tsx', 'fetchItemWiseReportData');
} catch (e) {
  console.error(e);
}
console.log('done');
