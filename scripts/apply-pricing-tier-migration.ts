import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking and applying columns...");
  await db.execute(sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS tier_prices jsonb DEFAULT '{}'::jsonb;`);
  console.log("items.tier_prices column verified/added.");

  await db.execute(sql`
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pricing_tier_settings jsonb DEFAULT '{
      "multiPricingEnabled": true,
      "defaultPricingTier": "tier1",
      "pricingTiers": {
        "tier1": "Customer / Retail",
        "tier2": "Wholesale Supplies",
        "tier3": "Dealers",
        "tier4": "Special / Institutional"
      }
    }'::jsonb;
  `);
  console.log("organizations.pricing_tier_settings column verified/added.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
