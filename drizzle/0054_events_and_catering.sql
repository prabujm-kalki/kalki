-- Migration 0054: Events & Catering Module Foundation
CREATE TABLE IF NOT EXISTS "event_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"hall_name" varchar(255) NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"time_slots" jsonb DEFAULT '["MORNING", "EVENING", "FULL_DAY"]'::jsonb NOT NULL,
	"function_types" jsonb DEFAULT '["WEDDING", "RECEPTION", "BIRTHDAY", "CORPORATE", "ANNIVERSARY", "GET_TOGETHER"]'::jsonb NOT NULL,
	"base_rent" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cleaning_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"caution_deposit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_configurations" ADD CONSTRAINT "event_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_configurations" ADD CONSTRAINT "event_configurations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "catering_combos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"meal_type" varchar(50) NOT NULL,
	"description" text,
	"menu_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"base_price_per_pax" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "catering_combos" ADD CONSTRAINT "catering_combos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "catering_combos" ADD CONSTRAINT "catering_combos_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "combo_pricing_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"combo_id" uuid NOT NULL,
	"min_pax" integer NOT NULL,
	"max_pax" integer,
	"price_per_pax" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "combo_pricing_tiers" ADD CONSTRAINT "combo_pricing_tiers_combo_id_catering_combos_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."catering_combos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid,
	"lead_id" uuid,
	"hall_id" uuid,
	"combo_id" uuid,
	"title" varchar(255) NOT NULL,
	"function_type" varchar(100) NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"time_slot" varchar(50) NOT NULL,
	"guaranteed_pax" integer DEFAULT 50 NOT NULL,
	"expected_pax" integer DEFAULT 50 NOT NULL,
	"price_per_pax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"hall_rent" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'ENQUIRY' NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"contact_email" varchar(255),
	"special_instructions" text,
	"dietary_restrictions" text,
	"notes" text,
	"kuab_kitchen_task_id" uuid,
	"kuab_purchasing_task_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_hall_id_event_configurations_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."event_configurations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_combo_id_catering_combos_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."catering_combos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_kuab_kitchen_task_id_kuab_tasks_id_fk" FOREIGN KEY ("kuab_kitchen_task_id") REFERENCES "public"."kuab_tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_kuab_purchasing_task_id_kuab_tasks_id_fk" FOREIGN KEY ("kuab_purchasing_task_id") REFERENCES "public"."kuab_tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "event_financials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"invoice_id" uuid,
	"channel_id" uuid,
	"total_food_cost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"hall_rent_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"additional_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"advance_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"balance_due" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"payment_status" varchar(50) DEFAULT 'UNPAID' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_financials_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_financials" ADD CONSTRAINT "event_financials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_financials" ADD CONSTRAINT "event_financials_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_financials" ADD CONSTRAINT "event_financials_invoice_id_b2b_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."b2b_sales_invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_financials" ADD CONSTRAINT "event_financials_channel_id_sales_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
