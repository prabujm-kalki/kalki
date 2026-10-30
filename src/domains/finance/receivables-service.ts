import { db } from "@/db";
import { customers, salesInvoices, salesReceipts, salesCreditNotes, journalEntries, journalLineItems, accounts, salesReceiptAllocations, creditNoteApplications } from "@/db/schema";
import { eq, sql, and, gte, lte, ilike, or } from "drizzle-orm";

export async function getCustomerBalances(organizationId: string, searchQuery?: string, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;

  const baseWhere = [eq(customers.organizationId, organizationId)];
  if (searchQuery) {
    baseWhere.push(or(
      ilike(customers.name, `%${searchQuery}%`),
      ilike(customers.phone, `%${searchQuery}%`)
    )!);
  }
  const whereClause = and(...baseWhere);

  // We use Drizzle's sql template literal to calculate the balance dynamically
  const query = await db
    .select({
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
      totalInvoiced: sql<number>`COALESCE(SUM(${salesInvoices.totalAmount}), 0)`.as('totalInvoiced'),
      totalReceipts: sql<number>`
        (SELECT COALESCE(SUM(amount), 0) FROM ${salesReceipts} WHERE customer_id = ${customers.id})
      `.as('totalReceipts'),
      totalCreditNotes: sql<number>`
        (SELECT COALESCE(SUM(CAST(applied_amount AS NUMERIC)), 0) 
         FROM credit_note_applications 
         JOIN credit_notes ON credit_note_applications.credit_note_id = credit_notes.id 
         WHERE credit_notes.customer_id = ${customers.id})
      `.as('totalCreditNotes'),
      currentBalance: sql<number>`
        COALESCE(SUM(${salesInvoices.totalAmount}), 0) - 
        (SELECT COALESCE(SUM(amount), 0) FROM ${salesReceipts} WHERE customer_id = ${customers.id}) - 
        (SELECT COALESCE(SUM(CAST(applied_amount AS NUMERIC)), 0) 
         FROM credit_note_applications 
         JOIN credit_notes ON credit_note_applications.credit_note_id = credit_notes.id 
         WHERE credit_notes.customer_id = ${customers.id})
      `.as('currentBalance')
    })
    .from(customers)
    .leftJoin(salesInvoices, eq(customers.id, salesInvoices.customerId))
    .where(whereClause)
    .groupBy(customers.id)
    .limit(limit)
    .offset(offset);

  const countResult = await db.select({ count: sql<number>`count(distinct ${customers.id})` })
    .from(customers)
    .leftJoin(salesInvoices, eq(customers.id, salesInvoices.customerId))
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);

  return { data: query, total };
}

export async function getAgeingReport(organizationId: string, searchQuery?: string, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;

  const baseWhere = [
    eq(customers.organizationId, organizationId), 
    sql`(${salesInvoices.paymentStatus} != 'PAID' AND ${salesInvoices.status} != 'CANCELLED')`
  ];
  if (searchQuery) {
    baseWhere.push(ilike(customers.name, `%${searchQuery}%`));
  }
  const whereClause = and(...baseWhere);

  // Ageing buckets based on remaining amount (Total - Allocated Receipts)
  // Note: In PostgreSQL, (CURRENT_DATE - timestamp) yields an `interval`, so we cast dueDate to date: CURRENT_DATE - (due_date::date)
  const daysPastDue = sql`COALESCE(CURRENT_DATE - CAST(${salesInvoices.dueDate} AS DATE), 0)`;
  const query = await db
    .select({
      customerId: customers.id,
      customerName: customers.name,
      current: sql<number>`SUM(CASE WHEN ${daysPastDue} <= 30 THEN (${salesInvoices.totalAmount} - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)) ELSE 0 END)`,
      days31to60: sql<number>`SUM(CASE WHEN ${daysPastDue} > 30 AND ${daysPastDue} <= 60 THEN (${salesInvoices.totalAmount} - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)) ELSE 0 END)`,
      days61to90: sql<number>`SUM(CASE WHEN ${daysPastDue} > 60 AND ${daysPastDue} <= 90 THEN (${salesInvoices.totalAmount} - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)) ELSE 0 END)`,
      over90: sql<number>`SUM(CASE WHEN ${daysPastDue} > 90 THEN (${salesInvoices.totalAmount} - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)) ELSE 0 END)`
    })
    .from(customers)
    .innerJoin(salesInvoices, eq(customers.id, salesInvoices.customerId))
    .where(whereClause)
    .groupBy(customers.id)
    .limit(limit)
    .offset(offset);

  const countResult = await db.select({ count: sql<number>`count(distinct ${customers.id})` })
    .from(customers)
    .innerJoin(salesInvoices, eq(customers.id, salesInvoices.customerId))
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);

  return { data: query, total };
}

export async function createReceipt(input: {
  organizationId: string;
  locationId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdById: string;
  allocations: { invoiceId: string; amountApplied: number }[];
}) {
  return await db.transaction(async (tx) => {
    const receiptNumber = "REC-" + Date.now().toString().slice(-6);

    // 1. Create Receipt Record
    const [receipt] = await tx.insert(salesReceipts).values({
      organizationId: input.organizationId,
      locationId: input.locationId,
      customerId: input.customerId,
      receiptNumber,
      receiptDate: new Date(),
      amount: input.amount.toString(),
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes
    }).returning();

    // 2. Create Allocations
    if (input.allocations && input.allocations.length > 0) {
      await tx.insert(salesReceiptAllocations).values(
        input.allocations.map(a => ({
          receiptId: receipt.id,
          invoiceId: a.invoiceId,
          amountApplied: a.amountApplied.toString()
        }))
      );
    }

    // 3. Find System Accounts
    const allAccounts = await tx.select().from(accounts).where(
      eq(accounts.organizationId, input.organizationId)
    );

    const arAccount = allAccounts.find(a => 
      a.controlAccountType === 'ACCOUNTS_RECEIVABLE' || 
      a.controlAccountType === 'CUSTOMER_RECEIVABLE' ||
      a.code === '1210' ||
      a.code === 'AR-CTRL' ||
      a.name.toLowerCase().includes('accounts receivable')
    );
    const cashAccount = allAccounts.find(a => 
      a.controlAccountType === 'CASH_AND_BANK' || 
      a.controlAccountType === 'CASH' ||
      a.code === '1110' ||
      a.code === '1130' ||
      a.code === 'CASH-001' ||
      a.code === 'BANK-001' ||
      a.name.toLowerCase().includes('cash in hand') ||
      a.name.toLowerCase().includes('bank')
    );

    if (!arAccount || !cashAccount) {
      throw new Error("Critical system accounts (AR or CASH/BANK) are not configured.");
    }

    // 4. Create Double-Entry Journal
    const entryNumber = "JE-REC-" + Date.now().toString().slice(-6);
    
    const [journalEntry] = await tx.insert(journalEntries).values({
      organizationId: input.organizationId,
      entryNumber,
      entryDate: new Date().toISOString().split('T')[0],
      narration: `Customer Payment Receipt ${receiptNumber}`,
      sourceModule: "RECEIVABLES",
      sourceReferenceId: receipt.id,
      totalAmount: input.amount.toString(),
      status: "POSTED",
      createdById: input.createdById
    }).returning();

    await tx.insert(journalLineItems).values([
      { // DEBIT CASH
        journalEntryId: journalEntry.id,
        accountId: cashAccount.id,
        locationId: input.locationId,
        partyId: input.customerId,
        partyType: "CUSTOMER",
        debit: input.amount.toString(),
        credit: "0",
        narration: "Payment Received"
      },
      { // CREDIT AR
        journalEntryId: journalEntry.id,
        accountId: arAccount.id,
        locationId: input.locationId,
        partyId: input.customerId,
        partyType: "CUSTOMER",
        debit: "0",
        credit: input.amount.toString(),
        narration: "Clear Receivables"
      }
    ]);

    // 5. Update Invoice Status
    if (input.allocations && input.allocations.length > 0) {
      for (const alloc of input.allocations) {
        // Get total invoice amount
        const [inv] = await tx.select({ 
          totalAmount: salesInvoices.totalAmount 
        }).from(salesInvoices).where(eq(salesInvoices.id, alloc.invoiceId));
        
        if (inv) {
          const [sumRes] = await tx.select({ 
            totalAllocated: sql<number>`COALESCE(SUM(CAST(amount_applied AS NUMERIC)), 0)` 
          }).from(salesReceiptAllocations).where(eq(salesReceiptAllocations.invoiceId, alloc.invoiceId));
          
          const [cnRes] = await tx.select({
            totalCreditApplied: sql<number>`COALESCE(SUM(CAST(applied_amount AS NUMERIC)), 0)`
          }).from(creditNoteApplications).where(eq(creditNoteApplications.appliedToInvoiceId, alloc.invoiceId));

          const totalPaidOrCredited = Number(sumRes?.totalAllocated || 0) + Number(cnRes?.totalCreditApplied || 0);
          const totalInvAmount = Number(inv.totalAmount || 0);

          if (totalPaidOrCredited >= totalInvAmount) {
            await tx.update(salesInvoices).set({ 
              status: 'PAID',
              paymentStatus: 'PAID'
            }).where(eq(salesInvoices.id, alloc.invoiceId));
          } else if (totalPaidOrCredited > 0) {
            await tx.update(salesInvoices).set({ 
              paymentStatus: 'PARTIAL'
            }).where(eq(salesInvoices.id, alloc.invoiceId));
          }
        }
      }
    }

    return receipt;
  });
}

export async function getReceipts(organizationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: Date, endDate?: Date) {
  const offset = (page - 1) * limit;

  let startObj: Date | undefined = undefined;
  if (startDate) {
    startObj = new Date(startDate);
    startObj.setUTCHours(0, 0, 0, 0);
  }

  let endObj: Date | undefined = undefined;
  if (endDate) {
    endObj = new Date(endDate);
    endObj.setUTCHours(23, 59, 59, 999);
  }

  const whereClause = and(
    eq(salesReceipts.organizationId, organizationId),
    ...(startObj ? [gte(salesReceipts.receiptDate, startObj)] : []),
    ...(endObj ? [lte(salesReceipts.receiptDate, endObj)] : []),
    ...(searchQuery
      ? [
          or(
            ilike(salesReceipts.receiptNumber, `%${searchQuery}%`),
            ilike(customers.name, `%${searchQuery}%`)
          ),
        ]
      : [])
  );

  const query = await db
    .select({
      id: salesReceipts.id,
      receiptNumber: salesReceipts.receiptNumber,
      receiptDate: salesReceipts.receiptDate,
      amount: salesReceipts.amount,
      paymentMethod: salesReceipts.paymentMethod,
      referenceNumber: salesReceipts.referenceNumber,
      customerId: salesReceipts.customerId,
      customerName: customers.name,
    })
    .from(salesReceipts)
    .leftJoin(customers, eq(salesReceipts.customerId, customers.id))
    .where(whereClause)
    .orderBy(sql`${salesReceipts.receiptDate} DESC`)
    .limit(limit)
    .offset(offset);
    
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(salesReceipts).leftJoin(customers, eq(salesReceipts.customerId, customers.id)).where(whereClause);
  const total = Number(totalResult[0]?.count || 0);

  return { data: query, total };
}
export async function createSalesInvoice(input: {
  organizationId: string;
  locationId: string;
  customerId: string;
  invoiceNumber: string;
  totalAmount: number;
  taxAmount: number;
  subtotal: number;
  dueDate: Date;
  createdById: string;
}) {
  return await db.transaction(async (tx) => {
    // 1. Create Invoice Record
    const [invoice] = await tx.insert(salesInvoices).values({
      organizationId: input.organizationId,
      locationId: input.locationId,
      customerId: input.customerId,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: new Date(),
      dueDate: input.dueDate,
      subtotalAmount: input.subtotal.toString(),
      taxAmount: input.taxAmount.toString(),
      totalAmount: input.totalAmount.toString(),
      status: 'open' as any,
      issueDate: new Date(),
      customerName: "Unknown",
      taxableAmount: "0",
      paymentMode: "None",
      grandTotal: input.totalAmount.toString(),
      paymentStatus: "UNPAID",
      createdUserId: "00000000-0000-0000-0000-000000000000"
    }).returning();

    // 2. Find System Accounts
    const allAccounts = await tx.select().from(accounts).where(
      eq(accounts.organizationId, input.organizationId)
    );

    const arAccount = allAccounts.find(a => 
      a.controlAccountType === 'ACCOUNTS_RECEIVABLE' || 
      a.controlAccountType === 'CUSTOMER_RECEIVABLE' ||
      a.code === '1210' ||
      a.code === 'AR-CTRL' ||
      a.name.toLowerCase().includes('accounts receivable')
    );
    const revenueAccount = allAccounts.find(a => 
      a.controlAccountType === 'REVENUE_SALES' || 
      a.controlAccountType === 'REVENUE' ||
      a.code === '1001' ||
      a.code === '4100' ||
      a.name.toLowerCase().includes('sales') ||
      a.name.toLowerCase().includes('revenue')
    );

    if (!arAccount || !revenueAccount) {
      throw new Error("Critical system accounts (AR or REVENUE) are not configured.");
    }

    // 3. Create Double-Entry Journal
    const entryNumber = "JE-INV-" + Date.now().toString().slice(-6);
    
    const [journalEntry] = await tx.insert(journalEntries).values({
      organizationId: input.organizationId,
      entryNumber,
      entryDate: new Date().toISOString().split('T')[0],
      narration: `Sales Invoice ${input.invoiceNumber}`,
      sourceModule: "RECEIVABLES",
      sourceReferenceId: invoice.id,
      totalAmount: input.totalAmount.toString(),
      status: "POSTED",
      createdById: input.createdById
    }).returning();

    await tx.insert(journalLineItems).values([
      { // DEBIT AR
        journalEntryId: journalEntry.id,
        accountId: arAccount.id,
        locationId: input.locationId,
        partyId: input.customerId,
        partyType: "CUSTOMER",
        debit: input.totalAmount.toString(),
        credit: "0",
        narration: "Invoice Generated"
      },
      { // CREDIT REVENUE
        journalEntryId: journalEntry.id,
        accountId: revenueAccount.id,
        locationId: input.locationId,
        debit: "0",
        credit: input.totalAmount.toString(),
        narration: "Sales Revenue"
      }
    ]);

    return invoice;
  });
}


export async function createCreditNote(input: {
  organizationId: string;
  locationId: string;
  customerId: string;
  invoiceId?: string;
  creditNoteNumber: string;
  amount: number;
  reason: string;
  createdById: string;
}) {
  return await db.transaction(async (tx) => {
    // 1. Create Credit Note Record
    const [creditNote] = await tx.insert(salesCreditNotes).values({
      organizationId: input.organizationId,
      locationId: input.locationId,
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      creditNoteNumber: input.creditNoteNumber,
      issueDate: new Date(),
      amount: input.amount.toString(),
      reason: input.reason,
      status: 'issued'
    }).returning();

    // 2. Find System Accounts
    const systemAccounts = await tx.select().from(accounts).where(and(
      eq(accounts.organizationId, input.organizationId),
      eq(accounts.isSystemAccount, true)
    ));

    const arAccount = systemAccounts.find(a => a.controlAccountType === 'ACCOUNTS_RECEIVABLE');
    const revenueAccount = systemAccounts.find(a => a.controlAccountType === 'REVENUE_SALES');

    if (!arAccount || !revenueAccount) {
      throw new Error("Critical system accounts (AR or REVENUE) are not configured.");
    }

    // 3. Create Double-Entry Journal (Reversal)
    const entryNumber = "JE-CN-" + Date.now().toString().slice(-6);
    
    const [journalEntry] = await tx.insert(journalEntries).values({
      organizationId: input.organizationId,
      entryNumber,
      entryDate: new Date().toISOString().split('T')[0],
      narration: `Credit Note ${input.creditNoteNumber} for ${input.reason}`,
      sourceModule: "RECEIVABLES",
      sourceReferenceId: creditNote.id,
      totalAmount: input.amount.toString(),
      status: "POSTED",
      createdById: input.createdById
    }).returning();

    await tx.insert(journalLineItems).values([
      { // DEBIT REVENUE (Reduce Sales)
        journalEntryId: journalEntry.id,
        accountId: revenueAccount.id,
        locationId: input.locationId,
        debit: input.amount.toString(),
        credit: "0",
        narration: "Sales Return / Refund"
      },
      { // CREDIT AR (Reduce Receivables)
        journalEntryId: journalEntry.id,
        accountId: arAccount.id,
        locationId: input.locationId,
        partyId: input.customerId,
        partyType: "CUSTOMER",
        debit: "0",
        credit: input.amount.toString(),
        narration: "Credit Note Issued"
      }
    ]);

    return creditNote;
  });
}

export async function getInvoiceById(invoiceId: string) {
  const [inv] = await db
    .select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceDate: salesInvoices.invoiceDate,
      dueDate: salesInvoices.dueDate,
      totalAmount: salesInvoices.totalAmount,
      status: salesInvoices.status,
      paymentStatus: salesInvoices.paymentStatus,
      customerId: salesInvoices.customerId,
      customerName: customers.name,
      locationId: salesInvoices.locationId,
      paidAmount: sql<number>`COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)`,
      creditApplied: sql<number>`COALESCE((SELECT SUM(CAST(applied_amount AS NUMERIC)) FROM credit_note_applications WHERE applied_to_invoice_id = ${salesInvoices.id}), 0)`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(eq(salesInvoices.id, invoiceId));

  if (!inv) return null;

  const total = Number(inv.totalAmount || 0);
  const paid = Number(inv.paidAmount || 0);
  const credited = Number(inv.creditApplied || 0);
  const balanceDue = Math.max(0, total - paid - credited);

  return {
    ...inv,
    totalAmount: total,
    paidAmount: paid,
    creditApplied: credited,
    balanceDue
  };
}

export async function getOpenInvoicesForCustomer(customerId: string) {
  const query = await db
    .select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceDate: salesInvoices.invoiceDate,
      totalAmount: sql<number>`(${salesInvoices.totalAmount} - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0) - COALESCE((SELECT SUM(CAST(applied_amount AS NUMERIC)) FROM credit_note_applications WHERE applied_to_invoice_id = ${salesInvoices.id}), 0))`,
      status: salesInvoices.status
    })
    .from(salesInvoices)
    .where(and(eq(salesInvoices.customerId, customerId), sql`(${salesInvoices.paymentStatus} != 'PAID' AND ${salesInvoices.status} != 'CANCELLED')`))
    .orderBy(sql`${salesInvoices.invoiceDate} ASC`);
    
  return query;
}

export async function getReceivablesSummary(organizationId: string) {
  const [invoicedStats] = await db.select({
    totalInvoiced: sql<number>`COALESCE(SUM(${salesInvoices.totalAmount}), 0)`,
    invoicedThisMonth: sql<number>`SUM(CASE WHEN date_trunc('month', ${salesInvoices.invoiceDate}) = date_trunc('month', CURRENT_DATE) THEN ${salesInvoices.totalAmount} ELSE 0 END)`,
  }).from(salesInvoices).where(eq(salesInvoices.organizationId, organizationId));

  const [receiptStats] = await db.select({
    totalCollected: sql<number>`COALESCE(SUM(${salesReceipts.amount}), 0)`,
    collectedThisMonth: sql<number>`SUM(CASE WHEN date_trunc('month', ${salesReceipts.receiptDate}) = date_trunc('month', CURRENT_DATE) THEN ${salesReceipts.amount} ELSE 0 END)`,
  }).from(salesReceipts).where(eq(salesReceipts.organizationId, organizationId));

  const [cnStats] = await db.select({
    totalCreditNotes: sql<number>`COALESCE(SUM(${salesCreditNotes.amount}), 0)`,
  }).from(salesCreditNotes).where(eq(salesCreditNotes.organizationId, organizationId));

  const totalOutstanding = Number(invoicedStats?.totalInvoiced || 0) - Number(receiptStats?.totalCollected || 0) - Number(cnStats?.totalCreditNotes || 0);

  const [ageing] = await db.select({
    overdue: sql<number>`SUM(CASE WHEN CURRENT_DATE > ${salesInvoices.dueDate} THEN (${salesInvoices.totalAmount} - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)) ELSE 0 END)`,
    current: sql<number>`SUM(CASE WHEN CURRENT_DATE <= ${salesInvoices.dueDate} THEN (${salesInvoices.totalAmount} - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = ${salesInvoices.id}), 0)) ELSE 0 END)`,
  }).from(salesInvoices).where(and(
    eq(salesInvoices.organizationId, organizationId), 
    sql`(${salesInvoices.paymentStatus} != 'PAID' AND ${salesInvoices.status} != 'CANCELLED')`
  ));

  return {
    totalOutstanding,
    invoicedThisMonth: Number(invoicedStats?.invoicedThisMonth || 0),
    collectedThisMonth: Number(receiptStats?.collectedThisMonth || 0),
    overdueAR: Number(ageing?.overdue || 0),
    currentAR: Number(ageing?.current || 0)
  };
}
