-- Custom SQL migration file, put you code below! --
-- 1. Drop old tables/columns
ALTER TABLE "employee_salary_info" DROP COLUMN IF EXISTS "salary_type";
ALTER TABLE "employee_salary_info" DROP COLUMN IF EXISTS "amount";
ALTER TABLE "employee_salary_info" DROP COLUMN IF EXISTS "effective_from";

DROP TABLE IF EXISTS "employee_history_salary" CASCADE;

-- 2. Create Payroll tables
CREATE TABLE IF NOT EXISTS "salary_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_taxable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"is_epf_applicable" boolean DEFAULT false NOT NULL,
	"is_esi_applicable" boolean DEFAULT false NOT NULL,
	"is_pt_applicable" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_salary_structure_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"structure_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"amount" numeric NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_salary_structure_components" ADD CONSTRAINT "employee_salary_structure_components_structure_id_employee_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."employee_salary_structures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_salary_structure_components" ADD CONSTRAINT "employee_salary_structure_components_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;