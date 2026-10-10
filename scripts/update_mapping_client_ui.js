const fs = require('fs');
let code = fs.readFileSync('src/components/integrations/MappingClient.tsx', 'utf8');

if (!code.includes('getConfiguredProviders')) {
  code = code.replace(
    'import { upsertPosMapping, deletePosMapping, createSalesChannel, deleteSalesChannel } from \'@/app/sales/settings/integrations/mapping-actions\';',
    'import { upsertPosMapping, deletePosMapping, createSalesChannel, deleteSalesChannel, getConfiguredProviders, fetchUnmappedStrings } from \'@/app/sales/settings/integrations/mapping-actions\';\nimport { useEffect } from "react";'
  );

  code = code.replace(
    'const [isDeletingChannel, setIsDeletingChannel] = useState(false);',
    `const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [unmappedStrings, setUnmappedStrings] = useState<string[]>([]);
  const [isFetchingStrings, setIsFetchingStrings] = useState(false);

  useEffect(() => {
    getConfiguredProviders(organizationId).then(res => {
      if (res.success && res.providers) {
        setConfiguredProviders(res.providers);
        if (res.providers.length > 0 && !providerName) {
          setProviderName(res.providers[0]);
        }
      }
    });
  }, [organizationId]);

  const handleFetchStrings = async () => {
    if (!providerName) return;
    setIsFetchingStrings(true);
    const res = await fetchUnmappedStrings(organizationId, providerName);
    if (res.success && res.data) {
      setUnmappedStrings(res.data);
    }
    setIsFetchingStrings(false);
  };
`
  );

  code = code.replace(
    /<input[\s\n]*type="text"[\s\n]*placeholder="e\.g\. TMBILL"[\s\n]*value=\{providerName\}[\s\n]*onChange=\{e => setProviderName\(e\.target\.value\)\}[\s\n]*style=\{\{[^}]+\}\}[\s\n]*required[\s\n]*\/>/g,
    `<select 
              value={providerName} 
              onChange={e => setProviderName(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
              required
            >
              <option value="" disabled>Select Provider...</option>
              {configuredProviders.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              {!configuredProviders.includes('TMBILL') && <option value="TMBILL">TMBILL</option>}
            </select>`
  );

  code = code.replace(
    /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '6px' \}\}>[\s\n]*<label style=\{\{ fontSize: '13px', fontWeight: '500', color: '#475569' \}\}>External Text String<\/label>[\s\n]*<input[\s\n]*type="text"[\s\n]*placeholder="e\.g\. DineIn"[\s\n]*value=\{externalString\}[\s\n]*onChange=\{e => setExternalString\(e\.target\.value\)\}[\s\n]*style=\{\{[^}]+\}\}[\s\n]*required[\s\n]*\/>[\s\n]*<\/div>/g,
    `<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              External Text String
              <button 
                type="button" 
                onClick={handleFetchStrings}
                disabled={isFetchingStrings || !providerName}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >
                {isFetchingStrings ? 'Fetching...' : 'Fetch Data'}
              </button>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <input 
                type="text" 
                placeholder="e.g. DineIn" 
                value={externalString} 
                onChange={e => setExternalString(e.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '100%' }}
                required
              />
              {unmappedStrings.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {unmappedStrings.map(str => (
                    <span 
                      key={str} 
                      onClick={() => setExternalString(str)}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}
                    >
                      {str}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>`
  );

  fs.writeFileSync('src/components/integrations/MappingClient.tsx', code);
}
console.log('done');
