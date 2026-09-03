CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_code" text NOT NULL,
	"job_title" text,
	"employment_start_date" date NOT NULL,
	"employment_end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"display_name" text NOT NULL,
	"phone" text,
	"email" text,
	"date_of_birth" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_organization_code_unique" ON "employees" USING btree ("organization_id","employee_code");--> statement-breakpoint
CREATE INDEX "employees_person_idx" ON "employees" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "employees_organization_idx" ON "employees" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "employees_location_idx" ON "employees" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "employees_active_idx" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "people_phone_idx" ON "people" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "people_email_idx" ON "people" USING btree ("email");--> statement-breakpoint
CREATE INDEX "people_active_idx" ON "people" USING btree ("is_active");