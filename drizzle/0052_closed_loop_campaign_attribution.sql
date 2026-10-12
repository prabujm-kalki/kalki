CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"name" varchar(255) NOT NULL,
	"channel" varchar(50) DEFAULT 'WHATSAPP' NOT NULL,
	"template_name" varchar(150) NOT NULL,
	"template_language" varchar(20) DEFAULT 'en_US' NOT NULL,
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"read_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"conversions_72h_count" integer DEFAULT 0 NOT NULL,
	"conversions_72h_revenue" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"conversions_7d_count" integer DEFAULT 0 NOT NULL,
	"conversions_7d_revenue" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"conversions_30d_count" integer DEFAULT 0 NOT NULL,
	"conversions_30d_revenue" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"estimated_api_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_attributed_revenue" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"roi_percentage" numeric(8, 2) DEFAULT '0.00' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"launched_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_audiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"customer_id" uuid,
	"recipient_phone" varchar(50) NOT NULL,
	"meta_message_id" varchar(255),
	"delivery_status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"is_converted" boolean DEFAULT false NOT NULL,
	"converted_invoice_id" uuid,
	"conversion_window" varchar(20),
	"conversion_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_audiences_meta_message_id_unique" UNIQUE("meta_message_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_converted_invoice_id_b2b_sales_invoices_id_fk" FOREIGN KEY ("converted_invoice_id") REFERENCES "public"."b2b_sales_invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
