const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

// Fix the state initialization if it wasn't caught
code = code.replace(
  'const [paymentTerms, setPaymentTerms] = useState("Immediate / Cash");',
  'const [paymentTerms, setPaymentTerms] = useState("Cash");'
);

// Fix the dropdown options using regex to grab the exact line
code = code.replace(
  /<option>Immediate \/ Cash<\/option>.*?<\/option>/,
  '<option value="Cash">Cash</option><option value="Credit">Credit</option>'
);

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Successfully updated the Payment Terms dropdown in the UI.');
