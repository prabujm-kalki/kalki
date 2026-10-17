import fs from 'fs';

const filePath = 'src/db/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find salesInvoices table
const salesInvoicesStart = content.indexOf('export const salesInvoices = pgTable("b2b_sales_invoices"');
if (salesInvoicesStart === -1) {
  throw new Error("salesInvoices table not found in schema.ts");
}

const grandTotalIndex = content.indexOf('grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),', salesInvoicesStart);
if (grandTotalIndex === -1) {
  throw new Error("grandTotal in salesInvoices not found");
}

const target = 'grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),';
const replacement = `grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
  advancePaid: decimal("advance_paid", { precision: 12, scale: 2 }).default("0.00").notNull(),
  balanceDue: decimal("balance_due", { precision: 12, scale: 2 }),`;

const before = content.slice(0, grandTotalIndex);
const after = content.slice(grandTotalIndex + target.length);

content = before + replacement + after;
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected advancePaid and balanceDue into salesInvoices (b2b_sales_invoices)!');
