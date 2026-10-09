const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

// Fix parseFloat NaN bug
code = code.replace(/updateItemLine\(item.uid, "qty", parseFloat\(e\.target\.value\)\)/g, 'updateItemLine(item.uid, "qty", e.target.value === "" ? "" : parseFloat(e.target.value))');
code = code.replace(/updateItemLine\(item.uid, "rate", parseFloat\(e\.target\.value\)\)/g, 'updateItemLine(item.uid, "rate", e.target.value === "" ? "" : parseFloat(e.target.value))');
code = code.replace(/updateItemLine\(item.uid, "discountPercent", parseFloat\(e\.target\.value\)\)/g, 'updateItemLine(item.uid, "discountPercent", e.target.value === "" ? "" : parseFloat(e.target.value))');

// Fix Banners
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
              <button 
                onClick={handleSave} 
                disabled={isSubmitting}`;

if (code.includes(targetButtonStart) && !code.includes('CheckCircle size={18} /> {invoiceSuccess}')) {
    code = code.replace(targetButtonStart, banners);
    console.log('Inserted banners!');
} else {
    console.log('Banners might already exist or target missing.');
}

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Fixes applied.');
