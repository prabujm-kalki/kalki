const fs = require('fs');

let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

// Update state initialization
code = code.replace(
  'const [paymentTerms, setPaymentTerms] = useState("Immediate / Cash");',
  'const [paymentTerms, setPaymentTerms] = useState("Cash");'
);

// Update dropdown options
const oldDropdown = `<select 
                      value={paymentTerms} 
                      onChange={e => setPaymentTerms(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                    >
                      <option value="Immediate / Cash">Immediate / Cash</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Custom">Custom</option>
                    </select>`;
                    
const newDropdown = `<select 
                      value={paymentTerms} 
                      onChange={e => setPaymentTerms(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit</option>
                    </select>`;

code = code.replace(oldDropdown, newDropdown);

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Updated Payment Terms to only Cash and Credit.');
