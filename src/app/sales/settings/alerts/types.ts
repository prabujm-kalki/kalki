export interface SalesAlertConfigPayload {
  organizationId: string;
  locationId?: string | null;
  debtorDaysOverdue: number;
  newVipMinSpend: number;
  anomalyAovMultiplier: number;
  dormantVipDays: number;
  upsellDeficitDropPercentage: number;
  concentrationTopCustomersCount: number;
}

export const DEFAULT_SALES_ALERT_CONFIG = {
  debtorDaysOverdue: 30,
  newVipMinSpend: 10000,
  anomalyAovMultiplier: 3.0,
  dormantVipDays: 90,
  upsellDeficitDropPercentage: 5.0,
  concentrationTopCustomersCount: 5,
};
