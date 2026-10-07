import { db } from "@/db";
import { accounts, accountingMappings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createIntegrationJournal, JournalIntegrationPayload } from "./integration";

/**
 * Helper to fetch a designated Control Account by its type.
 */
async function getControlAccount(organizationId: string, controlType: string) {
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.organizationId, organizationId),
        eq(accounts.controlAccountType, controlType)
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`CRITICAL: No control account defined for ${controlType} in this organization.`);
  }
  return account.id;
}

/**
 * Sales Integration Bridge
 * Called when a Sales Invoice is finalized in the Sales Module.
 */
export async function integrateSalesInvoice(
  organizationId: string,
  locationId: string,
  invoiceId: string,
  invoiceNumber: string,
  invoiceDate: string,
  customerId: string,
  totalAmount: number,
  revenueAmount: number,
  taxAmount: number,
  revenueAccountId: string, // Specific revenue account selected in sales
  taxAccountId: string | undefined, // Tax payable liability account
  createdById: string
) {
  // 1. Fetch AR Control Account
  const arAccountId = await getControlAccount(organizationId, 'CUSTOMER_RECEIVABLE');

  // 2. Build Integration Payload
  const lines: JournalIntegrationPayload["lines"] = [
    {
      accountId: arAccountId, // Debit AR (Asset increases by full amount)
      debit: totalAmount,
      credit: 0,
      narration: `AR for Invoice #${invoiceNumber}`,
      partyId: customerId,
      partyType: 'CUSTOMER'
    },
    {
      accountId: revenueAccountId, // Credit Revenue (Revenue increases by subtotal)
      debit: 0,
      credit: revenueAmount,
      narration: `Revenue from Invoice #${invoiceNumber}`
    }
  ];

  if (taxAmount > 0 && taxAccountId) {
    lines.push({
      accountId: taxAccountId, // Credit Tax Payable (Liability increases)
      debit: 0,
      credit: taxAmount,
      narration: `Tax for Invoice #${invoiceNumber}`
    });
  }

  const payload: JournalIntegrationPayload = {
    organizationId,
    locationId,
    sourceModule: 'SALES_INVOICE',
    sourceReferenceId: invoiceId,
    entryDate: invoiceDate,
    narration: `Sales Invoice #${invoiceNumber} for Customer ${customerId}`,
    totalAmount, // Represents the gross total
    createdById,
    lines
  };

  // 3. Post to Finance Engine as PENDING_APPROVAL
  return await createIntegrationJournal(payload, "PENDING_APPROVAL");
}

/**
 * Purchasing Integration Bridge
 * Called when a Vendor Bill/Purchase Invoice is approved.
 */
export async function integrateVendorBill(
  organizationId: string,
  locationId: string,
  billId: string,
  billNumber: string,
  billDate: string,
  vendorId: string,
  totalAmount: number, // Net payable to vendor
  expenseAmount: number, // Subtotal
  taxAmount: number,
  expenseOrInventoryAccountId: string,
  taxReceivableAccountId: string | undefined, // Input tax asset
  createdById: string
) {
  // 1. Fetch AP Control Account
  const apAccountId = await getControlAccount(organizationId, 'VENDOR_PAYABLE');

  // 2. Build Payload
  const lines: JournalIntegrationPayload["lines"] = [
    {
      accountId: expenseOrInventoryAccountId, // Debit Expense/Inventory (Asset/Expense increases)
      debit: expenseAmount,
      credit: 0,
      narration: `Expense/Inventory for Bill #${billNumber}`
    },
    {
      accountId: apAccountId, // Credit AP (Liability increases)
      debit: 0,
      credit: totalAmount,
      narration: `AP for Bill #${billNumber}`,
      partyId: vendorId,
      partyType: 'VENDOR'
    }
  ];

  if (taxAmount > 0 && taxReceivableAccountId) {
    lines.push({
      accountId: taxReceivableAccountId, // Debit Input Tax Asset
      debit: taxAmount,
      credit: 0,
      narration: `Input Tax for Bill #${billNumber}`
    });
  }

  const payload: JournalIntegrationPayload = {
    organizationId,
    locationId,
    sourceModule: 'PURCHASE_BILL',
    sourceReferenceId: billId,
    entryDate: billDate,
    narration: `Vendor Bill #${billNumber} from Vendor ${vendorId}`,
    totalAmount, // Gross total
    createdById,
    lines
  };

  return await createIntegrationJournal(payload, "PENDING_APPROVAL");
}

/**
 * Inventory Integration Bridge
 * Called when raw materials are consumed for production or sold.
 */
export async function integrateInventoryConsumption(
  organizationId: string,
  locationId: string,
  consumptionId: string,
  consumptionDate: string,
  totalCost: number,
  inventoryAssetAccountId: string,
  cogsAccountId: string,
  createdById: string
) {
  const payload: JournalIntegrationPayload = {
    organizationId,
    locationId,
    sourceModule: 'INVENTORY_CONSUMPTION',
    sourceReferenceId: consumptionId,
    entryDate: consumptionDate,
    narration: `Inventory Consumption Record #${consumptionId}`,
    totalAmount: totalCost,
    createdById,
    lines: [
      {
        accountId: cogsAccountId, // Debit COGS (Expense increases)
        debit: totalCost,
        credit: 0,
        narration: `COGS recognized`
      },
      {
        accountId: inventoryAssetAccountId, // Credit Inventory (Asset decreases)
        debit: 0,
        credit: totalCost,
        narration: `Inventory asset reduced`
      }
    ]
  };

  return await createIntegrationJournal(payload, "PENDING_APPROVAL");
}

/**
 * Customer Payment Integration Bridge
 * Called when a payment is received from a customer for an invoice.
 */
export async function integrateCustomerPayment(
  organizationId: string,
  locationId: string,
  paymentId: string,
  paymentNumber: string,
  paymentDate: string,
  customerId: string,
  totalAmount: number,
  bankAccountId: string, // Specific bank/cash account
  createdById: string
) {
  const arAccountId = await getControlAccount(organizationId, 'CUSTOMER_RECEIVABLE');

  const payload: JournalIntegrationPayload = {
    organizationId,
    locationId,
    sourceModule: 'SALES_RECEIPT',
    sourceReferenceId: paymentId,
    entryDate: paymentDate,
    narration: `Customer Payment #${paymentNumber} from Customer ${customerId}`,
    totalAmount,
    createdById,
    lines: [
      {
        accountId: bankAccountId, // Debit Bank (Asset increases)
        debit: totalAmount,
        credit: 0,
        narration: `Cash Received from Customer`
      },
      {
        accountId: arAccountId, // Credit AR (Asset decreases)
        debit: 0,
        credit: totalAmount,
        narration: `AR settlement for Payment #${paymentNumber}`,
        partyId: customerId,
        partyType: 'CUSTOMER'
      }
    ]
  };

  return await createIntegrationJournal(payload, "PENDING_APPROVAL");
}

/**
 * Vendor Payment Integration Bridge
 * Called when a payment is sent to a vendor for a bill.
 */
export async function integrateVendorPayment(
  organizationId: string,
  locationId: string,
  paymentId: string,
  paymentNumber: string,
  paymentDate: string,
  vendorId: string,
  totalAmount: number,
  bankAccountId: string, // Specific bank/cash account
  createdById: string
) {
  const apAccountId = await getControlAccount(organizationId, 'VENDOR_PAYABLE');

  const payload: JournalIntegrationPayload = {
    organizationId,
    locationId,
    sourceModule: 'PURCHASE_PAYMENT',
    sourceReferenceId: paymentId,
    entryDate: paymentDate,
    narration: `Vendor Payment #${paymentNumber} to Vendor ${vendorId}`,
    totalAmount,
    createdById,
    lines: [
      {
        accountId: apAccountId, // Debit AP (Liability decreases)
        debit: totalAmount,
        credit: 0,
        narration: `AP settlement for Payment #${paymentNumber}`,
        partyId: vendorId,
        partyType: 'VENDOR'
      },
      {
        accountId: bankAccountId, // Credit Bank (Asset decreases)
        debit: 0,
        credit: totalAmount,
        narration: `Cash Paid to Vendor`
      }
    ]
  };

  return await createIntegrationJournal(payload, "PENDING_APPROVAL");
}
