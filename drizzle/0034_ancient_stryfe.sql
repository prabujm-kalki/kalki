CREATE TABLE "approval_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"module" text NOT NULL,
	"max_limit" numeric NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_limits_org_role_module_unique" UNIQUE("organization_id","role_id","module")
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "process_owner_role_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "review_role_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "bill_review_role_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_schedules" ADD COLUMN "review_role_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_schedules" ADD COLUMN "bill_review_role_id" uuid;--> statement-breakpoint
ALTER TABLE "approval_limits" ADD CONSTRAINT "approval_limits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_limits" ADD CONSTRAINT "approval_limits_role_id_business_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_limits_org_module_idx" ON "approval_limits" USING btree ("organization_id","module");--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_process_owner_role_id_business_roles_id_fk" FOREIGN KEY ("process_owner_role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_review_role_id_business_roles_id_fk" FOREIGN KEY ("review_role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_bill_review_role_id_business_roles_id_fk" FOREIGN KEY ("bill_review_role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_schedules" ADD CONSTRAINT "purchase_schedules_review_role_id_business_roles_id_fk" FOREIGN KEY ("review_role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_schedules" ADD CONSTRAINT "purchase_schedules_bill_review_role_id_business_roles_id_fk" FOREIGN KEY ("bill_review_role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;