ALTER TABLE "employee_role_assignments" DROP CONSTRAINT "employee_role_assignments_organization_role_fk";
--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "employee_role_assignments" ADD CONSTRAINT "employee_role_assignments_role_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;