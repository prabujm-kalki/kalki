CREATE TABLE "billing_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"session_number" varchar(50) NOT NULL,
	"opened_by_user_id" text NOT NULL,
	"closed_by_user_id" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"opening_float" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"closing_expected_cash" numeric(12, 2),
	"closing_actual_cash" numeric(12, 2),
	"cash_variance" numeric(12, 2),
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	CONSTRAINT "billing_sessions_session_number_unique" UNIQUE("session_number")
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"rule_type" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"requires_approval" boolean DEFAULT false,
	"approval_role_level" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"fulfillment_type" text DEFAULT 'IMMEDIATE' NOT NULL,
	"requires_dispatch" boolean DEFAULT false,
	"default_tax_slab_id" uuid,
	"platform_fee_percentage" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_sales_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"unit_price" numeric NOT NULL,
	"total_amount" numeric NOT NULL,
	"item_id" uuid NOT NULL,
	"item_description" text NOT NULL,
	"hsn_code" text,
	"uom" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_rate" numeric(12, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(12, 2) NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"cgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_mode" varchar(30) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference_number" varchar(100),
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"session_id" uuid,
	"issue_date" timestamp NOT NULL,
	"total_amount" numeric NOT NULL,
	"tax_amount" numeric DEFAULT '0' NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"customer_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_gstin" text,
	"billing_address" text,
	"subtotal_amount" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(12, 2) NOT NULL,
	"cgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"round_off_amount" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(12, 2) NOT NULL,
	"payment_status" text NOT NULL,
	"payment_mode" text NOT NULL,
	"status" text DEFAULT 'ISSUED' NOT NULL,
	"created_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_sales_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "sales_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"gross_amount" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(12, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"customer_id" uuid,
	"customer_name" text,
	"customer_contact" text,
	"gross_amount" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(12, 2) NOT NULL,
	"applied_pricing_rules" jsonb DEFAULT '[]'::jsonb,
	"tax_breakdown" jsonb DEFAULT '{}'::jsonb,
	"order_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfillment_timestamp" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmbill_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"api_url" text DEFAULT 'https://api.tmbill.com/tp/v1' NOT NULL,
	"username" text,
	"password" text,
	"store_id" text,
	"tmpos_id" text,
	"business_day_start_time" text DEFAULT '06:00' NOT NULL,
	"auto_sync_enabled" boolean DEFAULT false NOT NULL,
	"auto_sync_interval_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "billing_sessions" ADD CONSTRAINT "billing_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_sessions" ADD CONSTRAINT "billing_sessions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_channels" ADD CONSTRAINT "sales_channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_channels" ADD CONSTRAINT "sales_channels_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_sales_invoice_lines" ADD CONSTRAINT "b2b_sales_invoice_lines_invoice_id_b2b_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."b2b_sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_payments" ADD CONSTRAINT "sales_invoice_payments_invoice_id_b2b_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."b2b_sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_sales_invoices" ADD CONSTRAINT "b2b_sales_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_sales_invoices" ADD CONSTRAINT "b2b_sales_invoices_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_sales_invoices" ADD CONSTRAINT "b2b_sales_invoices_session_id_billing_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."billing_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_sales_invoices" ADD CONSTRAINT "b2b_sales_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_channel_id_sales_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint