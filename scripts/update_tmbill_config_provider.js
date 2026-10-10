const fs = require('fs');
let code = fs.readFileSync('src/components/integrations/TMBillConfig.tsx', 'utf8');

code = code.replace(
  'apiUrl: "https://api.tmbill.com/tp/v1",',
  'providerName: "TMBILL",\n    apiUrl: "https://api.tmbill.com/tp/v1",'
);

code = code.replace(
  '<label>API Base URL</label>',
  `<label>Provider Name</label>
              <input 
                type="text" 
                value={config.providerName || ""} 
                onChange={(e) => setConfig({ ...config, providerName: e.target.value })} 
                className="input" 
                placeholder="e.g. TMBILL"
              />
            </div>
            <div className="field">
              <label>API Base URL</label>`
);

fs.writeFileSync('src/components/integrations/TMBillConfig.tsx', code);
console.log('done');
