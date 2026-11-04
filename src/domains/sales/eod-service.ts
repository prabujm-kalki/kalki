import { db } from "@/db";
import { 
  dayCloseRecords, 
  dayCloseCashDenominations, 
  dayCloseFinancialSummaries,
  salesTransactions,
  salesReceipts,
  tmbillOrders,
  spotPurchases,
  journalEntries
} from "@/db/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { processAccountingEvent } from "@/domains/finance/event-engine";

export interface EODDenomination {
  denomination: number;
  count: number;
}

/**
 * Pre-fills the Day Close screen with:
 * 1. Yesterday's closing cash in hand (becomes Today's Opening Balance)
 * 2. Today's recorded spot purchases / expenses (Cash vs UPI)
 * 3. System Expected Sales summary from TMBill
 */
export async function getDayCloseContext(
  organizationId: string,
  locationId: string,
  date: string
) {
  // 1. Fetch previous day's close for this location to get opening cash float
  const [previousClose] = await db
    .select({
      closingCashInHand: dayCloseRecords.closingCashInHand,
      actualDeclaredCash: dayCloseFinancialSummaries.actualDeclaredAmount,
      date: dayCloseRecords.date
    })
    .from(dayCloseRecords)
    .leftJoin(
      dayCloseFinancialSummaries,
      and(
        eq(dayCloseFinancialSummaries.dayCloseId, dayCloseRecords.id),
        eq(dayCloseFinancialSummaries.paymentMethod, "CASH")
      )
    )
    .where(
      and(
        eq(dayCloseRecords.organizationId, organizationId),
        eq(dayCloseRecords.locationId, locationId),
        sql`${dayCloseRecords.date} < ${date}`
      )
    )
    .orderBy(desc(dayCloseRecords.date))
    .limit(1);

  const openingCash = previousClose
    ? parseFloat(previousClose.closingCashInHand || previousClose.actualDeclaredCash || "0")
    : 0;

  // 2. Fetch Today's Spot Purchases / Petty Expenses for this location
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const expenses = await db
    .select({
      id: spotPurchases.id,
      voucherNumber: spotPurchases.voucherNumber,
      vendorName: spotPurchases.vendorName,
      totalAmount: spotPurchases.totalAmount,
      paymentSource: spotPurchases.paymentSource,
      auditStatus: spotPurchases.auditStatus
    })
    .from(spotPurchases)
    .where(
      and(
        eq(spotPurchases.organizationId, organizationId),
        eq(spotPurchases.locationId, locationId),
        gte(spotPurchases.createdAt, startOfDay),
        lte(spotPurchases.createdAt, endOfDay)
      )
    );

  let cashExpenses = 0;
  let upiExpenses = 0;

  for (const exp of expenses) {
    const amt = parseFloat(exp.totalAmount || "0");
    const source = (exp.paymentSource || "PETTY_CASH").toUpperCase();
    if (source.includes("UPI") || source.includes("ONLINE") || source.includes("GPay") || source.includes("PHONEPE")) {
      upiExpenses += amt;
    } else {
      // Default to Cash/Petty Cash/Cashier Drawer
      cashExpenses += amt;
    }
  }

  // 3. Fetch Today's System Sales from TMBill (Querying salesReceipts primary source)
  const receipts = await db
    .select({
      paymentMethod: salesReceipts.paymentMethod,
      amount: salesReceipts.amount,
    })
    .from(salesReceipts)
    .where(
      and(
        eq(salesReceipts.organizationId, organizationId),
        eq(salesReceipts.locationId, locationId),
        sql`DATE(timezone('Asia/Kolkata', ${salesReceipts.receiptDate})) = DATE(${date})`
      )
    );

  let systemCashSales = 0;
  let systemUpiSales = 0;
  let systemOtherSales = 0;
  let totalSystemSales = 0;

  if (receipts.length > 0) {
    for (const r of receipts) {
      const method = (r.paymentMethod || "CASH").toUpperCase();
      const amount = parseFloat(r.amount || "0");
      totalSystemSales += amount;

      if (method === "CASH") {
        systemCashSales += amount;
      } else if (
        method.includes("UPI") ||
        method.includes("PAYTM") ||
        method.includes("GPAY") ||
        method.includes("PHONEPE") ||
        method.includes("QR") ||
        method.includes("CARD")
      ) {
        systemUpiSales += amount;
      } else {
        systemOtherSales += amount;
      }
    }
  } else {
    // Fallback to salesTransactions if available
    const sales = await db
      .select({
        paymentMethod: salesTransactions.paymentMethod,
        netAmount: salesTransactions.netAmount,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.organizationId, organizationId),
          eq(salesTransactions.locationId, locationId),
          sql`DATE(timezone('Asia/Kolkata', ${salesTransactions.billTimestamp})) = DATE(${date})`
        )
      );

    for (const sale of sales) {
      const method = (sale.paymentMethod || "CASH").toUpperCase();
      const amount = parseFloat(sale.netAmount || "0");
      totalSystemSales += amount;

      if (method === "CASH") {
        systemCashSales += amount;
      } else if (
        method.includes("UPI") ||
        method.includes("PAYTM") ||
        method.includes("GPAY") ||
        method.includes("PHONEPE") ||
        method.includes("QR") ||
        method.includes("CARD")
      ) {
        systemUpiSales += amount;
      } else {
        systemOtherSales += amount;
      }
    }
  }

  // Check if day is already closed
  const [alreadyClosed] = await db
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

  return {
    isClosed: !!alreadyClosed,
    closedRecord: alreadyClosed || null,
    openingCash,
    cashExpenses,
    upiExpenses,
    expensesList: expenses,
    systemSales: {
      cash: systemCashSales,
      upi: systemUpiSales,
      other: systemOtherSales,
      total: totalSystemSales
    }
  };
}

export async function unlockDayClose(
  organizationId: string,
  locationId: string,
  date: string,
  userId: string
) {
  return await db.transaction(async (tx) => {
    // 1. Find the day close record
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

    if (!existing) {
      throw new Error(`No day close record found for date ${date}.`);
    }

    // 2. Cascade delete linked journal entries posted by this day close
    // In event-engine, dayClose.id is passed as sourceReferenceId with sourceModule = 'SALES'
    const linkedJournals = await tx
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.sourceModule, "SALES"),
          eq(journalEntries.sourceReferenceId, existing.id)
        )
      );

    for (const j of linkedJournals) {
      await tx.delete(journalEntries).where(eq(journalEntries.id, j.id));
    }

    // 3. Delete the day close record (cascades to cash denominations & financial summaries)
    await tx.delete(dayCloseRecords).where(eq(dayCloseRecords.id, existing.id));

    return { success: true };
  });
}

export async function closeDay(
  organizationId: string, 
  locationId: string, 
  date: string, 
  userId: string,
  denominations: EODDenomination[],
  declaredUpi: number = 0,
  openingCashOverride?: number
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

    // 2. Fetch Opening Cash if not overridden
    let openingCash = openingCashOverride ?? 0;
    if (openingCashOverride === undefined) {
      const [previousClose] = await tx
        .select({
          closingCashInHand: dayCloseRecords.closingCashInHand,
        })
        .from(dayCloseRecords)
        .where(
          and(
            eq(dayCloseRecords.organizationId, organizationId),
            eq(dayCloseRecords.locationId, locationId),
            sql`${dayCloseRecords.date} < ${date}`
          )
        )
        .orderBy(desc(dayCloseRecords.date))
        .limit(1);

      if (previousClose && previousClose.closingCashInHand) {
        openingCash = parseFloat(previousClose.closingCashInHand);
      }
    }

    // 3. Fetch Today's Spot Purchases / Expenses
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const expenses = await tx
      .select({
        totalAmount: spotPurchases.totalAmount,
        paymentSource: spotPurchases.paymentSource
      })
      .from(spotPurchases)
      .where(
        and(
          eq(spotPurchases.organizationId, organizationId),
          eq(spotPurchases.locationId, locationId),
          gte(spotPurchases.createdAt, startOfDay),
          lte(spotPurchases.createdAt, endOfDay)
        )
      );

    let cashExpenses = 0;
    let upiExpenses = 0;
    for (const exp of expenses) {
      const amt = parseFloat(exp.totalAmount || "0");
      const src = (exp.paymentSource || "PETTY_CASH").toUpperCase();
      if (src.includes("UPI") || src.includes("ONLINE") || src.includes("GPAY") || src.includes("PHONEPE")) {
        upiExpenses += amt;
      } else {
        cashExpenses += amt;
      }
    }

    // 4. Fetch System Sales from TMBill (Querying salesReceipts primary source)
    const receipts = await tx
      .select({
        paymentMethod: salesReceipts.paymentMethod,
        amount: salesReceipts.amount,
      })
      .from(salesReceipts)
      .where(
        and(
          eq(salesReceipts.organizationId, organizationId),
          eq(salesReceipts.locationId, locationId),
          sql`DATE(timezone('Asia/Kolkata', ${salesReceipts.receiptDate})) = DATE(${date})`
        )
      );

    let systemExpectedCash = 0;
    let systemExpectedUpi = 0;
    const paymentMethodTotals: Record<string, number> = {};

    if (receipts.length > 0) {
      for (const r of receipts) {
        const method = (r.paymentMethod || "CASH").toUpperCase();
        const amount = parseFloat(r.amount || "0");
        if (!paymentMethodTotals[method]) paymentMethodTotals[method] = 0;
        paymentMethodTotals[method] += amount;

        if (method === "CASH") {
          systemExpectedCash += amount;
        } else if (
          method.includes("UPI") ||
          method.includes("PAYTM") ||
          method.includes("GPAY") ||
          method.includes("PHONEPE") ||
          method.includes("QR") ||
          method.includes("CARD")
        ) {
          systemExpectedUpi += amount;
        }
      }
    } else {
      // Fallback to salesTransactions if available
      const sales = await tx
        .select({
          paymentMethod: salesTransactions.paymentMethod,
          netAmount: salesTransactions.netAmount,
        })
        .from(salesTransactions)
        .where(
          and(
            eq(salesTransactions.organizationId, organizationId),
            eq(salesTransactions.locationId, locationId),
            sql`DATE(timezone('Asia/Kolkata', ${salesTransactions.billTimestamp})) = DATE(${date})`
          )
        );

      for (const sale of sales) {
        const method = (sale.paymentMethod || "CASH").toUpperCase();
        const amount = parseFloat(sale.netAmount || "0");
        if (!paymentMethodTotals[method]) paymentMethodTotals[method] = 0;
        paymentMethodTotals[method] += amount;

        if (method === "CASH") {
          systemExpectedCash += amount;
        } else if (
          method.includes("UPI") ||
          method.includes("PAYTM") ||
          method.includes("GPAY") ||
          method.includes("PHONEPE") ||
          method.includes("QR") ||
          method.includes("CARD")
        ) {
          systemExpectedUpi += amount;
        }
      }
    }

    // 5. Calculate Physical Cash in Hand from Denominations
    let actualDeclaredCash = 0;
    for (const d of denominations) {
      actualDeclaredCash += d.denomination * d.count;
    }

    // Standard Restaurant Formula:
    // Net Calculated Sales = (Cash in Hand + Cash Expenses - Opening Cash) + (Declared UPI + UPI Expenses)
    const netCashPortion = actualDeclaredCash + cashExpenses - openingCash;
    const netUpiPortion = declaredUpi + upiExpenses;
    const netCalculatedSales = netCashPortion + netUpiPortion;

    const totalSystemSales = Object.values(paymentMethodTotals).reduce((sum, amt) => sum + amt, 0);
    const overallVariance = netCalculatedSales - totalSystemSales;
    const cashVariance = actualDeclaredCash - (openingCash + systemExpectedCash - cashExpenses);
    const upiVariance = declaredUpi - (systemExpectedUpi - upiExpenses);

    // 6. Lock the Day Record
    const [dayClose] = await tx
      .insert(dayCloseRecords)
      .values({
        organizationId,
        locationId,
        date,
        closedByUserId: userId,
        openingCashBalance: openingCash.toString(),
        closingCashInHand: actualDeclaredCash.toString(),
        declaredUpiAmount: declaredUpi.toString(),
        cashExpenses: cashExpenses.toString(),
        upiExpenses: upiExpenses.toString(),
        netCalculatedSales: netCalculatedSales.toString(),
        systemSales: totalSystemSales.toString(),
        overallVariance: overallVariance.toString(),
      })
      .returning();

    // 7. Save Denominations
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

    // 8. Save Financial Summaries for Auditing
    const summariesToInsert = [];
    summariesToInsert.push({
      dayCloseId: dayClose.id,
      paymentMethod: "CASH",
      systemExpectedAmount: systemExpectedCash.toString(),
      actualDeclaredAmount: actualDeclaredCash.toString(),
      varianceAmount: cashVariance.toString()
    });

    summariesToInsert.push({
      dayCloseId: dayClose.id,
      paymentMethod: "UPI",
      systemExpectedAmount: systemExpectedUpi.toString(),
      actualDeclaredAmount: declaredUpi.toString(),
      varianceAmount: upiVariance.toString()
    });

    for (const [method, amount] of Object.entries(paymentMethodTotals)) {
      if (method !== "CASH" && !method.includes("UPI") && !method.includes("CARD")) {
        summariesToInsert.push({
          dayCloseId: dayClose.id,
          paymentMethod: method,
          systemExpectedAmount: amount.toString(),
          actualDeclaredAmount: amount.toString(),
          varianceAmount: "0"
        });
      }
    }

    if (summariesToInsert.length > 0) {
      await tx.insert(dayCloseFinancialSummaries).values(summariesToInsert);
    }

    // 9. Fire Accounting Event for Day's Sales
    if (totalSystemSales > 0) {
      // In restaurant POS receipts, amount is inclusive of taxes; 5% GST is standard
      const totalTax = Math.round((totalSystemSales * 5 / 105) * 100) / 100;
      const netRevenue = totalSystemSales - totalTax;

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

    // 10. Fire Accounting Event for Net Cash Variance
    if (cashVariance !== 0) {
      const isShortage = cashVariance < 0;
      const absVariance = Math.abs(cashVariance);

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
        openingCash,
        actualDeclaredCash,
        declaredUpi,
        cashExpenses,
        upiExpenses,
        netCalculatedSales,
        totalSystemSales,
        overallVariance,
        cashVariance,
        upiVariance
      }
    };
  });
}
