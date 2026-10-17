import fs from 'fs';

const filePath = 'src/app/sales/invoices/all/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `<div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Grand Total</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>₹ {parseFloat(selectedInvoice.grandTotal || 0).toFixed(2)}</span>
                      </div>`;

const replacement = `<div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Grand Total</span>
                        <span style={{ fontSize: parseFloat(selectedInvoice.advancePaid || 0) > 0 ? '16px' : '20px', fontWeight: '700', color: '#3b82f6' }}>₹ {parseFloat(selectedInvoice.grandTotal || 0).toFixed(2)}</span>
                      </div>
                      
                      {parseFloat(selectedInvoice.advancePaid || 0) > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: '#16a34a' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Advance Paid</span>
                            <span style={{ fontSize: '15px', fontWeight: '700' }}>- ₹ {parseFloat(selectedInvoice.advancePaid).toFixed(2)}</span>
                          </div>
                          <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '12px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance Due</span>
                            <span style={{ fontSize: '22px', fontWeight: '800' }}>
                              ₹ {parseFloat(selectedInvoice.balanceDue !== null && selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : (parseFloat(selectedInvoice.grandTotal || 0) - parseFloat(selectedInvoice.advancePaid || 0))).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, replacement.replace(/\r\n/g, '\n'));
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully updated Invoice View modal in all/page.tsx with Advance Paid & Balance Due rows!');
} else {
  console.log('Target not found in all/page.tsx');
}
