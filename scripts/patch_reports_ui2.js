const fs = require('fs');

function patchPage(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');

  // Add fetchOrgChannels to imports
  if (!code.includes('fetchOrgChannels')) {
    code = code.replace(
      /import \{([^}]*?)fetchCustomerWiseReportData([^}]*?)\} from "\.\.\/actions";/,
      'import {$1fetchCustomerWiseReportData$2, fetchOrgChannels} from "../actions";'
    );
    code = code.replace(
      /import \{([^}]*?)fetchSalesReportData([^}]*?)\} from "\.\.\/actions";/,
      'import {$1fetchSalesReportData$2, fetchOrgChannels} from "../actions";'
    );
    code = code.replace(
      /import \{([^}]*?)fetchItemWiseReportData([^}]*?)\} from "\.\.\/actions";/,
      'import {$1fetchItemWiseReportData$2, fetchOrgChannels} from "../actions";'
    );
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
      'const locs = await fetchOrgLocations(scope.organizationId);\n        setLocations(locs);\n        const chans = await fetchOrgChannels(scope.organizationId);\n        setChannels(chans);'
    );
  }

  // Get currentChannel from searchParams
  if (!code.includes('currentChannel = searchParams.get("channelId")')) {
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

  // Update fetch calls to pass currentChannel
  code = code.replace(
    /fetchCustomerWiseReportData\(scope\.organizationId, currentLocation, currentFrom, currentTo, page, 15, currentSearch\)/,
    'fetchCustomerWiseReportData(scope.organizationId, currentLocation, currentFrom, currentTo, page, 15, currentSearch, currentChannel)'
  );
  code = code.replace(
    /fetchSalesReportData\(scope\.organizationId, currentLocation, currentFrom, currentTo, page, 15, currentSearch\)/,
    'fetchSalesReportData(scope.organizationId, currentLocation, currentFrom, currentTo, page, 15, currentSearch, currentChannel)'
  );
  code = code.replace(
    /fetchItemWiseReportData\(scope\.organizationId, currentLocation, currentCategory, currentFrom, currentTo, page, 15, currentSearch\)/,
    'fetchItemWiseReportData(scope.organizationId, currentLocation, currentCategory, currentFrom, currentTo, page, 15, currentSearch, currentChannel)'
  );

  // Add UI dropdown next to location dropdown
  if (!code.includes('updateParam("channelId"')) {
    const dropdownHtml = `<select 
            value={currentChannel} 
            onChange={(e) => updateParam("channelId", e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontSize: "14px", outline: "none", cursor: "pointer", minWidth: "160px" }}
          >
            <option value="all">All Categories</option>
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>
          `;
    
    // There are slightly different whitespace variations in each file
    code = code.replace(
      /<select\s+value=\{currentLocation\}\s+onChange=\{\(e\) => updateParam\("locationId", e\.target\.value\)\}/m,
      dropdownHtml + '<select\n            value={currentLocation}\n            onChange={(e) => updateParam("locationId", e.target.value)}'
    );
  }

  fs.writeFileSync(filepath, code);
}

patchPage('src/app/sales/reports/sales/page.tsx');
patchPage('src/app/sales/reports/customer/page.tsx');
patchPage('src/app/sales/reports/item-wise/page.tsx');
