-- Migration 0053: Automated Lifecycle Marketing, Dynamic Drip Engine, and CRM Intelligence Configurations

CREATE TABLE IF NOT EXISTS "crm_intelligence_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"dormant_vip_days" integer DEFAULT 90 NOT NULL,
	"dormant_vip_min_spend" numeric(12, 2) DEFAULT '10000.00' NOT NULL,
	"aov_drop_percentage" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"critical_debtor_days" integer DEFAULT 30 NOT NULL,
	"new_vip_min_spend" numeric(12, 2) DEFAULT '10000.00' NOT NULL,
	"anomaly_aov_multiplier" numeric(5, 2) DEFAULT '3.00' NOT NULL,
	"concentration_top_count" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_intelligence_configurations" ADD CONSTRAINT "crm_intelligence_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_intelligence_configurations" ADD CONSTRAINT "crm_intelligence_configurations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "marketing_templates" ADD COLUMN IF NOT EXISTS "is_automated" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "marketing_templates" ADD COLUMN IF NOT EXISTS "trigger_rule" varchar(100);
--> statement-breakpoint
ALTER TABLE "marketing_templates" ADD COLUMN IF NOT EXISTS "schedule_cron" varchar(100);
