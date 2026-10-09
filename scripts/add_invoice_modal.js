const fs = require('fs');
let code = fs.readFileSync('src/app/sales/invoices/all/page.tsx', 'utf8');

// 1. Update imports
const importTarget = `import { fetchInvoices } from "@/app/sales/actions";`;
const importReplacement = `import { fetchInvoices, fetchInvoiceDetails } from "@/app/sales/actions";\nimport { X, Printer } from "lucide-react";`;
if (!code.includes('fetchInvoiceDetails')) {
  code = code.replace(importTarget, importReplacement);
}

// 2. Add state
const stateTarget = `const [loading, setLoading] = useState(true);`;
const stateReplacement = `const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  const handleViewDetails = async (id: string) => {
    setModalLoading(true);
    setSelectedInvoice({ id, loading: true });
    try {
      const data = await fetchInvoiceDetails(id);
      setSelectedInvoice(data);
    } catch (err) {
      console.error(err);
      setSelectedInvoice(null);
    } finally {
      setModalLoading(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };`;
if (!code.includes('selectedInvoice')) {
  code = code.replace(stateTarget, stateReplacement);
}

// 3. Update onClick handlers
const buttonEye = `<button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#3b82f6'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }} title="View Details">`;
const buttonEyeNew = `<button onClick={() => handleViewDetails(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#3b82f6'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }} title="View Details">`;

const buttonDownload = `<button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#3b82f6'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }} title="Download PDF">`;
const buttonDownloadNew = `<button onClick={() => handleViewDetails(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#3b82f6'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }} title="Download PDF">`;

if (!code.includes('onClick={() => handleViewDetails(inv.id)}')) {
  code = code.replace(buttonEye, buttonEyeNew);
  code = code.replace(buttonDownload, buttonDownloadNew);
}

// 4. Inject Modal at the bottom
const modalUI = `
      {selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
                {selectedInvoice.loading ? 'Loading Invoice...' : \`Invoice #\${selectedInvoice.invoiceNumber}\`}
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                {!selectedInvoice.loading && (
                  <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#0f172a', cursor: 'pointer' }}>
                    <Printer size={16} /> Print
                  </button>
                )}
                <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {selectedInvoice.loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading invoice details...</div>
              ) : (
                <div id="invoice-print-area">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Billed To</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{selectedInvoice.customerName}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>GSTIN: {selectedInvoice.customerGstin}</p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{selectedInvoice.billingAddress}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Invoice Details</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>Invoice No: <span style={{ fontWeight: '500', color: '#0f172a' }}>{selectedInvoice.invoiceNumber}</span></p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>Date: <span style={{ fontWeight: '500', color: '#0f172a' }}>{selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : ''}</span></p>
                    </div>
                  </div>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '13px', color: '#64748b' }}>Description</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Qty</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Rate</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>GST %</th>
                        <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 0', fontSize: '14px', color: '#0f172a' }}>{item.description}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>{item.qty}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>₹ {item.rate.toFixed(2)}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569' }}>{item.gstRate}%</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '300px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#475569' }}>Subtotal</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {parseFloat(selectedInvoice.subtotalAmount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#475569' }}>Tax Amount</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>₹ {parseFloat(selectedInvoice.taxAmount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Grand Total</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>₹ {parseFloat(selectedInvoice.grandTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>`;

const targetEnd = `    </div>
  );
}`;

if (!code.includes('id="invoice-print-area"')) {
  code = code.replace(targetEnd, modalUI + '\n  );\n}');
  fs.writeFileSync('src/app/sales/invoices/all/page.tsx', code);
  console.log('Added modal UI to page');
} else {
  console.log('Modal UI already added.');
}
