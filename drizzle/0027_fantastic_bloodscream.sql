ALTER TABLE "business_roles" DROP CONSTRAINT "business_roles_organization_name_unique";--> statement-breakpoint
ALTER TABLE "business_roles" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_schedules" ADD COLUMN "task_definition_id" uuid;--> statement-breakpoint
ALTER TABLE "business_roles" ADD CONSTRAINT "business_roles_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_schedules" ADD CONSTRAINT "purchase_schedules_task_definition_id_task_definitions_id_fk" FOREIGN KEY ("task_definition_id") REFERENCES "public"."task_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_roles" ADD CONSTRAINT "business_roles_org_loc_name_unique" UNIQUE("organization_id","location_id","name");