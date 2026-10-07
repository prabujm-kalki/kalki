CREATE TABLE "day_close_cash_denominations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_close_id" uuid NOT NULL,
	"denomination" integer NOT NULL,
	"count" integer NOT NULL,
	"total_amount" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_close_financial_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_close_id" uuid NOT NULL,
	"payment_method" text NOT NULL,
	"system_expected_amount" numeric DEFAULT '0' NOT NULL,
	"actual_declared_amount" numeric DEFAULT '0' NOT NULL,
	"variance_amount" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_close_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'CLOSED' NOT NULL,
	"closed_by_user_id" text NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_close_org_loc_date_unique" UNIQUE("organization_id","location_id","date")
);
--> statement-breakpoint
ALTER TABLE "business_roles" DROP CONSTRAINT "business_roles_organization_id_unique";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "is_system_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_components" ADD COLUMN "ledger_account_mapping" varchar(255);--> statement-breakpoint
ALTER TABLE "day_close_cash_denominations" ADD CONSTRAINT "day_close_cash_denominations_day_close_id_day_close_records_id_fk" FOREIGN KEY ("day_close_id") REFERENCES "public"."day_close_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_close_financial_summaries" ADD CONSTRAINT "day_close_financial_summaries_day_close_id_day_close_records_id_fk" FOREIGN KEY ("day_close_id") REFERENCES "public"."day_close_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_close_records" ADD CONSTRAINT "day_close_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_close_records" ADD CONSTRAINT "day_close_records_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_close_records" ADD CONSTRAINT "day_close_records_closed_by_user_id_user_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;