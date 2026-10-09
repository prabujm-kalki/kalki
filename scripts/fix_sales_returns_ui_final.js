const fs = require('fs');
let content = fs.readFileSync('src/components/sales/SalesReturns.tsx', 'utf-8');

// 1. Update imports
content = content.replace(
  'fetchSalesReturns, fetchSalesReturnDetails } from "@/app/sales/actions";',
  'fetchSalesReturns, fetchSalesReturnDetails, approveSalesReturn } from "@/app/sales/actions";'
);
if(!content.includes('MoreVertical')) {
  content = content.replace('Eye } from "lucide-react";', 'Eye, MoreVertical } from "lucide-react";');
}

// 2 & 3. Update state and helper
const stateBlockTarget = `  const [viewReturnDetails, setViewReturnDetails] = useState<any>(null);`;
const stateBlockReplacement = `  const [viewReturnDetails, setViewReturnDetails] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewInvoiceDetails, setViewInvoiceDetails] = useState<any>(null);

  const resetNewReturnModal = () => {
    setSelectedInvoiceId("");
    setReturnItems([]);
    setReturnReason("Damaged Item");
    setShowNewReturnModal(false);
  };

  const handleApproveDraft = async (id: string) => {
    try {
      await approveSalesReturn(id);
      alert("Return approved.");
      loadReturns();
    } catch(e) {
      console.error(e);
      alert("Failed to approve");
    }
    setActionMenuOpen(null);
  };
  
  const handleViewOriginalInvoice = async () => {
    if (!viewReturnDetails?.invoiceId) return;
    const details = await fetchInvoiceDetails(viewReturnDetails.invoiceId);
    setViewInvoiceDetails(details);
    setShowInvoiceModal(true);
  };
`;
if (!content.includes('actionMenuOpen')) {
  content = content.replace(stateBlockTarget, stateBlockReplacement);
}

// 4. Update handleSaveReturn to use isSaving and resetNewReturnModal
const handleSaveReturnRegex = /const handleSaveReturn = async \(\s*status:\s*string\s*\) => \{[\s\S]*?alert\("Sales return created successfully\."\);[\s\S]*?setShowNewReturnModal\(false\);/;
content = content.replace(handleSaveReturnRegex, `const handleSaveReturn = async (status: string) => {
    if (isSaving) return;
    if (!selectedInvoiceId) return alert("Please select an invoice.");
    if (returnItems.filter(item => item.returnQty > 0).length === 0) return alert("Please select at least one item to return.");
    
    setIsSaving(true);
    try {
      const result = await createSalesReturn({
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        invoiceId: selectedInvoiceId,
        returnDate,
        reason: returnReason,
        status,
        items: returnItems,
        totalAmount: calculateTotalCredit()
      });
      if (result.success) {
        alert("Sales return created successfully.");
        resetNewReturnModal();`);
        
content = content.replace(
  `} catch (e: any) {`,
  `} catch (e: any) {`
);
content = content.replace(
  `alert(e.message || "Failed to create return");\n    }\n  };`,
  `alert(e.message || "Failed to create return");\n    } finally {\n      setIsSaving(false);\n    }\n  };`
);

// also replace cancel button to reset
content = content.replace(
  `onClick={() => setShowNewReturnModal(false)}`,
  `onClick={() => resetNewReturnModal()}`
);
content = content.replace( // header close
  `onClick={() => setShowNewReturnModal(false)}`,
  `onClick={() => resetNewReturnModal()}`
);

// 5. Update Invoice link in Modal
content = content.replace(
  `onClick={() => { if(viewReturnDetails.invoiceNumber) window.location.href = \`/sales/invoices/all?search=\${viewReturnDetails.invoiceNumber}\`; }}`,
  `onClick={handleViewOriginalInvoice}`
);

// 6. Replace action button with dropdown
const actionButtonRegex = /<button onClick=\{\(\) => handleViewReturn\(ret\.id\)\} style=\{\{ background: "none", border: "none", color: "#2563eb", cursor: "pointer" \}\}>\s*<Eye size=\{18\} \/>\s*<\/button>/g;
const newActions = `<div style={{ position: "relative" }}>
                    <button onClick={() => setActionMenuOpen(actionMenuOpen === ret.id ? null : ret.id)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
                      <MoreVertical size={18} />
                    </button>
                    {actionMenuOpen === ret.id && (
                      <div style={{ position: "absolute", right: "0", top: "100%", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.375rem", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 10, width: "120px", display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
                        <button onClick={() => { handleViewReturn(ret.id); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>View Details</button>
                        {ret.status === 'DRAFT' && (
                           <button onClick={() => handleApproveDraft(ret.id)} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#16a34a" }}>Approve</button>
                        )}
                        <button onClick={() => { alert("Printing..."); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>Print</button>
                      </div>
                    )}
                  </div>`;
content = content.replace(actionButtonRegex, newActions);

// Ensure the old FileText button gets replaced if it was still there
const oldActionButtonRegex = /<button style=\{\{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" \}\}>\s*<FileText size=\{18\} \/>\s*<\/button>/g;
content = content.replace(oldActionButtonRegex, newActions);


// 7. Append Invoice Modal JSX
const invoiceModal = `
      {/* View Original Invoice Modal */}
      {showInvoiceModal && viewInvoiceDetails && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", width: "100%", maxWidth: "700px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>Invoice Details: {viewInvoiceDetails.invoiceNumber}</h2>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: "1.5rem", overflowY: "auto" }}>
               <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>
                    <tr>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Item Name</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Qty</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Price</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: "#374151" }}>
                    {viewInvoiceDetails.items?.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem" }}>{item.description}</td>
                        <td style={{ padding: "0.75rem" }}>{item.qty}</td>
                        <td style={{ padding: "0.75rem" }}>₹ {item.rate}</td>
                        <td style={{ padding: "0.75rem" }}>₹ {item.total}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
            <div style={{ padding: "1.5rem", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowInvoiceModal(false)} style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", backgroundColor: "white", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(/(?=\s*<\/div>\s*\)\;\s*\}\s*$)/, invoiceModal);

fs.writeFileSync('src/components/sales/SalesReturns.tsx', content);
