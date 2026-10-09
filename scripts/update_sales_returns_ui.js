const fs = require('fs');
let content = fs.readFileSync('src/components/sales/SalesReturns.tsx', 'utf-8');

// Update imports
content = content.replace(
  'import { fetchInvoices, fetchInvoiceDetails, createSalesReturn } from "@/app/sales/actions";',
  'import { fetchInvoices, fetchInvoiceDetails, createSalesReturn, fetchSalesReturns, fetchSalesReturnDetails } from "@/app/sales/actions";\nimport { Eye } from "lucide-react";'
);

// Add new state variables
const stateInsertion = `  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [realReturnsList, setRealReturnsList] = useState<any[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewReturnDetails, setViewReturnDetails] = useState<any>(null);

  const loadReturns = () => {
    if (selected) {
      fetchSalesReturns(selected.organizationId, selected.locationId).then(setRealReturnsList);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [selected]);
  
  const handleViewReturn = async (id: string) => {
    const details = await fetchSalesReturnDetails(id);
    setViewReturnDetails(details);
    setShowViewModal(true);
  };
`;
content = content.replace('  const [returnItems, setReturnItems] = useState<any[]>([]);', stateInsertion);

// Update load returns on successful creation
content = content.replace('// TODO: Refresh returns list', 'loadReturns();');

// Replace Dummy Data for Table
const dummyDataRegex = /\/\/ Dummy Data for Table[\s\S]*?\];/;
content = content.replace(dummyDataRegex, '// Data now fetched from DB into realReturnsList');

// Replace map mapping
content = content.replace(/returnsList\.map/g, 'realReturnsList.map');
content = content.replace(/idx !== returnsList\.length/g, 'idx !== realReturnsList.length');

// Make Return ID clickable and map right fields
content = content.replace(
  /<td style={{ padding: "1rem 0\.75rem", fontWeight: "500", color: "#2563eb" }}>{ret\.id}<\/td>/g,
  '<td style={{ padding: "1rem 0.75rem", fontWeight: "500", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }} onClick={() => handleViewReturn(ret.id)}>{ret.returnId}</td>'
);

// Replace actions icon with something clickable
content = content.replace(
  /<button style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>\s*<FileText size={18} \/>\s*<\/button>/g,
  '<button onClick={() => handleViewReturn(ret.id)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}><Eye size={18} /></button>'
);

// Append View Modal at the end, just before the last </div>
const viewModalCode = `
      {/* View Return Details Modal */}
      {showViewModal && viewReturnDetails && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>Return Details: {viewReturnDetails.returnNumber}</h2>
              <button onClick={() => setShowViewModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                <div><strong>Original Invoice:</strong> <span style={{color: "#2563eb", textDecoration: "underline", cursor:"pointer"}}>{viewReturnDetails.invoiceNumber || 'N/A'}</span></div>
                <div><strong>Return Date:</strong> {new Date(viewReturnDetails.returnDate).toLocaleDateString()}</div>
                <div><strong>Customer:</strong> {viewReturnDetails.customerName}</div>
                <div><strong>Status:</strong> {viewReturnDetails.status}</div>
                <div><strong>Reason:</strong> {viewReturnDetails.reason || 'N/A'}</div>
              </div>
              
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", color: "#4b5563", textTransform: "uppercase" }}>
                    <tr>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Item Name</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Return Qty</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600" }}>Price</th>
                      <th style={{ padding: "0.75rem", fontWeight: "600", textAlign: "center" }}>Added to Inventory</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: "0.875rem", color: "#374151" }}>
                    {viewReturnDetails.items?.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: idx !== viewReturnDetails.items.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "0.75rem", fontWeight: "500" }}>{item.description}</td>
                        <td style={{ padding: "0.75rem" }}>{item.returnQty}</td>
                        <td style={{ padding: "0.75rem" }}>₹ {item.unitPrice}</td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          {item.addToInventory ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: "1.5rem", borderTop: "1px solid #f3f4f6", backgroundColor: "#f9fafb", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowViewModal(false)}
                style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", color: "#374151", backgroundColor: "white", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(/(?=\s*<\/div>\s*\)\;\s*\}\s*$)/, viewModalCode);

fs.writeFileSync('src/components/sales/SalesReturns.tsx', content);
