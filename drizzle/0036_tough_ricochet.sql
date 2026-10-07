CREATE TABLE "purchase_routing_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"target_role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_routing_configs" ADD CONSTRAINT "purchase_routing_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_routing_configs" ADD CONSTRAINT "purchase_routing_configs_target_role_id_business_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;