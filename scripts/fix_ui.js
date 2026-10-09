const fs = require('fs');
let code = fs.readFileSync('src/components/integrations/TMBillConfig.tsx', 'utf8');

const target = `      </KalkiCard>
      </>
      )}`;
      
const replacement = `      </KalkiCard>
      <div style={{ marginTop: "1rem" }}>
        <TMBillSyncPanel organizationId={scope.organizationId} locationId={scope.locationId || undefined} />
      </div>
      </>
      )}`;

// Replace using a simple string replacement, ignoring \r
const targetRegex = /<\/KalkiCard>\s*<\/>\s*\)}/;
const replacementStr = `</KalkiCard>\n      <div style={{ marginTop: "1rem" }}>\n        <TMBillSyncPanel organizationId={scope.organizationId} locationId={scope.locationId || undefined} />\n      </div>\n      </>\n      )}`;

code = code.replace(targetRegex, replacementStr);
fs.writeFileSync('src/components/integrations/TMBillConfig.tsx', code);
console.log('Fixed UI in TMBillConfig.tsx');
