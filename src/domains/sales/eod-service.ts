import { db } from "@/db";
import { 
  dayCloseRecords, 
  dayCloseCashDenominations, 
  dayCloseFinancialSummaries,
  salesTransactions
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { processAccountingEvent } from "@/domains/finance/event-engine";

export interface EODDenomination {
  denomination: number;
  count: number;
}

export async function closeDay(
  organizationId: string, 
  locationId: string, 
  date: string, 
  userId: string,
  denominations: EODDenomination[]
) {
  return await db.transaction(async (tx) => {
    // 1. Check if already closed
    const [existing] = await tx
      .select()
      .from(dayCloseRecords)
      .where(
        and(
          eq(dayCloseRecords.organizationId, organizationId),
          eq(dayCloseRecords.locationId, locationId),
          eq(dayCloseRecords.date, date)
        )
      )
      .limit(1);

    if (existing) {
      throw new Error(`Day ${date} is already closed for this location.`);
    }

    // 2. Fetch System Expected Cash
    const sales = await tx
      .select({
        paymentMethod: salesTransactions.paymentMethod,
        netAmount: salesTransactions.netAmount,
        taxAmount: salesTransactions.taxAmount,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.organizationId, organizationId),
          eq(salesTransactions.locationId, locationId),
          sql`DATE(${salesTransactions.billTimestamp}) = DATE(${date})`
        )
      );

    let systemExpectedCash = 0;
    const paymentMethodTotals: Record<string, number> = {};

    for (const sale of sales) {
      const method = (sale.paymentMethod || "CASH").toUpperCase();
      const amount = parseFloat(sale.netAmount);
      if (!paymentMethodTotals[method]) paymentMethodTotals[method] = 0;
      paymentMethodTotals[method] += amount;

      if (method === "CASH") {
        systemExpectedCash += amount;
      }
    }

    // 3. Calculate Physical Cash
    let actualDeclaredCash = 0;
    for (const d of denominations) {
      actualDeclaredCash += d.denomination * d.count;
    }

    const varianceAmount = actualDeclaredCash - systemExpectedCash;

    // 4. Lock the Day
    const [dayClose] = await tx
      .insert(dayCloseRecords)
      .values({
        organizationId,
        locationId,
        date,
        closedByUserId: userId,
      })
      .returning();

    // 5. Save Denominations
    if (denominations.length > 0) {
      await tx.insert(dayCloseCashDenominations).values(
        denominations.map((d) => ({
          dayCloseId: dayClose.id,
          denomination: d.denomination,
          count: d.count,
          totalAmount: (d.denomination * d.count).toString(),
        }))
      );
    }

    // 6. Save Financial Summaries
    const summariesToInsert = [];
    // Save Cash Summary
    summariesToInsert.push({
      dayCloseId: dayClose.id,
      paymentMethod: "CASH",
      systemExpectedAmount: systemExpectedCash.toString(),
      actualDeclaredAmount: actualDeclaredCash.toString(),
      varianceAmount: varianceAmount.toString()
    });

    // Save Non-Cash Summaries (Expected vs Declared)
    // Non-cash typically matches exactly unless reconciled otherwise, but for now we lock the expectation.
    for (const [method, amount] of Object.entries(paymentMethodTotals)) {
      if (method !== "CASH") {
        summariesToInsert.push({
          dayCloseId: dayClose.id,
          paymentMethod: method,
          systemExpectedAmount: amount.toString(),
          actualDeclaredAmount: amount.toString(), // Assumption for non-cash
          varianceAmount: "0"
        });
      }
    }

    if (summariesToInsert.length > 0) {
      await tx.insert(dayCloseFinancialSummaries).values(summariesToInsert);
    }

    // 7. Fire Accounting Event for Day's Sales
    const totalCollected = Object.values(paymentMethodTotals).reduce((sum, amt) => sum + amt, 0);

    if (totalCollected > 0) {
      const totalTax = sales.reduce((sum, sale) => sum + parseFloat(sale.taxAmount || "0"), 0);
      const netRevenue = totalCollected - totalTax;

      const salesLines: any[] = [];
      
      if (netRevenue > 0) {
        salesLines.push({
          mappingType: "SYSTEM_DEFAULT",
          sourceReferenceId: "SALES_REVENUE",
          amount: netRevenue,
          isDebit: false, // Credit Revenue
          narration: `Net Sales Revenue for ${date}`
        });
      }

      if (totalTax > 0) {
        salesLines.push({
          mappingType: "SYSTEM_DEFAULT",
          sourceReferenceId: "TAX_PAYABLE",
          amount: totalTax,
          isDebit: false, // Credit Liability
          narration: `Sales Tax Collected for ${date}`
        });
      }

      for (const [method, amount] of Object.entries(paymentMethodTotals)) {
        if (amount > 0) {
          salesLines.push({
            mappingType: "PAYMENT_METHOD", 
            sourceReferenceId: method,
            amount: amount,
            isDebit: true, // Debit Asset (Cash/Bank/AR)
            narration: `${method} Collection for ${date}`
          });
        }
      }

      await processAccountingEvent({
        organizationId,
        locationId,
        triggeredByUserId: userId,
        sourceModule: "SALES" as any,
        sourceReferenceId: dayClose.id,
        entryDate: new Date(date),
        narration: `Daily Sales Sync for ${date}`,
        lines: salesLines
      });
    }

    // 8. Fire Accounting Event for Cash Variance
    if (varianceAmount !== 0) {
      const isShortage = varianceAmount < 0;
      const absVariance = Math.abs(varianceAmount);

      await processAccountingEvent({
        organizationId,
        locationId,
        triggeredByUserId: userId,
        sourceModule: "SALES" as any,
        sourceReferenceId: dayClose.id,
        entryDate: new Date(date),
        narration: `EOD Cash ${isShortage ? 'Shortage' : 'Overage'} for ${date}`,
        lines: [
          {
            mappingType: "SYSTEM_DEFAULT",
            sourceReferenceId: isShortage ? "CASH_SHORTAGE_EXPENSE" : "BANK_CASH",
            amount: absVariance,
            isDebit: true,
            narration: isShortage ? "Cash Shortage (Expense)" : "Cash Overage (Asset)"
          },
          {
            mappingType: "SYSTEM_DEFAULT",
            sourceReferenceId: isShortage ? "BANK_CASH" : "CASH_OVERAGE_REVENUE",
            amount: absVariance,
            isDebit: false,
            narration: isShortage ? "Cash Adjustment (Asset)" : "Cash Overage (Revenue)"
          }
        ]
      });
    }

    return {
      success: true,
      data: {
        systemExpectedCash,
        actualDeclaredCash,
        varianceAmount
      }
    };
  });
}
