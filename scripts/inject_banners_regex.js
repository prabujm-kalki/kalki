const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

const banners = `{invoiceError && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fca5a5', fontSize: '14px', fontWeight: '500' }}>
                  {invoiceError}
                </div>
              )}
              {invoiceSuccess && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0', fontSize: '14px', fontWeight: '500' }}>
                  <CheckCircle size={18} /> {invoiceSuccess}
                </div>
              )}\n`;

// Only add if not present
if (!code.includes('CheckCircle size={18} /> {invoiceSuccess}')) {
    code = code.replace(/(<button[^>]*onClick=\{handleSave\}[^>]*>)/, banners + '$1');
    fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
    console.log('Banners injected via Regex!');
}
