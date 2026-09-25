CREATE TABLE "leave_role_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"business_role_id" uuid NOT NULL,
	"custom_accrual_rate" numeric(5, 2),
	"max_concurrent_leaves" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "min_tenure_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "restricted_usage_days" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "allowed_application_window" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_role_policies" ADD CONSTRAINT "leave_role_policies_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_role_policies" ADD CONSTRAINT "leave_role_policies_business_role_id_business_roles_id_fk" FOREIGN KEY ("business_role_id") REFERENCES "public"."business_roles"("id") ON DELETE cascade ON UPDATE no action;