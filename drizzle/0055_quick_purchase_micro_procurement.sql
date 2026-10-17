-- Migration 0055: Quick Purchase / Micro-Procurement
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "allow_spot_purchase" boolean DEFAULT false NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "spot_purchase_price_limit" numeric(12, 2);
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "is_inventory_tracked" boolean DEFAULT true NOT NULL;

CREATE TABLE IF NOT EXISTS "branch_purchase_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"max_spot_purchase_transaction_limit" numeric(12, 2) DEFAULT '2000.00' NOT NULL,
	"max_daily_spot_purchase_total" numeric(12, 2) DEFAULT '5000.00' NOT NULL,
	"max_item_daily_frequency" integer DEFAULT 3 NOT NULL,
	"require_photo_evidence" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "branch_purchase_policies" ADD CONSTRAINT "branch_purchase_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "branch_purchase_policies" ADD CONSTRAINT "branch_purchase_policies_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "spot_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"voucher_number" varchar(50) NOT NULL,
	"item_id" uuid NOT NULL,
	"vendor_name" varchar(255) NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"uom" varchar(50) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"payment_source" varchar(50) DEFAULT 'PETTY_CASH' NOT NULL,
	"receipt_photo_url" text,
	"submitted_by_user_id" text NOT NULL,
	"audit_status" varchar(50) DEFAULT 'PENDING_AUDIT' NOT NULL,
	"audited_by_user_id" text,
	"audit_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "spot_purchases" ADD CONSTRAINT "spot_purchases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "spot_purchases" ADD CONSTRAINT "spot_purchases_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "spot_purchases" ADD CONSTRAINT "spot_purchases_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
