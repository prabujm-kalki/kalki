const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

const targetButtonStart = `<button 
                onClick={handleSave} 
                disabled={isSubmitting}`;

const banners = `{invoiceError && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fca5a5', fontSize: '14px', fontWeight: '500' }}>
                  {invoiceError}
                </div>
              )}
              {invoiceSuccess && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0', fontSize: '14px', fontWeight: '500' }}>
                  <CheckCircle size={18} /> {invoiceSuccess}
                </div>
              )}
              `;

if (!code.includes('{invoiceSuccess && (')) {
    code = code.replace(targetButtonStart, banners + targetButtonStart);
    fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
    console.log('Inserted invoice success/error banners.');
} else {
    console.log('Banners already exist.');
}
