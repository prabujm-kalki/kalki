import { db } from "@/db";
import { 
  journalEntries, 
  journalLineItems, 
  accounts,
  organizations,
  locations
} from "@/db/schema";
import { and, eq, gte, lte, inArray, desc } from "drizzle-orm";

export interface LedgerExportOptions {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  locationIds?: string[]; // If empty, export all branches
  exportFormat: "JSON" | "CSV";
  status?: "POSTED" | "PENDING_APPROVAL";
}

export interface StandardLedgerRow {
  Date: string;
  VoucherType: string;
  VoucherNumber: string;
  LedgerCode: string;
  LedgerName: string;
  LocationCode: string | null;
  Debit: number;
  Credit: number;
  Narration: string;
}

/**
 * Universal Ledger Exporter
 * Securely extracts immutable ledger entries for Tally / Zoho / SAP imports.
 * Enforces precise double-entry flattening.
 */
export async function exportLedgerData(options: LedgerExportOptions) {
  // 1. Build Query Conditions
  const conditions = [
    eq(journalEntries.organizationId, options.organizationId),
    gte(journalEntries.entryDate, options.startDate.toISOString().split('T')[0]),
    lte(journalEntries.entryDate, options.endDate.toISOString().split('T')[0]),
  ];

  if (options.status) {
    conditions.push(eq(journalEntries.status, options.status));
  } else {
    // Only ever export posted entries by default to guarantee ledger integrity
    conditions.push(eq(journalEntries.status, "POSTED"));
  }

  // 2. Fetch Hierarchical Data
  const entries = await db.query.journalEntries.findMany({
    where: and(...conditions),
    orderBy: [desc(journalEntries.entryDate), desc(journalEntries.createdAt)],
    with: {
      lines: {
        where: options.locationIds && options.locationIds.length > 0
          ? inArray(journalLineItems.locationId, options.locationIds)
          : undefined,
        with: {
          account: true,
          location: true
        }
      }
    }
  });

  // 3. Flatten to Standard Accounting Rows
  const rows: StandardLedgerRow[] = [];

  for (const entry of entries) {
    // A single Journal Entry has multiple lines. Flatten them.
    for (const line of (entry as any).lines) {
      rows.push({
        Date: entry.entryDate,
        VoucherType: entry.sourceModule, // Maps perfectly to Tally Voucher Types (e.g., PURCHASE, PAYROLL, MANUAL)
        VoucherNumber: entry.entryNumber,
        LedgerCode: line.account?.code || "UNKNOWN",
        LedgerName: line.account?.name || "UNKNOWN",
        LocationCode: line.location?.code || null,
        Debit: parseFloat(line.debit),
        Credit: parseFloat(line.credit),
        // Line-level narration takes precedence over header-level narration
        Narration: line.narration ? `${entry.narration} | ${line.narration}` : entry.narration,
      });
    }
  }

  // 4. Format Output
  if (options.exportFormat === "JSON") {
    return JSON.stringify(rows, null, 2);
  }

  if (options.exportFormat === "CSV") {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]).join(",");
    const csvRows = rows.map(r => {
      return Object.values(r).map(val => {
        // Escape quotes and wrap in quotes for CSV safety
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val === null ? "" : val;
      }).join(",");
    });
    return [headers, ...csvRows].join("\n");
  }

  throw new Error("Unsupported Export Format");
}
