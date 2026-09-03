CREATE TABLE "business_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"name" text NOT NULL,
	"purpose" text NOT NULL,
	"authority_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"baseline_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_responsibility_additions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"responsibility" text NOT NULL,
	"actual_work" text NOT NULL,
	"position" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"definition" text NOT NULL,
	"position" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_kpi_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_responsibilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"responsibility" text NOT NULL,
	"actual_work" text NOT NULL,
	"position" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"work_situation_definition_id" uuid NOT NULL,
	"location_id" uuid,
	"assigned_employee_id" uuid,
	"source_reference" text,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"definition_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"state" text DEFAULT 'SEEN' NOT NULL,
	"verification_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_instances_state_check" CHECK ("work_instances"."state" IN ('SEEN', 'ACKNOWLEDGED', 'COMPLETED', 'VERIFIED'))
);
--> statement-breakpoint
CREATE TABLE "work_situation_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"trigger_category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text,
	"verification_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_situation_evidence_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"work_situation_definition_id" uuid NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_situation_reminder_escalation_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"work_situation_definition_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"position" integer NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "business_roles_organization_id_unique" ON "business_roles" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "role_checklists_organization_id_unique" ON "role_checklists" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "work_situation_definitions_organization_id_unique" ON "work_situation_definitions" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "employees_organization_id_unique" ON "employees" USING btree ("organization_id","id");
--> statement-breakpoint
ALTER TABLE "business_roles" ADD CONSTRAINT "business_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_responsibility_additions" ADD CONSTRAINT "employee_responsibility_additions_organization_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_role_assignments" ADD CONSTRAINT "employee_role_assignments_organization_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_role_assignments" ADD CONSTRAINT "employee_role_assignments_organization_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."business_roles"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_checklist_items" ADD CONSTRAINT "role_checklist_items_organization_checklist_fk" FOREIGN KEY ("organization_id","checklist_id") REFERENCES "public"."role_checklists"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_checklists" ADD CONSTRAINT "role_checklists_organization_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."business_roles"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_kpi_definitions" ADD CONSTRAINT "role_kpi_definitions_organization_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."business_roles"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_responsibilities" ADD CONSTRAINT "role_responsibilities_organization_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."business_roles"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_instances" ADD CONSTRAINT "work_instances_organization_definition_fk" FOREIGN KEY ("organization_id","work_situation_definition_id") REFERENCES "public"."work_situation_definitions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_instances" ADD CONSTRAINT "work_instances_organization_location_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_instances" ADD CONSTRAINT "work_instances_organization_assigned_employee_fk" FOREIGN KEY ("organization_id","assigned_employee_id") REFERENCES "public"."employees"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_situation_definitions" ADD CONSTRAINT "work_situation_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_situation_evidence_requirements" ADD CONSTRAINT "work_situation_evidence_requirements_organization_definition_fk" FOREIGN KEY ("organization_id","work_situation_definition_id") REFERENCES "public"."work_situation_definitions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_situation_reminder_escalation_stages" ADD CONSTRAINT "work_situation_reminder_escalation_stages_organization_definition_fk" FOREIGN KEY ("organization_id","work_situation_definition_id") REFERENCES "public"."work_situation_definitions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_roles_organization_identifier_unique" ON "business_roles" USING btree ("organization_id","identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "business_roles_organization_name_unique" ON "business_roles" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "business_roles_organization_active_idx" ON "business_roles" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_responsibility_additions_employee_position_unique" ON "employee_responsibility_additions" USING btree ("employee_id","position");--> statement-breakpoint
CREATE INDEX "employee_responsibility_additions_organization_employee_idx" ON "employee_responsibility_additions" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_role_assignments_employee_role_unique" ON "employee_role_assignments" USING btree ("employee_id","role_id");--> statement-breakpoint
CREATE INDEX "employee_role_assignments_organization_employee_active_idx" ON "employee_role_assignments" USING btree ("organization_id","employee_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "role_checklist_items_checklist_position_unique" ON "role_checklist_items" USING btree ("checklist_id","position");--> statement-breakpoint
CREATE INDEX "role_checklist_items_organization_checklist_idx" ON "role_checklist_items" USING btree ("organization_id","checklist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_checklists_role_name_unique" ON "role_checklists" USING btree ("role_id","name");--> statement-breakpoint
CREATE INDEX "role_checklists_organization_role_idx" ON "role_checklists" USING btree ("organization_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_kpi_definitions_role_name_unique" ON "role_kpi_definitions" USING btree ("role_id","name");--> statement-breakpoint
CREATE INDEX "role_kpi_definitions_organization_role_idx" ON "role_kpi_definitions" USING btree ("organization_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_responsibilities_role_position_unique" ON "role_responsibilities" USING btree ("role_id","position");--> statement-breakpoint
CREATE INDEX "role_responsibilities_organization_role_idx" ON "role_responsibilities" USING btree ("organization_id","role_id");--> statement-breakpoint
CREATE INDEX "work_instances_organization_state_idx" ON "work_instances" USING btree ("organization_id","state");--> statement-breakpoint
CREATE INDEX "work_instances_assigned_employee_state_idx" ON "work_instances" USING btree ("assigned_employee_id","state");--> statement-breakpoint
CREATE INDEX "work_instances_definition_idx" ON "work_instances" USING btree ("work_situation_definition_id");--> statement-breakpoint
CREATE INDEX "work_situation_definitions_organization_active_idx" ON "work_situation_definitions" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "work_situation_definitions_organization_trigger_idx" ON "work_situation_definitions" USING btree ("organization_id","trigger_category");--> statement-breakpoint
CREATE UNIQUE INDEX "work_situation_evidence_requirements_definition_unique" ON "work_situation_evidence_requirements" USING btree ("work_situation_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_situation_reminder_escalation_stages_definition_position_unique" ON "work_situation_reminder_escalation_stages" USING btree ("work_situation_definition_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "work_situation_reminder_escalation_stages_definition_stage_unique" ON "work_situation_reminder_escalation_stages" USING btree ("work_situation_definition_id","stage");--> statement-breakpoint
CREATE INDEX "work_situation_reminder_escalation_stages_organization_definition_idx" ON "work_situation_reminder_escalation_stages" USING btree ("organization_id","work_situation_definition_id");--> statement-breakpoint
