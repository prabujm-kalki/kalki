"use server";

import { db } from "@/db";
import { salesInvoices, salesTransactions, organizations } from "@/db/schema";
import { and, eq, sql, desc, sum, count, lte, gte } from "drizzle-orm";

export async function fetchSalesDashboardMetrics(organizationId: string, locationId: string, filters: { startDate: string, endDate: string, prevStartDate?: string, prevEndDate?: string, viewType: 'Daily' | 'Weekly' | 'Monthly' | 'This Year' | string }) {
  try {
    // Determine configuration
    const org = await db.select({ source: organizations.primarySalesSource }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    const sourceMode = org[0]?.source || 'Hybrid';

    // Build common filter fragments
    const locFilterB2B = locationId === "ALL" ? sql`${salesInvoices.organizationId} = ${organizationId}` : sql`${salesInvoices.organizationId} = ${organizationId} AND ${salesInvoices.locationId} = ${locationId}`;
    const dateFilterB2B = sql`${salesInvoices.issueDate} >= ${new Date(filters.startDate).toISOString()} AND ${salesInvoices.issueDate} <= ${new Date(filters.endDate + 'T23:59:59Z').toISOString()}`;
    
    const locFilterTM = locationId === "ALL" ? sql`${salesTransactions.organizationId} = ${organizationId}` : sql`${salesTransactions.organizationId} = ${organizationId} AND ${salesTransactions.locationId} = ${locationId}`;
    const dateFilterTM = sql`${salesTransactions.billTimestamp} >= ${new Date(filters.startDate).toISOString()} AND ${salesTransactions.billTimestamp} <= ${new Date(filters.endDate + 'T23:59:59Z').toISOString()}`;

    // Create the unified CTE
    const unifiedSql = sql`
      SELECT 
        id as id,
        invoice_number as identifier,
        issue_date as date,
        grand_total as amount,
        customer_name as customer,
        payment_status as status,
        CASE WHEN tmbill_raw_data IS NOT NULL THEN 'TMBILL_IMPORT' ELSE 'KALKI_B2B' END as source
      FROM b2b_sales_invoices
      WHERE ${locFilterB2B} AND ${dateFilterB2B}
    `;

    const unifiedQuery = sql`WITH unified_sales AS (${unifiedSql})`;

    // 1. Total Sales
    const totalSalesRes = await db.execute(sql`${unifiedQuery} SELECT SUM(amount) as val FROM unified_sales`);
    const totalSales = Number(totalSalesRes.rows[0]?.val || 0);

    // 2. Total Invoices
    const totalInvoicesRes = await db.execute(sql`${unifiedQuery} SELECT COUNT(*) as val FROM unified_sales`);
    const totalInvoices = Number(totalInvoicesRes.rows[0]?.val || 0);

    // 3. Receivables
    const receivablesRes = await db.execute(sql`${unifiedQuery} SELECT SUM(amount) as val FROM unified_sales WHERE status != 'PAID'`);
    const receivables = Number(receivablesRes.rows[0]?.val || 0);

    // 4. Overdue
    const overdueRes = await db.execute(sql`
      WITH unified_sales_due AS (
        SELECT grand_total as amount, payment_status as status, due_date
        FROM b2b_sales_invoices
        WHERE ${locFilterB2B} AND ${dateFilterB2B}
      )
      SELECT SUM(amount) as val 
      FROM unified_sales_due 
      WHERE status != 'PAID' AND due_date < NOW()
    `);
    const overdue = Number(overdueRes.rows[0]?.val || 0);

    // 5. Avg Order Value
    const avgOrderValue = totalInvoices > 0 ? totalSales / totalInvoices : 0;

    // 6. Recent Sales
    const recentSalesDb = await db.execute(sql`${unifiedQuery} SELECT * FROM unified_sales ORDER BY date DESC LIMIT 5`);
    const recentSales = (recentSalesDb.rows as any[]).map(inv => ({
      id: inv.identifier,
      date: new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      customer: inv.customer,
      type: inv.source === 'KALKI_B2B' ? "B2B Invoice" : "POS Import",
      amount: Number(inv.amount).toLocaleString('en-IN'),
      status: inv.status === 'PAID' ? "Paid" : (inv.status === 'PARTIAL' ? "Partially Paid" : "Unpaid")
    }));

    // 7. Top Customers
    const topCustomersDb = await db.execute(sql`${unifiedQuery} SELECT customer as name, SUM(amount) as total_sales, COUNT(*) as orders FROM unified_sales GROUP BY customer ORDER BY total_sales DESC LIMIT 5`);
    const topCustomers = (topCustomersDb.rows as any[]).map(c => {
      const names = (c.name || 'W').split(' ');
      const initials = names.length > 1 ? `${names[0][0]}${names[1][0]}` : c.name.substring(0, 2);
      return {
        initials: initials.toUpperCase(),
        name: c.name || 'Walk-in',
        amount: Number(c.total_sales).toLocaleString('en-IN'),
        orders: Number(c.orders),
        bg: "#e8f0fe",
        color: "#1a73e8"
      };
    });

    // 8. Trend Data
    let dateFormat = "YYYY-MM"; // Monthly / This Year
    if (filters.viewType === 'Daily') dateFormat = "YYYY-MM-DD";
    else if (filters.viewType === 'Weekly') dateFormat = "IYYY-\"W\"IW"; // e.g. 2026-W41
    
    const trendDb = await db.execute(sql`
      ${unifiedQuery} 
      SELECT 
        to_char(date, ${dateFormat}) as label,
        SUM(amount) as sales,
        COUNT(*) as orders
      FROM unified_sales
      GROUP BY 1
      ORDER BY 1
    `);

    let trendData: any[] = [];
    if (filters.viewType === 'Daily') {
      const map = new Map((trendDb.rows as any[]).map(t => [String(t.label), t]));
      let curr = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        const row = map.get(dStr);
        trendData.push({
          name: dStr,
          sales: row ? Number(row.sales) : 0,
          orders: row ? Number(row.orders) : 0
        });
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      trendData = (trendDb.rows as any[]).map(t => ({
        name: String(t.label),
        sales: Number(t.sales),
        orders: Number(t.orders)
      }));
    }

    // 8b. Category Data
    const categoryDb = await db.execute(sql`${unifiedQuery} SELECT source, SUM(amount) as val FROM unified_sales GROUP BY source`);
    const categoryData = (categoryDb.rows as any[]).map(c => {
      const isPos = c.source === 'TMBILL_IMPORT';
      return {
        name: isPos ? 'POS Sales' : 'B2B Sales',
        value: Number(c.val),
        color: isPos ? '#3b82f6' : '#22c55e'
      };
    });

    // 9. Previous Period Comparison
    let deltas = { totalSales: 0, totalInvoices: 0, receivables: 0, overdue: 0, avgOrderValue: 0 };
    if (filters.prevStartDate && filters.prevEndDate) {
      const dateFilterPrev = sql`${salesInvoices.issueDate} >= ${new Date(filters.prevStartDate).toISOString()} AND ${salesInvoices.issueDate} <= ${new Date(filters.prevEndDate + 'T23:59:59Z').toISOString()}`;
      const prevSql = sql`
        SELECT 
          grand_total as amount,
          payment_status as status,
          issue_date
        FROM b2b_sales_invoices
        WHERE ${locFilterB2B} AND ${dateFilterPrev}
      `;
      const prevQuery = sql`WITH prev_sales AS (${prevSql})`;
      
      const pSalesRes = await db.execute(sql`${prevQuery} SELECT SUM(amount) as val FROM prev_sales`);
      const prevTotalSales = Number(pSalesRes.rows[0]?.val || 0);

      const pInvRes = await db.execute(sql`${prevQuery} SELECT COUNT(*) as val FROM prev_sales`);
      const prevTotalInvoices = Number(pInvRes.rows[0]?.val || 0);

      const pRecRes = await db.execute(sql`${prevQuery} SELECT SUM(amount) as val FROM prev_sales WHERE status != 'PAID'`);
      const prevReceivables = Number(pRecRes.rows[0]?.val || 0);
      
      // Note: For historical overdue, we'd need to compare due_date against the previous end date. 
      // For simplicity, we compare it to NOW() just like the current period, or we can use the same logic:
      const pOverdueRes = await db.execute(sql`${prevQuery} SELECT SUM(amount) as val FROM prev_sales WHERE status != 'PAID' AND issue_date < NOW()`);
      const prevOverdue = Number(pOverdueRes.rows[0]?.val || 0);
      
      const prevAvgOrderValue = prevTotalInvoices > 0 ? prevTotalSales / prevTotalInvoices : 0;

      const calcDelta = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
      };

      deltas = {
        totalSales: calcDelta(totalSales, prevTotalSales),
        totalInvoices: calcDelta(totalInvoices, prevTotalInvoices),
        receivables: calcDelta(receivables, prevReceivables),
        overdue: calcDelta(overdue, prevOverdue),
        avgOrderValue: calcDelta(avgOrderValue, prevAvgOrderValue),
      };
    }

    const responseData = {
      totalSales,
      totalInvoices,
      receivables,
      overdue,
      avgOrderValue,
      recentSales,
      topCustomers,
      trendData,
      categoryData,
      deltas,
    };
    
    return {
      success: true,
      data: responseData
    };
  } catch (error: any) {
    console.error("Dashboard fetch error:", error);
    return { success: false, error: error.message };
  }
}
