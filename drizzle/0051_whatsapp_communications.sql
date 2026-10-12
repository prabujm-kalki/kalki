CREATE TABLE IF NOT EXISTS "whatsapp_communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"customer_id" uuid,
	"meta_message_id" varchar(255) NOT NULL,
	"direction" varchar(20) NOT NULL,
	"status" varchar(30) DEFAULT 'RECEIVED' NOT NULL,
	"message_type" varchar(50) NOT NULL,
	"content" text,
	"sender_number" varchar(50) NOT NULL,
	"recipient_number" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_communications_meta_message_id_unique" UNIQUE("meta_message_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_communications" ADD CONSTRAINT "whatsapp_communications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_communications" ADD CONSTRAINT "whatsapp_communications_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_communications" ADD CONSTRAINT "whatsapp_communications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
