CREATE TABLE IF NOT EXISTS "sales_alert_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"debtor_days_overdue" integer DEFAULT 30 NOT NULL,
	"new_vip_min_spend" integer DEFAULT 10000 NOT NULL,
	"anomaly_aov_multiplier" numeric(4, 2) DEFAULT '3.00' NOT NULL,
	"dormant_vip_days" integer DEFAULT 90 NOT NULL,
	"upsell_deficit_drop_percentage" numeric(4, 2) DEFAULT '5.00' NOT NULL,
	"concentration_top_customers_count" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales_alert_configurations" ADD CONSTRAINT "sales_alert_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales_alert_configurations" ADD CONSTRAINT "sales_alert_configurations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;