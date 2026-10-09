const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

// Replace the invoice error banner
const oldInvoiceError = `              {invoiceError && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fca5a5', fontSize: '14px', fontWeight: '500' }}>
                  {invoiceError}
                </div>
              )}`;

const newInvoiceError = `              {invoiceError && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, padding: '16px 24px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '6px solid #ef4444', borderTop: '1px solid #fca5a5', borderRight: '1px solid #fca5a5', borderBottom: '1px solid #fca5a5', fontSize: '16px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', animation: 'slideIn 0.3s ease-out forwards' }}>
                  {invoiceError}
                </div>
              )}`;

// Replace the invoice success banner
const oldInvoiceSuccess = `              {invoiceSuccess && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0', fontSize: '14px', fontWeight: '500' }}>
                  <CheckCircle size={18} /> {invoiceSuccess}
                </div>
              )}`;

const newInvoiceSuccess = `              {invoiceSuccess && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, padding: '16px 24px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '6px solid #22c55e', borderTop: '1px solid #bbf7d0', borderRight: '1px solid #bbf7d0', borderBottom: '1px solid #bbf7d0', fontSize: '16px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', animation: 'slideIn 0.3s ease-out forwards' }}>
                  <CheckCircle size={24} /> {invoiceSuccess}
                </div>
              )}`;

code = code.replace(oldInvoiceError, newInvoiceError);
code = code.replace(oldInvoiceSuccess, newInvoiceSuccess);

// Replace the customer error/success banners which might also be small inline ones
const oldCustomerError = `{customerError && <div style={{ marginBottom: '16px', padding: '10px', background: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '13px', fontWeight: '500', border: '1px solid #fca5a5' }}>{customerError}</div>}`;
const newCustomerError = `{customerError && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10000, padding: '16px 24px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '6px solid #ef4444', borderTop: '1px solid #fca5a5', borderRight: '1px solid #fca5a5', borderBottom: '1px solid #fca5a5', fontSize: '16px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
                  {customerError}
                </div>
              )}`;

const oldCustomerSuccess = `{customerSuccess && <div style={{ marginBottom: '16px', padding: '10px', background: '#f0fdf4', color: '#22c55e', borderRadius: '6px', fontSize: '13px', fontWeight: '500', border: '1px solid #86efac' }}>{customerSuccess}</div>}`;
const newCustomerSuccess = `{customerSuccess && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10000, padding: '16px 24px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '6px solid #22c55e', borderTop: '1px solid #bbf7d0', borderRight: '1px solid #bbf7d0', borderBottom: '1px solid #bbf7d0', fontSize: '16px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
                  <CheckCircle size={24} /> {customerSuccess}
                </div>
              )}`;

code = code.replace(oldCustomerError, newCustomerError);
code = code.replace(oldCustomerSuccess, newCustomerSuccess);

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Banners updated to fixed positioning at top right with bolder font.');
