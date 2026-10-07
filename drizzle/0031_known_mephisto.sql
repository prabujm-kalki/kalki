CREATE TABLE "fixed_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"asset_code" varchar(100) NOT NULL,
	"purchase_date" date NOT NULL,
	"purchase_price" numeric NOT NULL,
	"current_value" numeric NOT NULL,
	"depreciation_rate" numeric NOT NULL,
	"depreciation_method" varchar(50) DEFAULT 'STRAIGHT_LINE' NOT NULL,
	"asset_account_id" uuid NOT NULL,
	"depreciation_account_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_asset_account_id_accounts_id_fk" FOREIGN KEY ("asset_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_depreciation_account_id_accounts_id_fk" FOREIGN KEY ("depreciation_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;