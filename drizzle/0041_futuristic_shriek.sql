CREATE TABLE "credit_note_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_note_id" uuid NOT NULL,
	"applied_to_invoice_id" uuid NOT NULL,
	"applied_amount" numeric NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"credit_note_number" varchar(255) NOT NULL,
	"customer_id" uuid NOT NULL,
	"source_return_id" uuid,
	"total_amount" numeric NOT NULL,
	"remaining_balance" numeric NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_credit_note_number_unique" UNIQUE("credit_note_number")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "return_policies" jsonb DEFAULT '{"maxReturnDays":30,"allowMultipleReturns":true,"requireApproval":true,"applyRestockingFee":"None"}'::jsonb;--> statement-breakpoint
ALTER TABLE "credit_note_applications" ADD CONSTRAINT "credit_note_applications_credit_note_id_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note_applications" ADD CONSTRAINT "credit_note_applications_applied_to_invoice_id_b2b_sales_invoices_id_fk" FOREIGN KEY ("applied_to_invoice_id") REFERENCES "public"."b2b_sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_source_return_id_sales_returns_id_fk" FOREIGN KEY ("source_return_id") REFERENCES "public"."sales_returns"("id") ON DELETE no action ON UPDATE no action;