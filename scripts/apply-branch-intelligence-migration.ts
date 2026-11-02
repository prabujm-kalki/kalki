import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Applying 0064_branch_intelligence migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS branch_benchmark_configs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      branch_profile varchar(50) NOT NULL DEFAULT 'STANDARD',
      target_food_cost_pct numeric(5, 2) NOT NULL DEFAULT 30.00,
      target_labor_cost_pct numeric(5, 2) NOT NULL DEFAULT 18.00,
      target_opex_cost_pct numeric(5, 2) NOT NULL DEFAULT 12.00,
      max_prime_cost_pct numeric(5, 2) NOT NULL DEFAULT 55.00,
      variance_alert_threshold_pct numeric(5, 2) NOT NULL DEFAULT 2.50,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS branch_benchmark_org_idx ON branch_benchmark_configs (organization_id, branch_profile);

    CREATE TABLE IF NOT EXISTS branch_intelligence_snapshots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      snapshot_date date NOT NULL,
      period_type varchar(20) NOT NULL DEFAULT 'DAILY',
      total_revenue numeric(14, 2) NOT NULL DEFAULT 0.00,
      food_cost_cogs numeric(14, 2) NOT NULL DEFAULT 0.00,
      food_cost_pct numeric(6, 2) NOT NULL DEFAULT 0.00,
      labor_cost numeric(14, 2) NOT NULL DEFAULT 0.00,
      labor_cost_pct numeric(6, 2) NOT NULL DEFAULT 0.00,
      opex_cost numeric(14, 2) NOT NULL DEFAULT 0.00,
      opex_cost_pct numeric(6, 2) NOT NULL DEFAULT 0.00,
      prime_cost_pct numeric(6, 2) NOT NULL DEFAULT 0.00,
      benchmark_food_cost_pct numeric(5, 2) DEFAULT 30.00,
      food_cost_variance_pct numeric(6, 2) DEFAULT 0.00,
      status_health varchar(30) NOT NULL DEFAULT 'OPTIMAL',
      root_cause_decomposition jsonb NOT NULL DEFAULT '{}'::jsonb,
      top_items_variance jsonb NOT NULL DEFAULT '[]'::jsonb,
      recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS branch_intel_org_loc_date_idx ON branch_intelligence_snapshots (organization_id, location_id, snapshot_date);
  `);

  console.log("0064_branch_intelligence migration applied successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
