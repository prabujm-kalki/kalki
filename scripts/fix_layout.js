const fs = require('fs');

let c = fs.readFileSync('src/app/public/po/[token]/page.tsx', 'utf8');

c = c.replace(/<th style={{ textAlign: 'right', padding: '8px' }}>Rate<\/th>\s*<th style={{ textAlign: 'right', padding: '8px' }}>Amount<\/th>/g, '');
c = c.replace(/<td style={{ textAlign: 'right', padding: '8px' }}>{new Intl\.NumberFormat\('en-IN', { style: 'currency', currency: 'INR' }\)\.format\(Number\(line\.unitRate\)\)}<\/td>\s*<td style={{ textAlign: 'right', padding: '8px' }}>{new Intl\.NumberFormat\('en-IN', { style: 'currency', currency: 'INR' }\)\.format\(Number\(line\.orderedQuantity\) \* Number\(line\.unitRate\)\)}<\/td>/g, '');
c = c.replace(/<tfoot>[\s\S]*?<\/tfoot>/g, '');

fs.writeFileSync('src/app/public/po/[token]/page.tsx', c);
