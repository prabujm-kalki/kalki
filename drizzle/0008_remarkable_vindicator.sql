CREATE TABLE "work_instance_verification_presences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"work_instance_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_instance_verification_presences" ADD CONSTRAINT "work_instance_verification_presences_organization_instance_fk" FOREIGN KEY ("organization_id","work_instance_id") REFERENCES "public"."work_instances"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_instance_verification_presences_instance_unique" ON "work_instance_verification_presences" USING btree ("work_instance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_instance_verification_presences_organization_id_unique" ON "work_instance_verification_presences" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "work_instance_verification_presences_organization_instance_idx" ON "work_instance_verification_presences" USING btree ("organization_id","work_instance_id");