export interface PricingTierSettingsConfig {
  multiPricingEnabled: boolean;
  defaultPricingTier: "tier1" | "tier2" | "tier3" | "tier4";
  pricingTiers: {
    tier1: string; // Customer / Retail
    tier2: string; // Wholesale Supplies
    tier3: string; // Dealers
    tier4: string; // Special / Institutional
  };
}

export const DEFAULT_PRICING_CONFIG: PricingTierSettingsConfig = {
  multiPricingEnabled: true,
  defaultPricingTier: "tier1",
  pricingTiers: {
    tier1: "Customer / Retail",
    tier2: "Wholesale Supplies",
    tier3: "Dealers",
    tier4: "Special / Institutional",
  },
};
