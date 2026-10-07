ALTER TABLE "business_roles" DROP CONSTRAINT "business_roles_org_loc_name_unique";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_organization_id_unique";--> statement-breakpoint
ALTER TABLE "locations" DROP CONSTRAINT "locations_organization_id_unique";--> statement-breakpoint
ALTER TABLE "role_checklists" DROP CONSTRAINT "role_checklists_organization_id_unique";