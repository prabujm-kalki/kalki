import { db } from "@/db";
import { vendors, purchaseBills, supplierInvoices, payments, purchasePayments, purchaseDebitNotes, journalEntries, journalLineItems, accounts, purchasePaymentAllocations } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

export async function getVendorBalances(organizationId: string) {
  const query = await db
    .select({
      vendorId: vendors.id,
      vendorName: vendors.name,
      totalBilled: sql<number>`COALESCE(SUM(${supplierInvoices.totalAmount}), 0)`.as('totalBilled'),
      totalPayments: sql<number>`
        (SELECT COALESCE(SUM(amount), 0) FROM ${payments} WHERE vendor_id = ${vendors.id})
      `.as('totalPayments'),
      totalDebitNotes: sql<number>`
        (SELECT COALESCE(SUM(amount), 0) FROM ${purchaseDebitNotes} WHERE vendor_id = ${vendors.id})
      `.as('totalDebitNotes'),
      currentBalance: sql<number>`
        COALESCE(SUM(${supplierInvoices.totalAmount}), 0) - 
        (SELECT COALESCE(SUM(amount), 0) FROM ${payments} WHERE vendor_id = ${vendors.id}) - 
        (SELECT COALESCE(SUM(amount), 0) FROM ${purchaseDebitNotes} WHERE vendor_id = ${vendors.id})
      `.as('currentBalance')
    })
    .from(vendors)
    .leftJoin(supplierInvoices, eq(vendors.id, supplierInvoices.vendorId))
    .where(eq(vendors.organizationId, organizationId))
    .groupBy(vendors.id);

  return query;
}

export async function createVendorPayment(input: {
  organizationId: string;
  locationId: string;
  vendorId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdById: string;
  allocations: { billId: string; amountApplied: number }[];
}) {
  return await db.transaction(async (tx) => {
    const paymentNumber = "PAY-" + Date.now().toString().slice(-6);

    // 1. Create Payment Record
    const [payment] = await tx.insert(purchasePayments).values({
      organizationId: input.organizationId,
      locationId: input.locationId,
      vendorId: input.vendorId,
      paymentNumber,
      paymentDate: new Date(),
      amount: input.amount.toString(),
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes
    }).returning();

    // 2. Create Allocations
    if (input.allocations && input.allocations.length > 0) {
      await tx.insert(purchasePaymentAllocations).values(
        input.allocations.map(a => ({
          paymentId: payment.id,
          billId: a.billId,
          amountApplied: a.amountApplied.toString()
        }))
      );
    }

    // 3. Find System Accounts
    const systemAccounts = await tx.select().from(accounts).where(and(
      eq(accounts.organizationId, input.organizationId),
      eq(accounts.isSystemAccount, true)
    ));

    const apAccount = systemAccounts.find(a => a.controlAccountType === 'ACCOUNTS_PAYABLE');
    const cashAccount = systemAccounts.find(a => a.controlAccountType === 'CASH_AND_BANK' || a.controlAccountType === 'CASH');

    if (!apAccount || !cashAccount) {
      throw new Error("Critical system accounts (AP or CASH) are not configured.");
    }

    // 4. Create Double-Entry Journal
    const entryNumber = "JE-PAY-" + Date.now().toString().slice(-6);
    
    const [journalEntry] = await tx.insert(journalEntries).values({
      organizationId: input.organizationId,
      entryNumber,
      entryDate: new Date().toISOString().split('T')[0],
      narration: `Vendor Payment ${paymentNumber}`,
      sourceModule: "PAYABLES",
      sourceReferenceId: payment.id,
      totalAmount: input.amount.toString(),
      status: "POSTED",
      createdById: input.createdById
    }).returning();

    await tx.insert(journalLineItems).values([
      { // DEBIT AP
        journalEntryId: journalEntry.id,
        accountId: apAccount.id,
        locationId: input.locationId,
        partyId: input.vendorId,
        partyType: "VENDOR",
        debit: input.amount.toString(),
        credit: "0",
        narration: "Vendor Payment Issued"
      },
      { // CREDIT CASH/BANK
        journalEntryId: journalEntry.id,
        accountId: cashAccount.id,
        locationId: input.locationId,
        partyId: input.vendorId,
        partyType: "VENDOR",
        debit: "0",
        credit: input.amount.toString(),
        narration: "Cash Outflow"
      }
    ]);

    return payment;
  });
}

export async function getPayments(organizationId: string) {
  const query = await db
    .select({
      id: purchasePayments.id,
      paymentNumber: purchasePayments.paymentNumber,
      paymentDate: purchasePayments.paymentDate,
      amount: purchasePayments.amount,
      paymentMethod: purchasePayments.paymentMethod,
      referenceNumber: purchasePayments.referenceNumber,
      vendorId: purchasePayments.vendorId,
      vendorName: vendors.name,
    })
    .from(purchasePayments)
    .leftJoin(vendors, eq(purchasePayments.vendorId, vendors.id))
    .where(eq(purchasePayments.organizationId, organizationId))
    .orderBy(sql`${purchasePayments.paymentDate} DESC`);
    
  return query;
}
export async function createPurchaseBill(input: {
  organizationId: string;
  locationId: string;
  vendorId: string;
  billNumber: string;
  vendorInvoiceNumber?: string;
  totalAmount: number;
  taxAmount: number;
  subtotal: number;
  dueDate: Date;
  createdById: string;
}) {
  return await db.transaction(async (tx) => {
    // 1. Create Bill Record
    const [bill] = await tx.insert(purchaseBills).values({
      organizationId: input.organizationId,
      locationId: input.locationId,
      vendorId: input.vendorId,
      billNumber: input.billNumber,
      vendorInvoiceNumber: input.vendorInvoiceNumber,
      billDate: new Date(),
      dueDate: input.dueDate,
      subtotal: input.subtotal.toString(),
      taxAmount: input.taxAmount.toString(),
      totalAmount: input.totalAmount.toString(),
      status: 'open'
    }).returning();

    // 2. Find System Accounts
    const systemAccounts = await tx.select().from(accounts).where(and(
      eq(accounts.organizationId, input.organizationId),
      eq(accounts.isSystemAccount, true)
    ));

    const apAccount = systemAccounts.find(a => a.controlAccountType === 'ACCOUNTS_PAYABLE');
    const expenseAccount = systemAccounts.find(a => a.controlAccountType === 'COGS' || a.controlAccountType === 'EXPENSE');

    if (!apAccount || !expenseAccount) {
      throw new Error("Critical system accounts (AP or COGS/EXPENSE) are not configured.");
    }

    // 3. Create Double-Entry Journal
    const entryNumber = "JE-BILL-" + Date.now().toString().slice(-6);
    
    const [journalEntry] = await tx.insert(journalEntries).values({
      organizationId: input.organizationId,
      entryNumber,
      entryDate: new Date().toISOString().split('T')[0],
      narration: `Purchase Bill ${input.billNumber}`,
      sourceModule: "PAYABLES",
      sourceReferenceId: bill.id,
      totalAmount: input.totalAmount.toString(),
      status: "POSTED",
      createdById: input.createdById
    }).returning();

    await tx.insert(journalLineItems).values([
      { // DEBIT EXPENSE/COGS
        journalEntryId: journalEntry.id,
        accountId: expenseAccount.id,
        locationId: input.locationId,
        debit: input.totalAmount.toString(),
        credit: "0",
        narration: "Purchase Expense"
      },
      { // CREDIT AP
        journalEntryId: journalEntry.id,
        accountId: apAccount.id,
        locationId: input.locationId,
        partyId: input.vendorId,
        partyType: "VENDOR",
        debit: "0",
        credit: input.totalAmount.toString(),
        narration: "Bill Generated"
      }
    ]);

    return bill;
  });
}
