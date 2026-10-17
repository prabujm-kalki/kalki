import fs from 'fs';

const filePath = 'src/components/sales/B2BBilling.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grand Total</span>
                <span style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#0f172a", letterSpacing: "-0.025em" }}>₹ {roundedGrandTotal.toFixed(2)}</span>
              </div>`;

const replacement = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grand Total</span>
                <span style={{ fontSize: "1.35rem", fontWeight: "bold", color: "#0f172a", letterSpacing: "-0.025em" }}>₹ {roundedGrandTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", color: "#059669" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>
                  Advance Paid
                  <input 
                    type="number" 
                    style={{ width: "80px", padding: "2px 6px", border: "1px solid #10b981", borderRadius: "4px", fontSize: "0.85rem" }} 
                    placeholder="₹" 
                    value={advancePaid || ""} 
                    onChange={e => setAdvancePaid(parseFloat(e.target.value) || 0)} 
                  />
                </span>
                <span style={{ fontWeight: 600, fontSize: "1rem" }}>- ₹ {advancePaid.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", paddingTop: "0.5rem", borderTop: "2px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em" }}>Balance Due</span>
                <span style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#dc2626", letterSpacing: "-0.025em" }}>₹ {Math.max(0, roundedGrandTotal - advancePaid).toFixed(2)}</span>
              </div>`;

// Normalize CRLF to LF for matching
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, replacement.replace(/\r\n/g, '\n'));
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully updated B2BBilling.tsx with Advance Paid input & Balance Due row!');
} else {
  console.log('Target not found in B2BBilling.tsx');
}
