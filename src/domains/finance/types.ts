// Core types for the Accounting Event Engine

export type SourceModule = "PURCHASE" | "PAYROLL" | "UTILITIES" | "POS" | "MANUAL" | "SYSTEM";
export type MappingType = "ITEM_CATEGORY" | "PAYROLL_COMPONENT" | "TAX_COMPONENT" | "SYSTEM_DEFAULT";

export interface AccountingEventPayload {
  organizationId: string;
  locationId: string;
  triggeredByUserId: string;
  sourceModule: SourceModule;
  sourceReferenceId: string;
  entryDate: Date;
  narration: string;
  lines: {
    mappingType: MappingType;
    sourceReferenceId: string; // The ID of the item category, component, etc.
    amount: number;
    isDebit: boolean;
    locationId?: string; // Branch specific tagging for Inter-Branch clearing
    narration?: string;
  }[];
}

export type ManualJournalCategory = "DEPRECIATION" | "AUDIT_CORRECTION" | "OPENING_BALANCE" | "PROVISION" | "CONTRA";

export interface ManualJournalPayload {
  organizationId: string;
  locationId: string;
  triggeredByUserId: string;
  category: ManualJournalCategory;
  entryDate: Date;
  narration: string;
  lines: {
    accountId: string; // Explicitly pass the UUID of the account
    amount: number;
    isDebit: boolean;
    locationId?: string;
    narration?: string;
  }[];
}

export class AccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountingError";
  }
}
