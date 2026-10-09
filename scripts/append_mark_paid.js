const fs = require('fs');
let content = fs.readFileSync('src/app/sales/actions.ts', 'utf8');

if (!content.includes('revalidatePath')) {
  content = content.replace('"use server";', '"use server";\nimport { revalidatePath } from "next/cache";');
}

const newAction = `
export async function markInvoiceAsPaid(invoiceId: string) {
  if (!invoiceId) throw new Error("Invoice ID required");
  
  await db.update(salesInvoices)
    .set({ paymentStatus: "PAID" })
    .where(eq(salesInvoices.id, invoiceId));
    
  revalidatePath('/sales/orders/pending');
  // Optional: revalidate completed route if it exists
  // revalidatePath('/sales/orders/completed'); 
  return { success: true };
}
`;

fs.writeFileSync('src/app/sales/actions.ts', content + newAction);
console.log('Done');
