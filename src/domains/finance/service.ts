import { and, desc, eq, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  supplierInvoices,
  payments,
  paymentAllocations,
  vendorLedger,
} from "@/db/schema";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions, type EmployeePermission } from "@/lib/authorization-policy";

type Actor = { id: string } | null;

export class FinanceServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "AUTHENTICATION_REQUIRED"
      | "ACCESS_DENIED"
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "DUPLICATE_RECORD"
  ) {
    super(message);
    this.name = "FinanceServiceError";
  }
}

function requireActor(actor: Actor): asserts actor is { id: string } {
  if (!actor) throw new FinanceServiceError("Authentication required", "AUTHENTICATION_REQUIRED");
}

async function requireScopeAccess(
  actor: { id: string },
  scope: { organizationId: string; locationId: string },
  permission: EmployeePermission,
) {
  const allowed = await authorizeEmployeeOperation({ userId: actor.id, ...scope, permission });
  if (!allowed) throw new FinanceServiceError("Access denied", "ACCESS_DENIED");
}

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

const recordInvoiceSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
  invoiceNumber: z.string().trim().min(1).max(200),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime().nullable().optional(),
  totalAmount: z.number().positive(),
  recordedByEmployeeId: z.string().uuid(),
}).strict();

export type RecordInvoiceInput = z.infer<typeof recordInvoiceSchema>;

export async function recordSupplierInvoice(actor: Actor, input: RecordInvoiceInput) {
  requireActor(actor);
  const parsed = recordInvoiceSchema.safeParse(input);
  if (!parsed.success) throw new FinanceServiceError("Invalid invoice input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);

  return await db.transaction(async (tx) => {
    // 1. Check for duplicate invoice
    const existing = await tx.select().from(supplierInvoices).where(
      and(
        eq(supplierInvoices.vendorId, parsed.data.vendorId),
        eq(supplierInvoices.invoiceNumber, parsed.data.invoiceNumber)
      )
    );
    
    if (existing.length > 0) {
      throw new FinanceServiceError("An invoice with this number already exists for this vendor.", "DUPLICATE_RECORD");
    }

    // 2. Get the vendor's latest ledger balance securely
    const [latestLedger] = await tx
      .select({ balanceAfter: vendorLedger.balanceAfter })
      .from(vendorLedger)
      .where(and(
        eq(vendorLedger.organizationId, parsed.data.organizationId),
        eq(vendorLedger.vendorId, parsed.data.vendorId)
      ))
      .orderBy(desc(vendorLedger.recordedAt))
      .for("update")
      .limit(1);

    const currentBalance = latestLedger ? parseFloat(latestLedger.balanceAfter) : 0;
    const newBalance = currentBalance + parsed.data.totalAmount;

    // 3. Create the Invoice
    const [invoice] = await tx
      .insert(supplierInvoices)
      .values({
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        vendorId: parsed.data.vendorId,
        invoiceNumber: parsed.data.invoiceNumber,
        invoiceDate: parsed.data.invoiceDate,
        dueDate: parsed.data.dueDate ?? null,
        totalAmount: parsed.data.totalAmount.toString(),
        status: "APPROVED",
        recordedBy: parsed.data.recordedByEmployeeId,
      })
      .returning();

    // 4. Append to Ledger
    await tx.insert(vendorLedger).values({
      organizationId: parsed.data.organizationId,
      locationId: parsed.data.locationId,
      vendorId: parsed.data.vendorId,
      eventType: "INVOICE",
      amountChange: parsed.data.totalAmount.toString(),
      balanceAfter: newBalance.toFixed(4),
      referenceId: invoice.id,
      notes: `Invoice ${parsed.data.invoiceNumber}`,
      recordedBy: parsed.data.recordedByEmployeeId,
    });

    return invoice;
  });
}

const recordPaymentSchema = scopeSchema.extend({
  vendorId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string().datetime(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "UPI"]),
  referenceDetails: z.string().nullable().optional(),
  recordedByEmployeeId: z.string().uuid(),
  allocations: z.array(z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
  })),
}).strict();

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export async function recordPaymentAndAllocate(actor: Actor, input: RecordPaymentInput) {
  requireActor(actor);
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) throw new FinanceServiceError("Invalid payment input", "INVALID_INPUT");
  
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);

  return await db.transaction(async (tx) => {
    // 1. Validate allocations total
    const totalAllocated = parsed.data.allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalAllocated > parsed.data.amount) {
      throw new FinanceServiceError("Total allocated amount exceeds the payment amount.", "INVALID_INPUT");
    }

    // 2. Validate individual invoices
    for (const alloc of parsed.data.allocations) {
      if (alloc.amount <= 0) continue;
      
      const [invoice] = await tx
        .select()
        .from(supplierInvoices)
        .where(
          and(
            eq(supplierInvoices.id, alloc.invoiceId),
            eq(supplierInvoices.vendorId, parsed.data.vendorId)
          )
        )
        .for("update");
        
      if (!invoice) throw new FinanceServiceError(`Invoice not found: ${alloc.invoiceId}`, "NOT_FOUND");
      
      const allocationsForInvoice = await tx
        .select({ total: sum(paymentAllocations.amountAllocated) })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, invoice.id));
        
      const previouslyPaid = allocationsForInvoice[0]?.total ? parseFloat(allocationsForInvoice[0].total) : 0;
      const invoiceTotal = parseFloat(invoice.totalAmount);
      
      if (previouslyPaid + alloc.amount > invoiceTotal) {
        throw new FinanceServiceError(`Allocation of ${alloc.amount} to Invoice ${invoice.invoiceNumber} exceeds its remaining balance.`, "INVALID_INPUT");
      }
    }

    // 3. Create Payment
    const [payment] = await tx
      .insert(payments)
      .values({
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        vendorId: parsed.data.vendorId,
        amount: parsed.data.amount.toString(),
        paymentDate: parsed.data.paymentDate,
        paymentMode: parsed.data.paymentMode,
        referenceDetails: parsed.data.referenceDetails,
        recordedBy: parsed.data.recordedByEmployeeId,
      })
      .returning();

    // 4. Create Allocations & Update Invoice Statuses
    for (const alloc of parsed.data.allocations) {
      if (alloc.amount <= 0) continue;
      
      await tx.insert(paymentAllocations).values({
        organizationId: parsed.data.organizationId,
        paymentId: payment.id,
        invoiceId: alloc.invoiceId,
        amountAllocated: alloc.amount.toString(),
      });
      
      const [invoice] = await tx
        .select()
        .from(supplierInvoices)
        .where(eq(supplierInvoices.id, alloc.invoiceId));
        
      const allocationsForInvoice = await tx
        .select({ total: sum(paymentAllocations.amountAllocated) })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, invoice.id));
        
      const totalPaid = allocationsForInvoice[0]?.total ? parseFloat(allocationsForInvoice[0].total) : 0;
      const invoiceTotal = parseFloat(invoice.totalAmount);
      
      const newStatus = totalPaid >= invoiceTotal ? "PAID" : "PARTIAL";
      await tx
        .update(supplierInvoices)
        .set({ status: newStatus })
        .where(eq(supplierInvoices.id, invoice.id));
    }

    // 5. Append to Ledger (Payment decreases balance)
    const [latestLedger] = await tx
      .select({ balanceAfter: vendorLedger.balanceAfter })
      .from(vendorLedger)
      .where(and(
        eq(vendorLedger.organizationId, parsed.data.organizationId),
        eq(vendorLedger.vendorId, parsed.data.vendorId)
      ))
      .orderBy(desc(vendorLedger.recordedAt))
      .for("update")
      .limit(1);

    const currentBalance = latestLedger ? parseFloat(latestLedger.balanceAfter) : 0;
    const newBalance = currentBalance - parsed.data.amount;

    await tx.insert(vendorLedger).values({
      organizationId: parsed.data.organizationId,
      locationId: parsed.data.locationId,
      vendorId: parsed.data.vendorId,
      eventType: "PAYMENT",
      amountChange: (-parsed.data.amount).toString(),
      balanceAfter: newBalance.toFixed(4),
      referenceId: payment.id,
      notes: `Payment via ${parsed.data.paymentMode}`,
      recordedBy: parsed.data.recordedByEmployeeId,
    });

    return payment;
  });
}

export async function getVendorInvoices(actor: Actor, scope: z.infer<typeof scopeSchema>, vendorId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(vendorId).success) {
    throw new FinanceServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, employeePermissions.read);

  return await db
    .select()
    .from(supplierInvoices)
    .where(
      and(
        eq(supplierInvoices.organizationId, scope.organizationId),
        eq(supplierInvoices.locationId, scope.locationId),
        eq(supplierInvoices.vendorId, vendorId)
      )
    )
    .orderBy(desc(supplierInvoices.invoiceDate));
}

export async function getVendorLedger(actor: Actor, scope: z.infer<typeof scopeSchema>, vendorId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(vendorId).success) {
    throw new FinanceServiceError("Invalid input", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, employeePermissions.read);

  return await db
    .select()
    .from(vendorLedger)
    .where(
      and(
        eq(vendorLedger.organizationId, scope.organizationId),
        eq(vendorLedger.locationId, scope.locationId),
        eq(vendorLedger.vendorId, vendorId)
      )
    )
    .orderBy(desc(vendorLedger.recordedAt));
}
