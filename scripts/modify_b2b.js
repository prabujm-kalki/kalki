const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

code = code.replace(
  'if (!newCustomer.name) return alert("Customer Name is required");',
  'if (!newCustomer.name || !newCustomer.phone) return alert("Customer Name and Phone Number are required");'
);

const oldInlineForm = `            {isAddingCustomer ? (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Business Name *</label>
                    <input type="text" className="kalki-input" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="e.g. Acme Corp" style={{ width: '100%', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>GSTIN</label>
                    <input type="text" className="kalki-input" value={newCustomer.gstin} onChange={e => setNewCustomer({...newCustomer, gstin: e.target.value})} placeholder="29ABCDE1234F1Z5" style={{ width: '100%', borderRadius: '6px' }} />
                  </div>
                </div>
                <button onClick={handleCreateCustomer} className="kalki-button kalki-button--primary" style={{ padding: '8px 16px', borderRadius: '6px' }}>Save Customer</button>
              </div>
            ) : (`;
const newInlineForm = ``;

code = code.replace(oldInlineForm, newInlineForm);

const oldClose = `              </div>
            )}`;
const newClose = `              </div>`;
code = code.replace(oldClose, newClose);

const oldBtn = `              <button 
                onClick={() => setIsAddingCustomer(!isAddingCustomer)}
                style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {isAddingCustomer ? 'Cancel' : <><Plus size={16}/> Add New Customer</>}
              </button>`;
const newBtn = `              <button 
                onClick={() => setIsAddingCustomer(true)}
                style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16}/> Add New Customer
              </button>`;
code = code.replace(oldBtn, newBtn);

const modalCode = `
      {isAddingCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Create New Customer
              <button onClick={() => setIsAddingCustomer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>&times;</button>
            </h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Customer Name *</label>
                  <input type="text" className="kalki-input" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="e.g. Acme Corp" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Phone Number *</label>
                  <input type="text" className="kalki-input" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="+91 9876543210" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>GSTIN (Optional)</label>
                <input type="text" className="kalki-input" value={newCustomer.gstin} onChange={e => setNewCustomer({...newCustomer, gstin: e.target.value})} placeholder="29ABCDE1234F1Z5" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Email (Optional)</label>
                <input type="email" className="kalki-input" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="billing@acmecorp.com" style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Billing Address (Optional)</label>
                <textarea className="kalki-input" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="123 Business Road..." style={{ width: '100%', borderRadius: '6px', padding: '8px 12px', border: '1px solid #cbd5e1', minHeight: '60px' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setIsAddingCustomer(false)} style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleCreateCustomer} className="kalki-button kalki-button--primary" style={{ padding: '8px 16px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

code = code.replace(
`    </div>
  );
}`,
modalCode
);

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Modified B2BBilling.tsx');
