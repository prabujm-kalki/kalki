const fs = require('fs');

let code = fs.readFileSync('src/components/integrations/TMBillConfig.tsx', 'utf8');

// 1. Add import for TMBillSyncPanel
if (!code.includes('TMBillSyncPanel')) {
  code = code.replace(
    'import { updatePrimarySalesSource, testTMBillConnection } from "@/app/sales/config-actions";',
    'import { updatePrimarySalesSource, testTMBillConnection } from "@/app/sales/config-actions";\nimport { TMBillSyncPanel } from "@/components/integrations/TMBillSyncPanel";'
  );
}

// 2. Add the panel to the JSX
const insertPoint = `      </KalkiCard>
      </>
      )}`;

const replacement = `      </KalkiCard>
      
      <div style={{ marginTop: "1rem" }}>
        <TMBillSyncPanel organizationId={scope.organizationId} locationId={scope.locationId} />
      </div>
      </>
      )}`;

if (!code.includes('<TMBillSyncPanel')) {
  code = code.replace(insertPoint, replacement);
}

fs.writeFileSync('src/components/integrations/TMBillConfig.tsx', code);
console.log('Added TMBillSyncPanel to TMBillConfig UI');
