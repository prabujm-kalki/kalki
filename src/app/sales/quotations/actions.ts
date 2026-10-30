"use server";

import { db } from "@/db";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
import {
  salesQuotations,
  salesQuotationLines,
  customers,
  items,
  salesInvoices,
  salesInvoiceLines,
  organizations,
  locations,
} from "@/db/schema";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Suppress static generation store error during standalone CLI / test execution
  }
}

export interface QuotationLineInput {
  itemId: string;
  itemName: string;
  hsnCode?: string;
  uom: string;
  quantity: number;
  unitRate: number;
  discountPercent?: number;
  gstRate?: number;
}

export interface CreateQuotationInput {
  organizationId: string;
  locationId: string;
  docType?: "QUOTATION" | "PROFORMA";
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  billingAddress?: string;
  issueDate?: string | Date;
  validUntil?: string | Date;
  paymentTerms?: string;
  notes?: string;
  termsAndConditions?: string;
  lines: QuotationLineInput[];
}

export interface UpdateQuotationInput extends CreateQuotationInput {
  id: string;
}

/**
 * Generate next quotation or proforma number
 * e.g. QT-2026-0001 or PI-2026-0001
 */
async function generateQuotationNumber(
  organizationId: string,
  docType: "QUOTATION" | "PROFORMA"
): Promise<string> {
  const prefix = docType === "PROFORMA" ? "PI" : "QT";
  const year = new Date().getFullYear();
  const searchPattern = `${prefix}-${year}-%`;

  const existing = await db
    .select({ quotationNumber: salesQuotations.quotationNumber })
    .from(salesQuotations)
    .where(ilike(salesQuotations.quotationNumber, searchPattern))
    .orderBy(desc(salesQuotations.quotationNumber))
    .limit(1);

  let nextSeq = 1;
  if (existing.length > 0 && existing[0].quotationNumber) {
    const parts = existing[0].quotationNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `${prefix}-${year}-${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Fetch quotations for an organization & location with filtering
 */
export async function fetchQuotations(
  organizationId: string,
  locationId: string,
  options?: {
    search?: string;
    docType?: string;
    status?: string;
    limit?: number;
  }
) {
  try {
    let query = db
      .select({
        id: salesQuotations.id,
        organizationId: salesQuotations.organizationId,
        locationId: salesQuotations.locationId,
        quotationNumber: salesQuotations.quotationNumber,
        docType: salesQuotations.docType,
        version: salesQuotations.version,
        customerId: salesQuotations.customerId,
        customerName: salesQuotations.customerName,
        customerPhone: salesQuotations.customerPhone,
        customerGstin: salesQuotations.customerGstin,
        status: salesQuotations.status,
        issueDate: salesQuotations.issueDate,
        validUntil: salesQuotations.validUntil,
        grandTotal: salesQuotations.grandTotal,
        subtotalAmount: salesQuotations.subtotalAmount,
        discountAmount: salesQuotations.discountAmount,
        taxableAmount: salesQuotations.taxableAmount,
        cgstAmount: salesQuotations.cgstAmount,
        sgstAmount: salesQuotations.sgstAmount,
        igstAmount: salesQuotations.igstAmount,
        publicToken: salesQuotations.publicToken,
        isSentToCustomer: salesQuotations.isSentToCustomer,
        sentAt: salesQuotations.sentAt,
        convertedInvoiceId: salesQuotations.convertedInvoiceId,
        convertedAt: salesQuotations.convertedAt,
        createdAt: salesQuotations.createdAt,
      })
      .from(salesQuotations)
      .where(
        and(
          eq(salesQuotations.organizationId, organizationId),
          eq(salesQuotations.locationId, locationId),
          options?.docType && options.docType !== "ALL"
            ? eq(salesQuotations.docType, options.docType)
            : undefined,
          options?.status && options.status !== "ALL"
            ? eq(salesQuotations.status, options.status)
            : undefined,
          options?.search
            ? sql`(${salesQuotations.quotationNumber} ILIKE ${`%${options.search}%`} OR ${salesQuotations.customerName} ILIKE ${`%${options.search}%`})`
            : undefined
        )
      )
      .orderBy(desc(salesQuotations.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }

    const data = await query;

    const [org] = await db
      .select({
        whatsappDispatchMode: organizations.whatsappDispatchMode,
        whatsappContentFormat: organizations.whatsappContentFormat,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    const enriched = data.map((d) => ({
      ...d,
      whatsappDispatchMode: org?.whatsappDispatchMode || "WEB_LINK_POPUP",
      whatsappContentFormat: org?.whatsappContentFormat || "TEXT_AND_PDF_LINK",
    }));

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error("fetchQuotations error:", err);
    return { success: false, error: err.message || "Failed to fetch quotations" };
  }
}

/**
 * Fetch a single quotation by ID with line items
 */
export async function fetchQuotationById(quotationId: string) {
  try {
    const [quotation] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.id, quotationId))
      .limit(1);

    if (!quotation) {
      return { success: false, error: "Quotation not found" };
    }

    const lines = await db
      .select()
      .from(salesQuotationLines)
      .where(eq(salesQuotationLines.quotationId, quotationId))
      .orderBy(salesQuotationLines.createdAt);

    const [org] = await db
      .select({
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        invoiceSettings: organizations.invoiceSettings,
        whatsappDispatchMode: organizations.whatsappDispatchMode,
        whatsappContentFormat: organizations.whatsappContentFormat,
      })
      .from(organizations)
      .where(eq(organizations.id, quotation.organizationId));

    const [loc] = await db
      .select({
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(eq(locations.id, quotation.locationId))
      .limit(1);

    return {
      success: true,
      data: {
        ...quotation,
        lines,
        organization: org || null,
        location: loc || null,
        invoiceSettings: org?.invoiceSettings || null,
        whatsappDispatchMode: org?.whatsappDispatchMode || "WEB_LINK_POPUP",
        whatsappContentFormat: org?.whatsappContentFormat || "TEXT_AND_PDF_LINK",
      },
    };
  } catch (err: any) {
    console.error("fetchQuotationById error:", err);
    return { success: false, error: err.message || "Failed to fetch quotation details" };
  }
}

/**
 * Fetch quotation by publicToken for public customer view
 */
export async function fetchPublicQuotation(token: string) {
  try {
    const [quotation] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.publicToken, token))
      .limit(1);

    if (!quotation) {
      return { success: false, error: "Quotation not found" };
    }

    const [org] = await db
      .select({ name: organizations.name, logoUrl: organizations.logoUrl })
      .from(organizations)
      .where(eq(organizations.id, quotation.organizationId))
      .limit(1);

    const [loc] = await db
      .select({ name: locations.name, code: locations.code })
      .from(locations)
      .where(eq(locations.id, quotation.locationId))
      .limit(1);

    const lines = await db
      .select()
      .from(salesQuotationLines)
      .where(eq(salesQuotationLines.quotationId, quotation.id))
      .orderBy(salesQuotationLines.createdAt);

    return {
      success: true,
      data: {
        quotation,
        lines,
        organization: org,
        location: loc,
      },
    };
  } catch (err: any) {
    console.error("fetchPublicQuotation error:", err);
    return { success: false, error: err.message || "Failed to load public quotation" };
  }
}

/**
 * Create a new Quotation or Proforma
 */
export async function createQuotation(input: CreateQuotationInput) {
  try {
    const docType = input.docType || "QUOTATION";
    const quotationNumber = await generateQuotationNumber(input.organizationId, docType);
    const publicToken = crypto.randomBytes(16).toString("hex");

    // Tax & Totals computation (strict server calculation)
    let subtotal = 0;
    let discountTotal = 0;
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;

    const calculatedLines = input.lines.map((line) => {
      const qty = Number(line.quantity || 0);
      const rate = Number(line.unitRate || 0);
      const gross = qty * rate;
      const discPct = Number(line.discountPercent || 0);
      const discAmount = (gross * discPct) / 100;
      const taxable = Math.max(0, gross - discAmount);

      const gst = Number(line.gstRate || 0);
      const halfRate = gst / 2;
      const cgst = (taxable * halfRate) / 100;
      const sgst = (taxable * halfRate) / 100;
      const lineTotal = taxable + cgst + sgst;

      subtotal += gross;
      discountTotal += discAmount;
      taxableTotal += taxable;
      cgstTotal += cgst;
      sgstTotal += sgst;

      return {
        itemId: line.itemId,
        itemName: line.itemName,
        hsnCode: line.hsnCode || null,
        uom: line.uom || "Unit",
        quantity: qty.toFixed(3),
        unitRate: rate.toFixed(2),
        discountPercent: discPct.toFixed(2),
        discountAmount: discAmount.toFixed(2),
        taxableAmount: taxable.toFixed(2),
        gstRate: gst.toFixed(2),
        cgstAmount: cgst.toFixed(2),
        sgstAmount: sgst.toFixed(2),
        igstAmount: "0.00",
        lineTotal: lineTotal.toFixed(2),
      };
    });

    const grandBeforeRound = taxableTotal + cgstTotal + sgstTotal;
    const grandRounded = Math.round(grandBeforeRound);
    const roundOff = grandRounded - grandBeforeRound;

    const [createdQuotation] = await db
      .insert(salesQuotations)
      .values({
        organizationId: input.organizationId,
        locationId: input.locationId,
        quotationNumber,
        docType,
        customerId: input.customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone || null,
        customerGstin: input.customerGstin || null,
        billingAddress: input.billingAddress || null,
        issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        paymentTerms: input.paymentTerms || null,
        notes: input.notes || null,
        termsAndConditions: input.termsAndConditions || null,
        subtotalAmount: subtotal.toFixed(2),
        discountAmount: discountTotal.toFixed(2),
        taxableAmount: taxableTotal.toFixed(2),
        cgstAmount: cgstTotal.toFixed(2),
        sgstAmount: sgstTotal.toFixed(2),
        igstAmount: "0.00",
        roundOffAmount: roundOff.toFixed(2),
        grandTotal: grandRounded.toFixed(2),
        publicToken,
        status: "DRAFT",
        isSentToCustomer: false,
      })
      .returning();

    if (calculatedLines.length > 0) {
      await db.insert(salesQuotationLines).values(
        calculatedLines.map((line) => ({
          quotationId: createdQuotation.id,
          ...line,
        }))
      );
    }

    // Fetch organization WhatsApp policy
    const [org] = await db
      .select({
        whatsappDispatchMode: organizations.whatsappDispatchMode,
        whatsappContentFormat: organizations.whatsappContentFormat,
      })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId));

    safeRevalidate("/sales/quotations");
    return {
      success: true,
      data: {
        ...createdQuotation,
        whatsappDispatchMode: org?.whatsappDispatchMode || "WEB_LINK_POPUP",
        whatsappContentFormat: org?.whatsappContentFormat || "TEXT_AND_PDF_LINK",
      },
    };
  } catch (err: any) {
    console.error("createQuotation error:", err);
    return { success: false, error: err.message || "Failed to create quotation" };
  }
}

/**
 * Update an existing quotation (e.g. edit rates, quantities, customer)
 */
export async function updateQuotation(input: UpdateQuotationInput) {
  try {
    const [existing] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.id, input.id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Quotation not found" };
    }

    if (existing.status === "CONVERTED") {
      return { success: false, error: "Cannot edit a quotation that has already been converted to an invoice." };
    }

    // Tax & Totals recalculation
    let subtotal = 0;
    let discountTotal = 0;
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;

    const calculatedLines = input.lines.map((line) => {
      const qty = Number(line.quantity || 0);
      const rate = Number(line.unitRate || 0);
      const gross = qty * rate;
      const discPct = Number(line.discountPercent || 0);
      const discAmount = (gross * discPct) / 100;
      const taxable = Math.max(0, gross - discAmount);

      const gst = Number(line.gstRate || 0);
      const halfRate = gst / 2;
      const cgst = (taxable * halfRate) / 100;
      const sgst = (taxable * halfRate) / 100;
      const lineTotal = taxable + cgst + sgst;

      subtotal += gross;
      discountTotal += discAmount;
      taxableTotal += taxable;
      cgstTotal += cgst;
      sgstTotal += sgst;

      return {
        quotationId: existing.id,
        itemId: line.itemId,
        itemName: line.itemName,
        hsnCode: line.hsnCode || null,
        uom: line.uom || "Unit",
        quantity: qty.toFixed(3),
        unitRate: rate.toFixed(2),
        discountPercent: discPct.toFixed(2),
        discountAmount: discAmount.toFixed(2),
        taxableAmount: taxable.toFixed(2),
        gstRate: gst.toFixed(2),
        cgstAmount: cgst.toFixed(2),
        sgstAmount: sgst.toFixed(2),
        igstAmount: "0.00",
        lineTotal: lineTotal.toFixed(2),
      };
    });

    const grandBeforeRound = taxableTotal + cgstTotal + sgstTotal;
    const grandRounded = Math.round(grandBeforeRound);
    const roundOff = grandRounded - grandBeforeRound;

    await db
      .update(salesQuotations)
      .set({
        customerId: input.customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone || null,
        customerGstin: input.customerGstin || null,
        billingAddress: input.billingAddress || null,
        issueDate: input.issueDate ? new Date(input.issueDate) : existing.issueDate,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        paymentTerms: input.paymentTerms || null,
        notes: input.notes || null,
        termsAndConditions: input.termsAndConditions || null,
        subtotalAmount: subtotal.toFixed(2),
        discountAmount: discountTotal.toFixed(2),
        taxableAmount: taxableTotal.toFixed(2),
        cgstAmount: cgstTotal.toFixed(2),
        sgstAmount: sgstTotal.toFixed(2),
        roundOffAmount: roundOff.toFixed(2),
        grandTotal: grandRounded.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(salesQuotations.id, input.id));

    // Delete existing lines and re-insert
    await db.delete(salesQuotationLines).where(eq(salesQuotationLines.quotationId, input.id));
    if (calculatedLines.length > 0) {
      await db.insert(salesQuotationLines).values(calculatedLines);
    }

    safeRevalidate("/sales/quotations");
    return { success: true };
  } catch (err: any) {
    console.error("updateQuotation error:", err);
    return { success: false, error: err.message || "Failed to update quotation" };
  }
}

/**
 * Mark quotation as sent via WhatsApp
 */
export async function markQuotationAsSent(quotationId: string) {
  try {
    const [existing] = await db
      .select({ status: salesQuotations.status })
      .from(salesQuotations)
      .where(eq(salesQuotations.id, quotationId))
      .limit(1);

    const nextStatus = existing && existing.status === "DRAFT" ? "SENT" : existing?.status || "SENT";

    await db
      .update(salesQuotations)
      .set({
        isSentToCustomer: true,
        sentAt: new Date(),
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(salesQuotations.id, quotationId));

    safeRevalidate("/sales/quotations");
    return { success: true };
  } catch (err: any) {
    console.error("markQuotationAsSent error:", err);
    return { success: false, error: err.message || "Failed to update status" };
  }
}

/**
 * Update quotation general status (e.g. ACCEPTED, DECLINED, EXPIRED)
 */
export async function updateQuotationStatus(quotationId: string, status: string) {
  try {
    await db
      .update(salesQuotations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(salesQuotations.id, quotationId));

    safeRevalidate("/sales/quotations");
    return { success: true };
  } catch (err: any) {
    console.error("updateQuotationStatus error:", err);
    return { success: false, error: err.message || "Failed to update quotation status" };
  }
}

/**
 * Convert Quotation / Proforma directly into a Sales B2B Invoice
 * Preserves line items, rates, taxes, and customer information.
 */
export async function convertQuotationToInvoice(quotationId: string) {
  try {
    const [quotation] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.id, quotationId))
      .limit(1);

    if (!quotation) {
      return { success: false, error: "Quotation not found" };
    }

    if (quotation.status === "CONVERTED" && quotation.convertedInvoiceId) {
      return { success: false, error: "Quotation has already been converted to an invoice." };
    }

    const lines = await db
      .select()
      .from(salesQuotationLines)
      .where(eq(salesQuotationLines.quotationId, quotationId));

    if (lines.length === 0) {
      return { success: false, error: "Cannot convert a quotation with no line items." };
    }

    // Generate unique Invoice Number
    const year = new Date().getFullYear();
    const invoicePrefix = `INV-${year}-`;
    const lastInvoice = await db
      .select({ invoiceNumber: salesInvoices.invoiceNumber })
      .from(salesInvoices)
      .where(ilike(salesInvoices.invoiceNumber, `${invoicePrefix}%`))
      .orderBy(desc(salesInvoices.invoiceNumber))
      .limit(1);

    let nextInvoiceSeq = 1;
    if (lastInvoice.length > 0 && lastInvoice[0].invoiceNumber) {
      const parts = lastInvoice[0].invoiceNumber.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) nextInvoiceSeq = num + 1;
    }
    const invoiceNumber = `${invoicePrefix}${String(nextInvoiceSeq).padStart(4, "0")}`;

    // Create Invoice Record
    const [createdInvoice] = await db
      .insert(salesInvoices)
      .values({
        organizationId: quotation.organizationId,
        locationId: quotation.locationId,
        invoiceNumber,
        invoiceDate: new Date(),
        issueDate: new Date(),
        dueDate: quotation.validUntil || new Date(Date.now() + 15 * 86400000), // Default 15 days
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        customerGstin: quotation.customerGstin,
        billingAddress: quotation.billingAddress,
        subtotalAmount: quotation.subtotalAmount,
        discountAmount: quotation.discountAmount,
        taxableAmount: quotation.taxableAmount,
        cgstAmount: quotation.cgstAmount,
        sgstAmount: quotation.sgstAmount,
        igstAmount: quotation.igstAmount,
        roundOffAmount: quotation.roundOffAmount,
        grandTotal: quotation.grandTotal,
        totalAmount: quotation.grandTotal,
        advancePaid: "0.00",
        balanceDue: quotation.grandTotal,
        paymentStatus: "PENDING",
        paymentMode: "CREDIT",
        status: "ISSUED",
        createdUserId: "SYSTEM",
      })
      .returning();

    // Insert Invoice Lines
    const invoiceLinesToInsert = lines.map((l) => ({
      invoiceId: createdInvoice.id,
      itemId: l.itemId,
      itemDescription: l.itemName,
      description: l.itemName,
      hsnCode: l.hsnCode,
      uom: l.uom,
      quantity: l.quantity,
      unitRate: l.unitRate,
      unitPrice: l.unitRate,
      discountPercent: l.discountPercent,
      discountAmount: l.discountAmount,
      taxableAmount: l.taxableAmount,
      gstRate: l.gstRate,
      cgstAmount: l.cgstAmount,
      sgstAmount: l.sgstAmount,
      igstAmount: l.igstAmount,
      lineTotal: l.lineTotal,
      totalAmount: l.lineTotal,
    }));

    await db.insert(salesInvoiceLines).values(invoiceLinesToInsert);

    // Update Quotation to CONVERTED
    await db
      .update(salesQuotations)
      .set({
        status: "CONVERTED",
        convertedInvoiceId: createdInvoice.id,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(salesQuotations.id, quotationId));

    safeRevalidate("/sales/quotations");
    safeRevalidate("/sales/invoices");
    return {
      success: true,
      data: {
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber,
        grandTotal: createdInvoice.grandTotal,
      },
    };
  } catch (err: any) {
    console.error("convertQuotationToInvoice error:", err);
    return { success: false, error: err.message || "Failed to convert quotation to invoice" };
  }
}

