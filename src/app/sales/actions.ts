"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { eq, and, or, ilike, sql, desc, inArray, gte, lte } from "drizzle-orm";
import { items, customers, salesInvoices, salesInvoiceLines, salesReturns, salesReturnLines, organizations, creditNotes, creditNoteApplications, salesReceiptAllocations, refunds, salesInvoicePayments, eventFinancials, campaignAudiences, salesReceipts, salesCreditNotes, tmbillOrders, salesQuotations } from "@/db/schema";
import crypto from "crypto";
import { headers } from "next/headers";
import { requireAuthenticatedUser, authorizeEmployeeOperation } from "@/lib/authorization";

export async function fetchItems(
  organizationId: string, 
  locationId: string, 
  search: string = "", 
  itemType?: string
) {
  const conditions = [
    eq(items.organizationId, organizationId),
    ilike(items.nameEn, `%${search}%`)
  ];

  if (itemType && itemType !== "ALL") {
    if (itemType === "PRODUCT") {
      conditions.push(or(eq(items.itemType, "PRODUCT"), eq(items.itemType, "MENU_ITEM")) as any);
    } else {
      conditions.push(eq(items.itemType, itemType));
    }
  }

  return await db.select().from(items).where(and(...conditions));
}

export async function fetchCustomers(organizationId: string, search: string = "", limit: number = 30) {
  const trimmed = search.trim();
  let condition = eq(customers.organizationId, organizationId);

  if (trimmed) {
    condition = and(
      eq(customers.organizationId, organizationId),
      or(
        ilike(customers.name, `%${trimmed}%`),
        ilike(customers.phone, `%${trimmed}%`),
        ilike(customers.taxId, `%${trimmed}%`)
      )
    ) as any;
  }

  return await db
    .select()
    .from(customers)
    .where(condition)
    .orderBy(desc(customers.updatedAt))
    .limit(limit);
}

export async function addCustomer(organizationId: string, data: any) {
  const [newCustomer] = await db.insert(customers).values({
    organizationId,
    name: data.name,
    taxId: data.gstin,
    address: data.address,
    email: data.email,
    phone: data.phone
  }).returning();
  return newCustomer;
}

export async function createB2BInvoice(data: any) {
  const { organizationId, locationId, customerId, customerName, items: invoiceItems, paymentTerms, invoiceDate, dueDate, overallDiscount, advancePaid: inputAdvancePaid } = data;
  
  if (!organizationId || !locationId || !customerId) {
    throw new Error("Missing required fields for B2B Invoice");
  }
  
  // Calculate Server Side to prevent tampering
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let grandTotal = 0;
  let taxableTotal = 0;
  let totalItemDiscount = 0;
  
  const processedLines = invoiceItems.map((item: any) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discountPct = parseFloat(item.discountPercent) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    
    const grossLineTotal = qty * rate;
    const discountAmt = grossLineTotal * (discountPct / 100);
    const lineTaxable = grossLineTotal - discountAmt;
    const taxAmount = lineTaxable * (taxRate / 100);
    
    subtotal += grossLineTotal;
    totalItemDiscount += discountAmt;
    taxableTotal += lineTaxable;
    
    // Simplistic split of GST into CGST/SGST for local, or IGST for interstate.
    // Assuming local for this MVP.
    const cgst = taxAmount / 2;
    const sgst = taxAmount / 2;
    cgstTotal += cgst;
    sgstTotal += sgst;
    
    return {
      itemId: item.id,
      itemDescription: item.nameEn || item.name,
      hsnCode: "0000", // Defaulting for now if missing
      uom: item.unit || "PCS",
      quantity: qty.toString(),
      unitRate: rate.toString(),
      discountPercent: discountPct.toString(),
      discountAmount: discountAmt.toString(),
      taxableAmount: lineTaxable.toString(),
      gstRate: taxRate.toString(),
      cgstAmount: cgst.toString(),
      sgstAmount: sgst.toString(),
      lineTotal: (lineTaxable + taxAmount).toString(),
    };
  });
  
  const finalDiscount = parseFloat(overallDiscount) || 0;
  const netTaxable = taxableTotal - finalDiscount;
  grandTotal = netTaxable + cgstTotal + sgstTotal + igstTotal;
  
  const roundedGrandTotal = Math.round(grandTotal);
  const roundOffAmount = roundedGrandTotal - grandTotal;

  // Advance Payment Math & Status Synchronization
  const advance = Math.max(0, parseFloat(inputAdvancePaid) || 0);
  const balanceDue = Math.max(0, roundedGrandTotal - advance);
  
  let dynamicPaymentStatus = paymentTerms === "Cash" ? "PAID" : "PENDING";
  if (balanceDue <= 0 && roundedGrandTotal > 0) {
    dynamicPaymentStatus = "PAID";
  } else if (advance > 0 && balanceDue > 0) {
    dynamicPaymentStatus = "PARTIAL";
  }
  
  const invoiceNumber = `INV-${Date.now()}`;

  // Insert Invoice
  const [newInvoice] = await db.insert(salesInvoices).values({
    organizationId,
    locationId,
    invoiceNumber,
    issueDate: new Date(invoiceDate || Date.now()),
    invoiceDate: new Date(invoiceDate || Date.now()),
    dueDate: dueDate ? new Date(dueDate) : null,
    customerId,
    customerName,
    subtotalAmount: subtotal.toString(),
    discountAmount: finalDiscount.toString(),
    taxableAmount: netTaxable.toString(),
    cgstAmount: cgstTotal.toString(),
    sgstAmount: sgstTotal.toString(),
    igstAmount: igstTotal.toString(),
    taxAmount: (cgstTotal + sgstTotal + igstTotal).toString(),
    roundOffAmount: roundOffAmount.toFixed(2).toString(),
    grandTotal: roundedGrandTotal.toString(),
    totalAmount: roundedGrandTotal.toString(),
    advancePaid: advance.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    paymentStatus: dynamicPaymentStatus,
    paymentMode: advance > 0 && paymentTerms !== "Cash" ? "ADVANCE_SETTLED" : (paymentTerms || "CREDIT"),
    status: "ISSUED",
    createdUserId: "system", // Should come from session in a real app
  }).returning();

  // Insert Lines
  const linesToInsert = processedLines.map((line: any) => ({
    ...line,
    invoiceId: newInvoice.id,
    description: line.itemDescription,
    unitPrice: line.unitRate,
    totalAmount: line.lineTotal
  }));
  
  if (linesToInsert.length > 0) {
    await db.insert(salesInvoiceLines).values(linesToInsert);
  }

  return { success: true, invoice: newInvoice };
}

export async function fetchInvoices(organizationId: string, locationId: string, customerId?: string) {
  if (!organizationId || !locationId) return [];

  const conditions = [
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId)
  ];

  // If customerId is provided, apply Finance Module's outstanding invoice filtering
  if (customerId) {
    conditions.push(eq(salesInvoices.customerId, customerId));
    conditions.push(inArray(salesInvoices.paymentStatus, ['PENDING', 'PARTIAL']));
  } else {
    // Restrict to the last 15 days for performance when loading the general directory
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    conditions.push(gte(salesInvoices.invoiceDate, fifteenDaysAgo));
  }

  const list = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerId: salesInvoices.customerId,
    customerName: salesInvoices.customerName,
    customerPhone: customers.phone,
    invoiceDate: salesInvoices.invoiceDate,
    grandTotal: salesInvoices.grandTotal,
    status: salesInvoices.status,
    paymentStatus: salesInvoices.paymentStatus,
    paidAmount: sql<number>`COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = b2b_sales_invoices.id), 0)`,
    creditApplied: sql<number>`COALESCE((SELECT SUM(CAST(applied_amount AS NUMERIC)) FROM credit_note_applications WHERE applied_to_invoice_id = b2b_sales_invoices.id), 0)`
  })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(salesInvoices.invoiceDate));
  
  return list.map(inv => {
    const totalAmount = parseFloat(inv.grandTotal as any) || 0;
    const balanceDue = customerId 
      ? totalAmount - Number(inv.paidAmount || 0) - Number(inv.creditApplied || 0)
      : totalAmount;

    return {
      id: inv.id || '',
      invoiceNumber: inv.invoiceNumber || '',
      customerId: inv.customerId || '',
      customerName: inv.customerName || '',
      customerPhone: inv.customerPhone || '',
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
      total: totalAmount,
      balanceDue: balanceDue,
      grandTotal: inv.grandTotal || '0',
      status: inv.status || '',
      paymentStatus: inv.paymentStatus || ''
    };
  });
}


export async function fetchInvoiceDetails(invoiceId: string, enforcePolicy: boolean = false) {
  const invoiceResult = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
  if (invoiceResult.length === 0) return null;
  const invoice = invoiceResult[0];

  // Fetch Organization Policies
  const orgResult = await db.select({ returnPolicies: organizations.returnPolicies }).from(organizations).where(eq(organizations.id, invoice.organizationId));
  const returnPolicies = orgResult.length > 0 && orgResult[0].returnPolicies ? (orgResult[0].returnPolicies as any) : {
    maxReturnDays: 30,
    allowMultipleReturns: true
  };

  // Enforce Max Return Days Policy
  if (enforcePolicy && returnPolicies.maxReturnDays && returnPolicies.maxReturnDays !== "No Limit") {
    const invoiceDate = new Date(invoice.invoiceDate);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - invoiceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > returnPolicies.maxReturnDays) {
      throw new Error(`Return window of ${returnPolicies.maxReturnDays} days has expired for this invoice.`);
    }
  }

  const lines = await db.select().from(salesInvoiceLines).where(eq(salesInvoiceLines.invoiceId, invoiceId));
  
  // Calculate previously returned quantities (Approved, Draft, and Pending Approval)
  const pastReturns = await db.select({
    itemId: salesReturnLines.itemId,
    description: salesReturnLines.description,
    returnedQty: sql<number>`SUM(${salesReturnLines.returnQty})`.mapWith(Number)
  }).from(salesReturns)
    .innerJoin(salesReturnLines, eq(salesReturns.id, salesReturnLines.returnId))
    .where(and(
      eq(salesReturns.invoiceId, invoiceId), 
      inArray(salesReturns.status, ['APPROVED', 'DRAFT'])
    ))
    .groupBy(salesReturnLines.itemId, salesReturnLines.description);

  const returnedQtyMap: Record<string, number> = {};
  let totalReturnedItems = 0;
  pastReturns.forEach(pr => {
    const key = `${pr.itemId}_${pr.description || ''}`;
    returnedQtyMap[key] = pr.returnedQty || 0;
    if (pr.returnedQty > 0) totalReturnedItems++;
  });

  // Enforce Multiple Returns Policy
  if (enforcePolicy && returnPolicies.allowMultipleReturns === false && totalReturnedItems > 0) {
     throw new Error("This organization's policy strictly prohibits multiple return instances per invoice. A return has already been processed for this bill.");
  }

  const user = await requireAuthenticatedUser(await headers());
  let canApprove = false;
  if (user) {
    canApprove = await authorizeEmployeeOperation({
      userId: user.id,
      organizationId: invoice.organizationId,
      locationId: invoice.locationId,
      permission: "sales.returns_&_credit_notes:approve"
    });
  }

  // Fetch Originating Credit Notes (generated from returns on this invoice)
  const originatingCreditNotes = await db
    .select({
      id: creditNotes.id,
      creditNoteNumber: creditNotes.creditNoteNumber,
      totalAmount: creditNotes.totalAmount,
      remainingBalance: creditNotes.remainingBalance,
      status: creditNotes.status,
      issueDate: creditNotes.issueDate,
      returnNumber: salesReturns.returnNumber,
    })
    .from(creditNotes)
    .innerJoin(salesReturns, eq(creditNotes.sourceReturnId, salesReturns.id))
    .where(eq(salesReturns.invoiceId, invoiceId));

  // Fetch Applied Credit Notes (credit notes used as payments toward this invoice)
  const appliedCreditNotes = await db
    .select({
      id: creditNoteApplications.id,
      creditNoteId: creditNotes.id,
      creditNoteNumber: creditNotes.creditNoteNumber,
      appliedAmount: creditNoteApplications.appliedAmount,
      appliedAt: creditNoteApplications.appliedAt,
    })
    .from(creditNoteApplications)
    .innerJoin(creditNotes, eq(creditNoteApplications.creditNoteId, creditNotes.id))
    .where(eq(creditNoteApplications.appliedToInvoiceId, invoiceId));

  return {
    ...invoice,
    policies: returnPolicies,
    canApprove,
    originatingCreditNotes,
    appliedCreditNotes,
    items: lines.map(line => {
      const originalQty = parseFloat(line.quantity as any);
      const key = `${line.itemId}_${line.itemDescription || ''}`;
      const returnedQty = returnedQtyMap[key] || 0;
      const remainingQty = Math.max(0, originalQty - returnedQty);
      return {
        itemId: line.itemId,
        description: line.itemDescription,
        hsnCode: line.hsnCode,
        uom: line.uom,
        qty: enforcePolicy ? remainingQty : originalQty,
        originalQty: originalQty,
        remainingQty: remainingQty,
        rate: parseFloat(line.unitRate as any),
        unitRate: parseFloat(line.unitRate as any),
        discountPercent: parseFloat((line.discountPercent as any) || 0),
        discountAmount: parseFloat((line.discountAmount as any) || 0),
        taxableAmount: parseFloat(line.taxableAmount as any),
        gstRate: parseFloat(line.gstRate as any),
        cgstAmount: parseFloat((line.cgstAmount as any) || 0),
        sgstAmount: parseFloat((line.sgstAmount as any) || 0),
        igstAmount: parseFloat((line.igstAmount as any) || 0),
        total: parseFloat(line.lineTotal as any),
        totalAmount: parseFloat(line.lineTotal as any)
      };
    }).filter(item => enforcePolicy ? item.remainingQty > 0 : true)
  };
}

export async function updateInvoicePaymentStatus(invoiceId: string, status: string, mode: string) {
  await db.update(salesInvoices).set({
    paymentStatus: status,
    paymentMode: mode
  }).where(eq(salesInvoices.id, invoiceId));
  // TODO: Generate Reversal Journal Entry in Finance Module
}

export async function createSalesReturn(data: any) {
  const { organizationId, locationId, invoiceId, returnDate, reason, status, items: returnItems, totalAmount } = data;

  if (!organizationId || !locationId || !invoiceId) {
    throw new Error("Missing required fields for Sales Return");
  }

  // Authentication
  const user = await requireAuthenticatedUser(await headers());
  if (!user) throw new Error("Unauthorized");

  // Fetch policies
  const orgResult = await db.select({ returnPolicies: organizations.returnPolicies }).from(organizations).where(eq(organizations.id, organizationId));
  const returnPolicies = orgResult.length > 0 && orgResult[0].returnPolicies ? (orgResult[0].returnPolicies as any) : { requireApproval: true };

  // Authorization Check
  if (status === "APPROVED" && returnPolicies.requireApproval) {
    const isAuthorized = await authorizeEmployeeOperation({
      userId: user.id,
      organizationId,
      locationId,
      permission: "sales.returns_&_credit_notes:approve"
    });
    
    if (!isAuthorized) {
      throw new Error("Unauthorized: Manager approval is required for sales returns. You do not have the necessary permissions.");
    }
  }

  const returnNumber = `RET-${Date.now()}`;

  const [newReturn] = await db.insert(salesReturns).values({
    organizationId,
    locationId,
    returnNumber,
    invoiceId,
    returnDate: new Date(returnDate || Date.now()),
    reason,
    status,
    totalAmount: totalAmount.toString(),
    createdUserId: user.id
  }).returning();

  const linesToInsert = returnItems.filter((item: any) => item.returnQty > 0).map((item: any) => ({
    returnId: newReturn.id,
    itemId: item.itemId,
    description: item.description,
    returnQty: item.returnQty.toString(),
    unitPrice: item.rate.toString(),
    addToInventory: item.addToInventory
  }));

  if (linesToInsert.length > 0) {
    await db.insert(salesReturnLines).values(linesToInsert);
    
    // TODO: Connect to Inventory Module here once it is built.
    // Example: if (item.addToInventory) { inventoryService.addStock(item.itemId, item.returnQty) }
  }

  return { success: true, returnId: newReturn.id };
}

export async function approveSalesReturn(returnId: string) {
  if (!returnId) throw new Error("Missing return ID");

  const user = await requireAuthenticatedUser(await headers());
  if (!user) throw new Error("Unauthorized");

  const returnRecordResult = await db.select().from(salesReturns).where(eq(salesReturns.id, returnId));
  if (returnRecordResult.length === 0) throw new Error("Return not found");
  const returnRecord = returnRecordResult[0];

  const isAuthorized = await authorizeEmployeeOperation({
    userId: user.id,
    organizationId: returnRecord.organizationId,
    locationId: returnRecord.locationId,
    permission: "sales.returns_&_credit_notes:approve"
  });

  if (!isAuthorized) {
    throw new Error("Unauthorized: You do not have permission to approve sales returns.");
  }

  const result = await db.transaction(async (tx) => {
    // a) Verify the Sales Return exists and is currently in 'DRAFT' or pending status.
    const [freshReturn] = await tx
      .select()
      .from(salesReturns)
      .where(eq(salesReturns.id, returnId))
      .limit(1);

    if (!freshReturn) throw new Error("Return not found during transaction.");
    
    if (freshReturn.status !== "DRAFT") {
      throw new Error(`Cannot approve a return that is currently ${freshReturn.status}.`);
    }

    // b) Update the Sales Return status to 'APPROVED'.
    await tx.update(salesReturns).set({ status: "APPROVED" }).where(eq(salesReturns.id, returnId));

    // Get the customerId from the associated invoice
    let customerId = "";
    if (freshReturn.invoiceId) {
      const [invoice] = await tx.select().from(salesInvoices).where(eq(salesInvoices.id, freshReturn.invoiceId)).limit(1);
      if (invoice) {
        customerId = invoice.customerId;
      }
    }

    if (!customerId) {
      throw new Error("Cannot generate credit note: No customer found for this return's invoice.");
    }

    // c & d) Automatically insert a new record into the creditNotes table
    const creditNoteNumber = `CN-${Date.now()}`;
    const [newCreditNote] = await tx.insert(creditNotes).values({
      organizationId: freshReturn.organizationId,
      locationId: freshReturn.locationId,
      creditNoteNumber,
      customerId,
      sourceReturnId: freshReturn.id,
      totalAmount: freshReturn.totalAmount,
      remainingBalance: freshReturn.totalAmount,
      status: "OPEN"
    }).returning();

    return { creditNoteId: newCreditNote.id };
  });

  return { success: true, creditNoteId: result.creditNoteId };
}

export async function rejectSalesReturn(returnId: string) {
  if (!returnId) throw new Error("Missing return ID");

  const user = await requireAuthenticatedUser(await headers());
  if (!user) throw new Error("Unauthorized");

  const returnRecord = await db.select().from(salesReturns).where(eq(salesReturns.id, returnId));
  if (returnRecord.length === 0) throw new Error("Return not found");

  const isAuthorized = await authorizeEmployeeOperation({
    userId: user.id,
    organizationId: returnRecord[0].organizationId,
    locationId: returnRecord[0].locationId,
    permission: "sales.returns_&_credit_notes:approve"
  });

  if (!isAuthorized) {
    throw new Error("Unauthorized: You do not have permission to reject sales returns.");
  }

  await db.update(salesReturns).set({ status: "REJECTED" }).where(eq(salesReturns.id, returnId));
  return { success: true };
}

export async function fetchSalesReturns(
  organizationId: string, 
  locationId: string, 
  searchQuery?: string, 
  startDate?: string, 
  endDate?: string, 
  status?: string
) {
  if (!organizationId || !locationId) return [];

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

  const whereConditions = [
    eq(salesReturns.organizationId, organizationId),
    eq(salesReturns.locationId, locationId),
  ];

  if (startObj) whereConditions.push(gte(salesReturns.returnDate, startObj));
  if (endObj) whereConditions.push(lte(salesReturns.returnDate, endObj));
  if (status && status !== "ALL" && status !== "all") whereConditions.push(eq(salesReturns.status, status as any));
  if (searchQuery) {
    whereConditions.push(
      or(
        ilike(salesReturns.returnNumber, `%${searchQuery}%`),
        ilike(salesInvoices.customerName, `%${searchQuery}%`),
        ilike(salesInvoices.invoiceNumber, `%${searchQuery}%`)
      ) as any
    );
  }
  
  const returns = await db.select({
    id: salesReturns.id,
    returnNumber: salesReturns.returnNumber,
    returnDate: salesReturns.returnDate,
    status: salesReturns.status,
    totalAmount: salesReturns.totalAmount,
    invoiceNumber: salesInvoices.invoiceNumber,
    invoiceId: salesReturns.invoiceId,
    customerName: salesInvoices.customerName,
    qty: sql<number>`COALESCE(SUM(${salesReturnLines.returnQty}), 0)`.mapWith(Number)
  }).from(salesReturns)
    .leftJoin(salesInvoices, eq(salesReturns.invoiceId, salesInvoices.id))
    .leftJoin(salesReturnLines, eq(salesReturns.id, salesReturnLines.returnId))
    .where(and(...whereConditions))
    .groupBy(
      salesReturns.id,
      salesReturns.returnNumber,
      salesReturns.returnDate,
      salesReturns.status,
      salesReturns.totalAmount,
      salesInvoices.invoiceNumber,
      salesInvoices.customerName,
      salesReturns.createdAt
    )
    .orderBy(desc(salesReturns.createdAt));

  return returns.map(ret => ({
    id: ret.id,
    returnId: ret.returnNumber,
    date: ret.returnDate ? ret.returnDate.toISOString().split('T')[0] : '',
    invoice: ret.invoiceNumber || 'Unknown',
    customer: ret.customerName || 'Unknown',
    qty: ret.qty,
    amount: "₹ " + parseFloat(ret.totalAmount as any).toFixed(2),
    status: ret.status
  }));
}

export async function fetchSalesReturnDetails(returnId: string) {
  const returnResult = await db.select({
    id: salesReturns.id,
    returnNumber: salesReturns.returnNumber,
    returnDate: salesReturns.returnDate,
    status: salesReturns.status,
    totalAmount: salesReturns.totalAmount,
    reason: salesReturns.reason,
    invoiceId: salesReturns.invoiceId,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
  }).from(salesReturns)
    .leftJoin(salesInvoices, eq(salesReturns.invoiceId, salesInvoices.id))
    .where(eq(salesReturns.id, returnId));

  if (returnResult.length === 0) return null;
  
  const linesResult = await db.select().from(salesReturnLines).where(eq(salesReturnLines.returnId, returnId));
  
  return {
    ...returnResult[0],
    items: linesResult
  };
}

export async function createCreditNote(input: {
  organizationId: string;
  locationId: string;
  customerId: string;
  sourceReturnId?: string;
  totalAmount: number | string;
}) {
  try {
    const amount = Number(input.totalAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Total amount must be a positive number.");
    }

    const creditNoteNumber = `CN-${Date.now()}`;

    const [newCreditNote] = await db.insert(creditNotes).values({
      organizationId: input.organizationId,
      locationId: input.locationId,
      creditNoteNumber,
      customerId: input.customerId,
      sourceReturnId: input.sourceReturnId,
      totalAmount: amount.toString(),
      remainingBalance: amount.toString(),
      status: "OPEN",
    }).returning();

    return { success: true, data: newCreditNote };
  } catch (error: any) {
    console.error("Error creating credit note:", error);
    throw new Error(error.message || "Failed to create credit note");
  }
}

export async function applyCreditNote(input: {
  creditNoteId: string;
  appliedToInvoiceId: string;
  amountToApply: number | string;
}) {
  try {
    const amountToApply = Number(input.amountToApply);
    
    if (isNaN(amountToApply) || amountToApply <= 0) {
      throw new Error("Amount to apply must be a positive number.");
    }

    const result = await db.transaction(async (tx) => {
      const [creditNote] = await tx
        .select()
        .from(creditNotes)
        .where(eq(creditNotes.id, input.creditNoteId))
        .limit(1);

      if (!creditNote) {
        throw new Error("Credit Note not found.");
      }

      if (creditNote.status === "CLOSED" || creditNote.status === "VOID") {
        throw new Error(`Cannot apply a credit note that is ${creditNote.status}.`);
      }

      const remainingBalance = Number(creditNote.remainingBalance);

      if (amountToApply > remainingBalance) {
        throw new Error(`Amount to apply (${amountToApply}) exceeds the remaining balance (${remainingBalance}).`);
      }

      const [application] = await tx.insert(creditNoteApplications).values({
        creditNoteId: creditNote.id,
        appliedToInvoiceId: input.appliedToInvoiceId,
        appliedAmount: amountToApply.toString(),
      }).returning();

      const newBalance = Number((remainingBalance - amountToApply).toFixed(2));

      let newStatus = creditNote.status;
      if (newBalance <= 0) {
        newStatus = "CLOSED" as any;
      } else if (newBalance > 0) {
        newStatus = "PARTIALLY_APPLIED";
      }

      await tx.update(creditNotes)
        .set({
          remainingBalance: newBalance.toString(),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(creditNotes.id, creditNote.id));

      return application;
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error applying credit note:", error);
    throw new Error(error.message || "Failed to apply credit note");
  }
}

export async function fetchCreditNotesByLocation(
  locationId: string, 
  organizationId: string, 
  searchQuery?: string, 
  page: number = 1, 
  limit: number = 10, 
  startDate?: string, 
  endDate?: string,
  status?: string
) {
  try {
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

    const whereConditions = [
      eq(creditNotes.organizationId, organizationId),
      eq(creditNotes.locationId, locationId),
    ];

    if (startObj) whereConditions.push(gte(creditNotes.issueDate, startObj));
    if (endObj) whereConditions.push(lte(creditNotes.issueDate, endObj));
    if (status && status !== "ALL") whereConditions.push(eq(creditNotes.status, status as any));
    if (searchQuery) {
      whereConditions.push(
        or(
          ilike(creditNotes.creditNoteNumber, `%${searchQuery}%`),
          ilike(salesInvoices.invoiceNumber, `%${searchQuery}%`),
          ilike(customers.name, `%${searchQuery}%`)
        ) as any
      );
    }

    const whereClause = and(...whereConditions);

    const notes = await db
      .select({
        id: creditNotes.id,
        creditNoteNumber: creditNotes.creditNoteNumber,
        totalAmount: creditNotes.totalAmount,
        remainingBalance: creditNotes.remainingBalance,
        status: creditNotes.status,
        issueDate: creditNotes.issueDate,
        customerId: creditNotes.customerId,
        sourceReturnId: creditNotes.sourceReturnId,
        customerName: customers.name,
        sourceInvoiceId: salesInvoices.id,
        sourceInvoiceNumber: salesInvoices.invoiceNumber,
      })
      .from(creditNotes)
      .leftJoin(customers, eq(creditNotes.customerId, customers.id))
      .leftJoin(salesReturns, eq(creditNotes.sourceReturnId, salesReturns.id))
      .leftJoin(salesInvoices, eq(salesReturns.invoiceId, salesInvoices.id))
      .where(whereClause)
      .orderBy(desc(creditNotes.issueDate))
      .limit(limit)
      .offset(offset);
      
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(creditNotes)
      .leftJoin(customers, eq(creditNotes.customerId, customers.id))
      .leftJoin(salesReturns, eq(creditNotes.sourceReturnId, salesReturns.id))
      .leftJoin(salesInvoices, eq(salesReturns.invoiceId, salesInvoices.id))
      .where(whereClause);
    const total = Number(totalResult[0]?.count || 0);
      
    const noteIds = notes.map(n => n.id);
    
    let applications: any[] = [];
    if (noteIds.length > 0) {
      applications = await db
        .select({
          id: creditNoteApplications.id,
          creditNoteId: creditNoteApplications.creditNoteId,
          appliedToInvoiceId: creditNoteApplications.appliedToInvoiceId,
          appliedAmount: creditNoteApplications.appliedAmount,
          appliedAt: creditNoteApplications.appliedAt,
          appliedInvoiceNumber: salesInvoices.invoiceNumber,
        })
        .from(creditNoteApplications)
        .leftJoin(salesInvoices, eq(creditNoteApplications.appliedToInvoiceId, salesInvoices.id))
        .where(inArray(creditNoteApplications.creditNoteId, noteIds));
    }

    const formattedNotes = notes.map(note => ({
      ...note,
      applications: applications.filter(app => app.creditNoteId === note.id)
    }));

    return { success: true, data: formattedNotes, total };
  } catch (error: any) {
    console.error("Error fetching credit notes by location:", error);
    throw new Error(error.message || "Failed to fetch credit notes");
  }
}

export async function refundCreditNote(payload: { creditNoteId: string, refundAmount: number, paymentMethod: string, referenceNumber?: string, notes?: string }) {
  try {
    const { creditNoteId, refundAmount, paymentMethod, referenceNumber, notes } = payload;
    const result = await db.transaction(async (tx) => {
      const [creditNote] = await tx
        .select()
        .from(creditNotes)
        .where(eq(creditNotes.id, creditNoteId))
        .limit(1);

      if (!creditNote) {
        throw new Error("Credit Note not found.");
      }

      if (creditNote.status === "CLOSED" || creditNote.status === "VOID" || creditNote.status === "REFUNDED") {
        throw new Error(`Cannot refund a credit note that is already ${creditNote.status}.`);
      }

      const remainingBalance = Number(creditNote.remainingBalance);
      if (remainingBalance <= 0) {
        throw new Error("Cannot refund a credit note with zero remaining balance.");
      }

      if (refundAmount <= 0 || refundAmount > remainingBalance) {
        throw new Error(`Invalid refund amount. Must be between 0.01 and ${remainingBalance}`);
      }

      const newBalance = remainingBalance - refundAmount;

      // Insert record into refunds table
      const [newRefund] = await tx
        .insert(refunds)
        .values({
          organizationId: creditNote.organizationId,
          locationId: creditNote.locationId,
          creditNoteId: creditNote.id,
          customerId: creditNote.customerId,
          amount: refundAmount.toString(),
          paymentMethod: paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        })
        .returning({ id: refunds.id });

      // Mark as refunded or partially applied and update the balance
      await tx.update(creditNotes)
        .set({
          remainingBalance: newBalance.toString(),
          status: newBalance === 0 ? "REFUNDED" : "PARTIALLY_APPLIED",
          updatedAt: new Date(),
        })
        .where(eq(creditNotes.id, creditNote.id));

      return { refundId: newRefund.id };
    });

    return { success: true, refundId: result.refundId };
  } catch (error: any) {
    console.error("Error refunding credit note:", error);
    throw new Error(error.message || "Failed to refund credit note");
  }
}

export async function fetchRefundsByLocation(
  organizationId: string, 
  locationId: string, 
  searchQuery?: string, 
  startDate?: string, 
  endDate?: string
) {
  try {
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

    const whereConditions = [
      eq(refunds.organizationId, organizationId),
      eq(refunds.locationId, locationId),
    ];

    if (startObj) whereConditions.push(gte(refunds.refundDate, startObj));
    if (endObj) whereConditions.push(lte(refunds.refundDate, endObj));
    if (searchQuery) {
      whereConditions.push(
        or(
          ilike(creditNotes.creditNoteNumber, `%${searchQuery}%`),
          ilike(customers.name, `%${searchQuery}%`),
          ilike(refunds.paymentMethod, `%${searchQuery}%`),
          ilike(refunds.referenceNumber, `%${searchQuery}%`)
        ) as any
      );
    }

    const data = await db
      .select({
        id: refunds.id,
        amount: refunds.amount,
        paymentMethod: refunds.paymentMethod,
        referenceNumber: refunds.referenceNumber,
        notes: refunds.notes,
        refundDate: refunds.refundDate,
        customerName: customers.name,
        creditNoteNumber: creditNotes.creditNoteNumber,
      })
      .from(refunds)
      .innerJoin(customers, eq(refunds.customerId, customers.id))
      .innerJoin(creditNotes, eq(refunds.creditNoteId, creditNotes.id))
      .where(and(...whereConditions))
      .orderBy(desc(refunds.refundDate));

    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching refunds:", error);
    return { success: false, data: [] };
  }
}

export async function fetchPendingOrders(organizationId: string, locationId: string, searchQuery?: string) {
  if (!organizationId || !locationId) return [];
  
  return await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerId: salesInvoices.customerId,
    customerName: salesInvoices.customerName,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
  }).from(salesInvoices)
    .where(
      and(
        eq(salesInvoices.organizationId, organizationId),
        eq(salesInvoices.locationId, locationId),
        eq(salesInvoices.paymentStatus, 'PENDING'),
        ...(searchQuery
          ? [
              or(
                ilike(salesInvoices.invoiceNumber, `%${searchQuery}%`),
                ilike(salesInvoices.customerName, `%${searchQuery}%`)
              ),
            ]
          : [])
      )
    )
    .orderBy(desc(salesInvoices.invoiceDate));
}

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

export async function fetchCompletedOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: Date, endDate?: Date) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
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
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    eq(salesInvoices.paymentStatus, 'PAID'),
    ...(startObj ? [gte(salesInvoices.invoiceDate, startObj)] : []),
    ...(endObj ? [lte(salesInvoices.invoiceDate, endObj)] : []),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, `%${searchQuery}%`),
            ilike(salesInvoices.customerName, `%${searchQuery}%`)
          ),
        ]
      : [])
  );

  const data = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
  })
    .from(salesInvoices)
    .where(whereClause)
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(salesInvoices).where(whereClause);
  const total = Number(totalResult[0]?.count || 0);

  return { data, total };
}

export async function fetchCancelledOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
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
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    or(
      eq(salesInvoices.status, 'CANCELLED'),
      eq(salesInvoices.paymentStatus, 'CANCELLED')
    ),
    ...(startObj ? [gte(salesInvoices.invoiceDate, startObj)] : []),
    ...(endObj ? [lte(salesInvoices.invoiceDate, endObj)] : []),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, `%${searchQuery}%`),
            ilike(salesInvoices.customerName, `%${searchQuery}%`)
          ),
        ]
      : [])
  );

  const data = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
    status: salesInvoices.status,
  })
    .from(salesInvoices)
    .where(whereClause)
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(salesInvoices).where(whereClause);
  const total = Number(totalResult[0]?.count || 0);

  return { data, total };
}

export async function fetchAllOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, paymentMode?: string, status?: string) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
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
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    ...(startObj ? [gte(salesInvoices.invoiceDate, startObj)] : []),
    ...(endObj ? [lte(salesInvoices.invoiceDate, endObj)] : []),
    ...(paymentMode ? [eq(salesInvoices.paymentMode, paymentMode)] : []),
    ...(status ? [eq(salesInvoices.status, status)] : []),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, `%${searchQuery}%`),
            ilike(salesInvoices.customerName, `%${searchQuery}%`),
            ilike(customers.phone, `%${searchQuery}%`)
          ),
        ]
      : [])
  );

  const data = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    customerPhone: customers.phone,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
    status: salesInvoices.status,
  })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(whereClause)
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: sql<number>`count(*)` })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(whereClause);
  const total = Number(totalResult[0]?.count || 0);

  return { data, total };
}

export async function deleteSalesInvoice(invoiceId: string) {
  if (!invoiceId) return { success: false, error: "Invoice ID is required" };

  try {
    // Authentication check
    const user = await requireAuthenticatedUser(await headers());
    if (!user) return { success: false, error: "Unauthorized" };

    // Fetch invoice details first to verify existence and check dependencies
    const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
    if (!invoice) return { success: false, error: "Invoice not found" };

    // Check if there are associated sales returns
    const returns = await db.select({ id: salesReturns.id, returnNumber: salesReturns.returnNumber })
      .from(salesReturns)
      .where(eq(salesReturns.invoiceId, invoiceId));
    if (returns.length > 0) {
      const returnNums = returns.map(r => r.returnNumber).filter(Boolean).join(", ");
      return {
        success: false,
        error: `Cannot delete invoice: associated sales return (${returnNums || returns.length}) exists. Please cancel or resolve the return first.`,
      };
    }

    // Check for credit note applications
    const cnApps = await db.select({ 
      id: creditNoteApplications.id,
      creditNoteNumber: creditNotes.creditNoteNumber,
      appliedAmount: creditNoteApplications.appliedAmount,
    })
      .from(creditNoteApplications)
      .leftJoin(creditNotes, eq(creditNoteApplications.creditNoteId, creditNotes.id))
      .where(eq(creditNoteApplications.appliedToInvoiceId, invoiceId));
    if (cnApps.length > 0) {
      const cnNums = cnApps.map(c => c.creditNoteNumber ? `#${c.creditNoteNumber}` : "Credit Note").join(", ");
      return {
        success: false,
        error: `Cannot delete invoice: ${cnNums} is applied to this invoice. Please remove the credit note application under Returns & Credit Notes first.`,
      };
    }

    // Safe deletion transaction
    await db.transaction(async (tx) => {
      // 1. Unlink marketing audience references if any
      await tx.update(campaignAudiences)
        .set({ convertedInvoiceId: null, isConverted: false })
        .where(eq(campaignAudiences.convertedInvoiceId, invoiceId));

      // 2. Unlink event financials if any
      await tx.update(eventFinancials)
        .set({ invoiceId: null })
        .where(eq(eventFinancials.invoiceId, invoiceId));

      // 3. Unlink tmbill raw orders if any
      await tx.update(tmbillOrders)
        .set({ financeSalesInvoiceId: null })
        .where(eq(tmbillOrders.financeSalesInvoiceId, invoiceId));

      // 4. Unlink converted sales quotation if any
      await tx.update(salesQuotations)
        .set({ convertedInvoiceId: null, status: "APPROVED" })
        .where(eq(salesQuotations.convertedInvoiceId, invoiceId));

      // 5. Handle receipt allocations and clean up associated receipts created for this invoice
      const allocations = await tx.select({ 
        id: salesReceiptAllocations.id, 
        receiptId: salesReceiptAllocations.receiptId 
      }).from(salesReceiptAllocations).where(eq(salesReceiptAllocations.invoiceId, invoiceId));
      
      if (allocations.length > 0) {
        const receiptIds = allocations.map(a => a.receiptId);
        // Delete allocations for this invoice
        await tx.delete(salesReceiptAllocations).where(eq(salesReceiptAllocations.invoiceId, invoiceId));

        // If any of these receipts have NO remaining allocations to other invoices, clean them up too
        for (const rId of receiptIds) {
          const remaining = await tx.select({ id: salesReceiptAllocations.id })
            .from(salesReceiptAllocations)
            .where(eq(salesReceiptAllocations.receiptId, rId));
          if (remaining.length === 0) {
            await tx.delete(salesReceipts).where(eq(salesReceipts.id, rId));
          }
        }
      }

      // 6. Also delete any receipt directly created with referenceNumber equal to this invoiceNumber
      if (invoice.invoiceNumber) {
        await tx.delete(salesReceipts).where(and(
          eq(salesReceipts.organizationId, invoice.organizationId),
          eq(salesReceipts.referenceNumber, invoice.invoiceNumber)
        ));
      }

      // 7. Delete invoice credit notes created directly for this invoice
      await tx.delete(salesCreditNotes).where(eq(salesCreditNotes.invoiceId, invoiceId));

      // 8. Delete invoice payments
      await tx.delete(salesInvoicePayments).where(eq(salesInvoicePayments.invoiceId, invoiceId));

      // 9. Delete invoice line items
      await tx.delete(salesInvoiceLines).where(eq(salesInvoiceLines.invoiceId, invoiceId));

      // 10. Finally delete invoice
      await tx.delete(salesInvoices).where(eq(salesInvoices.id, invoiceId));
    });

    revalidatePath("/sales/invoices");
    revalidatePath("/sales/invoices/all");
    return { success: true };
  } catch (error: any) {
    console.error("deleteSalesInvoice error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred while deleting the invoice.",
    };
  }
}

export async function updateSalesInvoice(data: {
  id: string;
  customerName?: string;
  customerGstin?: string;
  billingAddress?: string;
  dueDate?: string;
  paymentStatus?: string;
  paymentMode?: string;
  status?: string;
}) {
  if (!data.id) throw new Error("Invoice ID is required");

  const user = await requireAuthenticatedUser(await headers());
  if (!user) throw new Error("Unauthorized");

  const [existing] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, data.id));
  if (!existing) throw new Error("Invoice not found");

  const updateFields: any = {};
  if (data.customerName !== undefined) updateFields.customerName = data.customerName;
  if (data.customerGstin !== undefined) updateFields.customerGstin = data.customerGstin;
  if (data.billingAddress !== undefined) updateFields.billingAddress = data.billingAddress;
  if (data.dueDate !== undefined) updateFields.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.paymentStatus !== undefined) updateFields.paymentStatus = data.paymentStatus;
  if (data.paymentMode !== undefined) updateFields.paymentMode = data.paymentMode;
  if (data.status !== undefined) updateFields.status = data.status;

  await db.update(salesInvoices)
    .set(updateFields)
    .where(eq(salesInvoices.id, data.id));

  revalidatePath("/sales/invoices");
  revalidatePath("/sales/invoices/all");
  return { success: true };
}
