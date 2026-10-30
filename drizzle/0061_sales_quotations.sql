CREATE TABLE IF NOT EXISTS "sales_quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"location_id" uuid NOT NULL REFERENCES "locations"("id"),
	"quotation_number" varchar(64) NOT NULL UNIQUE,
	"doc_type" varchar(30) DEFAULT 'QUOTATION' NOT NULL, -- 'QUOTATION' | 'PROFORMA'
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" uuid NOT NULL REFERENCES "customers"("id"),
	"customer_name" text NOT NULL,
	"customer_phone" varchar(50),
	"customer_gstin" text,
	"billing_address" text,
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL, -- 'DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED', 'DECLINED', 'EXPIRED'
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"payment_terms" text,
	"notes" text,
	"terms_and_conditions" text,
	"subtotal_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"round_off_amount" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"public_token" text UNIQUE,
	"is_sent_to_customer" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"converted_invoice_id" uuid REFERENCES "b2b_sales_invoices"("id"),
	"converted_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sales_quotation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL REFERENCES "sales_quotations"("id") ON DELETE CASCADE,
	"item_id" uuid NOT NULL REFERENCES "items"("id"),
	"item_name" text NOT NULL,
	"hsn_code" text,
	"uom" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_rate" numeric(12, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"taxable_amount" numeric(12, 2) NOT NULL,
	"gst_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"cgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sales_quotations_org_loc_idx" ON "sales_quotations" ("organization_id", "location_id");
CREATE INDEX IF NOT EXISTS "sales_quotations_customer_idx" ON "sales_quotations" ("customer_id");
CREATE INDEX IF NOT EXISTS "sales_quotations_public_token_idx" ON "sales_quotations" ("public_token");
CREATE INDEX IF NOT EXISTS "sales_quotation_lines_quotation_idx" ON "sales_quotation_lines" ("quotation_id");

