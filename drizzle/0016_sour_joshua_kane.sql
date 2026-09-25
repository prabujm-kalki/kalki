CREATE TABLE "hall_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hall_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_amount" numeric NOT NULL,
	"advance_paid" numeric DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "halls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"base_price_per_day" numeric NOT NULL,
	"amenities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hall_bookings" ADD CONSTRAINT "hall_bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_bookings" ADD CONSTRAINT "hall_bookings_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_bookings" ADD CONSTRAINT "hall_bookings_customer_id_people_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "halls" ADD CONSTRAINT "halls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "halls" ADD CONSTRAINT "halls_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hall_bookings_organization_idx" ON "hall_bookings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hall_bookings_hall_idx" ON "hall_bookings" USING btree ("hall_id");--> statement-breakpoint
CREATE INDEX "hall_bookings_customer_idx" ON "hall_bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "hall_bookings_status_idx" ON "hall_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hall_bookings_date_range_idx" ON "hall_bookings" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "halls_organization_location_idx" ON "halls" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE INDEX "halls_active_idx" ON "halls" USING btree ("is_active");