CREATE TABLE "pos_channel_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"provider_name" varchar(50) NOT NULL,
	"external_string" varchar(100) NOT NULL,
	"internal_channel_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pos_channel_mappings" ADD CONSTRAINT "pos_channel_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_channel_mappings" ADD CONSTRAINT "pos_channel_mappings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_channel_mappings" ADD CONSTRAINT "pos_channel_mappings_internal_channel_id_sales_channels_id_fk" FOREIGN KEY ("internal_channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE no action ON UPDATE no action;