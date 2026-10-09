const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

// 1. Rename 'message' to 'invoiceSuccess' and 'invoiceError'
code = code.replace(
  'const [message, setMessage] = useState("");',
  'const [invoiceSuccess, setInvoiceSuccess] = useState("");\n    const [invoiceError, setInvoiceError] = useState("");'
);

// 2. Rewrite handleCreateInvoice logic (which is attached to Generate Invoice button)
// Let's find the exact block for the invoice submit.
// It starts with:
// if (!customer.id) return alert("Please select a customer.");
// if (!itemsList[0].id) return alert("Please select at least one item.");

const oldValidation = `      if (!customer.id) return alert("Please select a customer.");
      if (!itemsList[0].id) return alert("Please select at least one item.");`;

const newValidation = `      setInvoiceError("");
      setInvoiceSuccess("");
      if (!customer.id) return setInvoiceError("Please select a customer.");
      if (itemsList.filter(i => i.id).length === 0) return setInvoiceError("Please select at least one item.");`;
code = code.replace(oldValidation, newValidation);

const oldSuccess = `        if (res.success) {
          setMessage("Invoice generated successfully: " + res.invoice.invoiceNumber);
          setItemsList([{ uid: Date.now(), id: "", name: "", hsn: "", qty: 1, rate: 0, discountPercent: 0, taxRate: 18, amount: 0, unit: "PCS" }]);
          setCustomer({ id: "", name: "", gstin: "", address: "" });
          setOverallDiscount(0);
          setTimeout(() => setMessage(""), 5000);
        }`;

const newSuccess = `        if (res.success) {
          setInvoiceSuccess("Invoice generated successfully: " + res.invoice.invoiceNumber);
          setItemsList([{ uid: Date.now(), id: "", name: "", hsn: "", qty: 1, rate: 0, discountPercent: 0, taxRate: 18, amount: 0, unit: "PCS" }]);
          setCustomer({ id: "", name: "", gstin: "", address: "" });
          setOverallDiscount(0);
          setTimeout(() => setInvoiceSuccess(""), 5000);
        }`;
code = code.replace(oldSuccess, newSuccess);

const oldCatch = `      } catch (err: any) {
        alert("Error generating invoice: " + err.message);
      }`;
const newCatch = `      } catch (err: any) {
        setInvoiceError("Error generating invoice: " + err.message);
      }`;
code = code.replace(oldCatch, newCatch);

// 3. Remove the old top-level banner
const oldTopBanner = `      {message && (
        <div style={{ padding: "16px", backgroundColor: "#ecfdf5", color: "#065f46", borderRadius: "12px", display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', border: '1px solid #a7f3d0', animation: 'fadeIn 0.3s ease-in-out' }}>
          <CheckCircle size={20} /> {message}
        </div>
      )}`;
code = code.replace(oldTopBanner, '');

// 4. Inject the new banners right above the Generate Invoice button
const oldButton = `              <button 
                onClick={handleCreateInvoice}
                disabled={isSubmitting} 
                style={{ width: '100%', marginTop: '24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: '600', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)', transition: 'transform 0.1s ease-in-out' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Save size={18} /> {isSubmitting ? "Processing..." : "Generate Invoice"}
              </button>`;

const newButton = `              {invoiceError && (
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
                onClick={handleCreateInvoice}
                disabled={isSubmitting} 
                style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: '600', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)', transition: 'transform 0.1s ease-in-out' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Save size={18} /> {isSubmitting ? "Processing..." : "Generate Invoice"}
              </button>`;
code = code.replace(oldButton, newButton);

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Fixed invoice feedback UI');
