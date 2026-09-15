import { db } from "@/db";
import {
  salesImportBatches,
  salesTransactions,
  salesTransactionLines,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import * as xlsx from "xlsx";
import crypto from "crypto";
import { getActiveImportFields } from "@/domains/settings/import-fields.service";

/**
 * Normalizes TMBill Excel data into our schema
 */
export async function processTMBillExcelUpload(
  fileBuffer: Buffer,
  organizationId: string,
  locationId: string,
  userId: string,
  mappingConfig: Record<string, string>,
  headerRowIndex: number
) {
  // Read workbook
  const wb = xlsx.read(fileBuffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  // Validate Mandatory Fields
  const fields = await getActiveImportFields(organizationId, "SALES_TRANSACTION");
  const missingMandatory: string[] = [];
  fields.forEach(f => {
    if (f.isMandatory && (mappingConfig[f.internalKey] === "" || mappingConfig[f.internalKey] === undefined)) {
      missingMandatory.push(f.displayName);
    }
  });

  if (missingMandatory.length > 0) {
    throw new Error(`Missing mandatory mappings: ${missingMandatory.join(", ")}`);
  }

  // Map to hold bills and their child items
  const bills: any[] = [];
  let currentBill: any = null;
  let hasItems = false;

  // Data starts after header row
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const getVal = (field: string) => {
      const idxStr = mappingConfig[field];
      if (idxStr === "" || idxStr === undefined) return undefined;
      const idx = parseInt(idxStr, 10);
      return row[idx];
    };

    const billNo = getVal("bill_number");
    
    if (billNo) {
      // New Bill
      const orderDate = getVal("date") || "";
      const orderTime = getVal("time") || "";
      let billTimestamp = new Date(orderDate + " " + orderTime);
      if (isNaN(billTimestamp.getTime())) billTimestamp = new Date(); // fallback

      currentBill = {
        id: crypto.randomUUID(),
        sourceBillId: String(billNo),
        billTimestamp,
        customerName: getVal("customer_name") ? String(getVal("customer_name")) : null,
        customerContact: getVal("customer_mobile") ? String(getVal("customer_mobile")) : null,
        captainName: getVal("captain") ? String(getVal("captain")) : null,
        orderType: null, 
        grossAmount: 0, 
        discountAmount: 0, 
        taxAmount: 0, 
        otherCharges: 0, 
        netAmount: 0, 
        paymentMethod: null, 
        items: [],
      };
      bills.push(currentBill);
    } else if (currentBill) {
      // It's a child Item row for the current bill
      const itemName = getVal("item");
      if (itemName) {
        hasItems = true;
        const qty = Number(getVal("quantity") || 0);
        const price = Number(getVal("sales_amount") || 0);
        currentBill.items.push({
          id: crypto.randomUUID(),
          transactionId: currentBill.id,
          itemName: String(itemName),
          category: getVal("category") ? String(getVal("category")) : null,
          quantity: qty,
          unitPrice: price,
          lineTotal: qty * price,
        });
        
        // Accumulate amounts dynamically if they were not provided at bill level
        currentBill.netAmount += qty * price;
        currentBill.grossAmount = currentBill.netAmount; // Simplified aggregation
      }
    }
  }

  if (!hasItems) {
    throw new Error("No items were found based on the provided mapping. Ensure 'Item Name' is correctly mapped and the file contains line items.");
  }

  // Deduplication & Database Transaction
  return await db.transaction(async (tx) => {
    // 1. Create a Batch
    const batchId = crypto.randomUUID();
    await tx.insert(salesImportBatches).values({
      id: batchId,
      organizationId,
      locationId,
      sourceSystem: "TMBILL_EXCEL",
      operatingDate: bills.length > 0 ? bills[0].billTimestamp : new Date(),
      status: "VALIDATED",
      recordedBy: userId,
    });

    let newBillsCount = 0;
    let duplicateBillsCount = 0;

    for (const bill of bills) {
      // Check for duplicate
      const [existing] = await tx
        .select()
        .from(salesTransactions)
        .where(
          and(
            eq(salesTransactions.locationId, locationId),
            eq(salesTransactions.sourceSystem, "TMBILL_EXCEL"),
            eq(salesTransactions.sourceBillId, bill.sourceBillId)
          )
        )
        .limit(1);

      if (existing) {
        duplicateBillsCount++;
        continue;
      }

      // Insert Bill
      await tx.insert(salesTransactions).values({
        id: bill.id,
        organizationId,
        locationId,
        batchId: batchId,
        sourceSystem: "TMBILL_EXCEL",
        sourceBillId: bill.sourceBillId,
        billTimestamp: bill.billTimestamp,
        customerName: bill.customerName,
        customerContact: bill.customerContact,
        captainName: bill.captainName,
        orderType: bill.orderType,
        grossAmount: String(bill.grossAmount),
        discountAmount: String(bill.discountAmount),
        taxAmount: String(bill.taxAmount),
        otherCharges: String(bill.otherCharges),
        netAmount: String(bill.netAmount),
        paymentMethod: bill.paymentMethod,
      });

      newBillsCount++;

      // Insert Items
      if (bill.items.length > 0) {
        await tx.insert(salesTransactionLines).values(
          bill.items.map((i: any) => ({
            id: i.id,
            organizationId,
            locationId,
            transactionId: i.transactionId,
            itemName: i.itemName,
            category: i.category,
            quantity: String(i.quantity),
            unitPrice: String(i.unitPrice),
            lineTotal: String(i.lineTotal),
          }))
        );
      }
    }

    return {
      batchId,
      totalProcessed: bills.length,
      newInserted: newBillsCount,
      duplicatesSkipped: duplicateBillsCount,
    };
  });
}

/**
 * Reconciles the batch (can be extended with complex logic later)
 */
export async function reconcileSalesBatch(batchId: string) {
  await db
    .update(salesImportBatches)
    .set({ status: "RECONCILED" })
    .where(eq(salesImportBatches.id, batchId));
}

export async function getRecentSalesBatches(locationId: string) {
  return await db
    .select()
    .from(salesImportBatches)
    .where(eq(salesImportBatches.locationId, locationId))
    .orderBy(desc(salesImportBatches.importTimestamp))
    .limit(10);
}

export async function getSalesStats(locationId: string) {
  const txs = await db
    .select({ netAmount: salesTransactions.netAmount })
    .from(salesTransactions)
    .where(eq(salesTransactions.locationId, locationId));

  const totalAmount = txs.reduce((sum, tx) => sum + Number(tx.netAmount), 0);
  const totalBills = txs.length;

  return { totalAmount, totalBills };
}
