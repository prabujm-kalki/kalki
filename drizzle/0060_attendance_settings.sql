CREATE TABLE IF NOT EXISTS "attendance_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"location_id" uuid REFERENCES "locations"("id"),
	"require_wall_marker" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_settings_org_loc_unique" UNIQUE("organization_id", "location_id")
);

CREATE INDEX IF NOT EXISTS "attendance_settings_org_loc_idx" ON "attendance_settings" ("organization_id", "location_id");
