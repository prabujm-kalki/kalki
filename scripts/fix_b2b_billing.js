const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

// 1. Add state variables
code = code.replace(
  'const [message, setMessage] = useState("");',
  'const [message, setMessage] = useState("");\n    const [customerError, setCustomerError] = useState("");\n    const [customerSuccess, setCustomerSuccess] = useState("");'
);

// 2. Replace handleCreateCustomer
const oldHandleCreateCustomer = `    const handleCreateCustomer = async () => {
      if (!scope?.organizationId) return;
      if (!newCustomer.name || !newCustomer.phone) return alert("Customer Name and Phone Number are required");
      try {
        const created = await addCustomer(scope.organizationId, newCustomer);
        setDbCustomers([...dbCustomers, created]);
        setCustomer({ id: created.id, name: created.name, gstin: created.taxId || "", address: created.address || "" });
        setIsAddingCustomer(false);
        setNewCustomer({ name: "", gstin: "", address: "", email: "", phone: "" });
      } catch (err) {
        alert("Error adding customer. Check console.");
        console.error(err);
      }
    };`;

const newHandleCreateCustomer = `    const handleCreateCustomer = async () => {
      setCustomerError("");
      setCustomerSuccess("");
      if (!scope?.organizationId) return;
      
      if (!newCustomer.name || !newCustomer.name.trim()) {
        return setCustomerError("Business Name is required");
      }
      const phoneDigits = newCustomer.phone?.replace(/\\D/g, '') || '';
      if (phoneDigits.length !== 10) {
        return setCustomerError("Mobile number must be exactly 10 digits");
      }

      try {
        const created = await addCustomer(scope.organizationId, newCustomer);
        setDbCustomers([...dbCustomers, created]);
        setCustomer({ id: created.id, name: created.name, gstin: created.taxId || "", address: created.address || "" });
        
        setCustomerSuccess("Customer saved successfully!");
        setTimeout(() => {
          setIsAddingCustomer(false);
          setNewCustomer({ name: "", gstin: "", address: "", email: "", phone: "" });
          setCustomerSuccess("");
        }, 1500);
      } catch (err) {
        setCustomerError("Failed to add customer. Please try again.");
        console.error(err);
      }
    };`;
code = code.replace(oldHandleCreateCustomer, newHandleCreateCustomer);

// 3. Add success/error to Modal UI
const oldModalH3 = `            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Create New Customer
              <button onClick={() => setIsAddingCustomer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>&times;</button>
            </h3>`;
const newModalH3 = `            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Create New Customer
              <button onClick={() => { setIsAddingCustomer(false); setCustomerError(""); setCustomerSuccess(""); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>&times;</button>
            </h3>
            {customerError && <div style={{ marginBottom: '16px', padding: '10px', background: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '13px', fontWeight: '500', border: '1px solid #fca5a5' }}>{customerError}</div>}
            {customerSuccess && <div style={{ marginBottom: '16px', padding: '10px', background: '#f0fdf4', color: '#22c55e', borderRadius: '6px', fontSize: '13px', fontWeight: '500', border: '1px solid #86efac' }}>{customerSuccess}</div>}`;
code = code.replace(oldModalH3, newModalH3);

// 4. Update addItemLine
const oldAddItemLine = `    const addItemLine = () => {
      setItemsList([...itemsList, { uid: Date.now(), id: "", name: "", hsn: "", qty: 1, rate: 0, discountPercent: 0, taxRate: 18, amount: 0, unit: "PCS" }]);
    };`;
const newAddItemLine = `    const addItemLine = () => {
      const newUid = Date.now();
      setItemsList([...itemsList, { uid: newUid, id: "", name: "", hsn: "", qty: 1, rate: 0, discountPercent: 0, taxRate: 18, amount: 0, unit: "PCS" }]);
      setTimeout(() => {
        const el = document.getElementById("item-select-" + newUid);
        if (el) el.focus();
      }, 50);
    };`;
code = code.replace(oldAddItemLine, newAddItemLine);

// 5. Add id to select
const oldSelect = `<select 
                            className="kalki-select"
                            value={item.id}`;
const newSelect = `<select 
                            id={"item-select-" + item.uid}
                            className="kalki-select"
                            value={item.id}`;
code = code.replace(oldSelect, newSelect);

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Modified B2BBilling.tsx');
