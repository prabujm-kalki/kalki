import { db } from "@/db";
import { purchaseDebitNotes, vendors } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import DebitNotesClient from "./DebitNotesClient";

export default async function DebitNotesPage() {
  const notes = await db.select({
    id: purchaseDebitNotes.id,
    noteNumber: purchaseDebitNotes.noteNumber,
    noteDate: purchaseDebitNotes.noteDate,
    amount: purchaseDebitNotes.amount,
    reason: purchaseDebitNotes.reason,
    status: purchaseDebitNotes.status,
    vendorName: vendors.name
  })
  .from(purchaseDebitNotes)
  .leftJoin(vendors, eq(purchaseDebitNotes.vendorId, vendors.id))
  .orderBy(desc(purchaseDebitNotes.createdAt));

  const allVendors = await db.select().from(vendors);

  return (
    <div className="kalki-module-container">
      <div className="kalki-section-header">
        <h1 className="kalki-page-title">Debit Notes</h1>
        <p className="kalki-page-description">
          Create and manage debit notes against vendor invoices for returns or adjustments.
        </p>
      </div>
      <DebitNotesClient initialNotes={notes} vendors={allVendors} />
    </div>
  );
}
