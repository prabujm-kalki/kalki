CREATE TABLE "sales_return_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text,
	"return_qty" numeric NOT NULL,
	"unit_price" numeric NOT NULL,
	"add_to_inventory" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"return_number" varchar(50) NOT NULL,
	"invoice_id" uuid,
	"return_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_amount" numeric NOT NULL,
	"reason" text,
	"created_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "primary_sales_source" text DEFAULT 'Hybrid' NOT NULL;--> statement-breakpoint
ALTER TABLE "b2b_sales_invoices" ADD COLUMN "tmbill_raw_data" jsonb;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_return_id_sales_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."sales_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_b2b_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."b2b_sales_invoices"("id") ON DELETE no action ON UPDATE no action;