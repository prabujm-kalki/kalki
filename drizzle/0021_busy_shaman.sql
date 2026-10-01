CREATE TABLE "advance_repayment_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advance_request_id" uuid NOT NULL,
	"cycle_start_date" date,
	"cycle_end_date" date,
	"installment_number" integer NOT NULL,
	"deduction_amount" numeric NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advance_type_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"calculation_basis" varchar(50),
	"max_cap_percentage" integer,
	"max_ceiling_amount" numeric,
	"max_count_monthly" integer,
	"max_count_weekly" integer,
	"min_tenure_days" integer,
	"min_notice_days" integer,
	"min_cycle_days_worked" integer,
	"holdback_days" integer,
	"max_repayment_months" integer,
	"allowed_payment_modes" varchar(255),
	"allow_concurrent_advances" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_regularization_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"requested_punch_type" varchar(20) NOT NULL,
	"requested_time" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_advance_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"advance_type_id" uuid NOT NULL,
	"requested_amount" numeric NOT NULL,
	"approved_amount" numeric,
	"repayment_months" integer,
	"payment_mode" varchar(50),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"repaid_amount" numeric DEFAULT '0',
	"remaining_balance" numeric DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_exits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"requested_last_working_day" timestamp with time zone NOT NULL,
	"actual_last_working_day" timestamp with time zone,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_salary_structure_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"structure_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"amount" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"pay_basis" varchar(50) DEFAULT 'MONTHLY' NOT NULL,
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
CREATE TABLE "escalation_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"priority" varchar(50) NOT NULL,
	"grace_period_minutes" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kuab_escalation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"module" varchar(255) NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"escalation_level" integer NOT NULL,
	"delay_minutes" integer NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kuab_escalation_rules_unique" UNIQUE("organization_id","event_type","escalation_level")
);
--> statement-breakpoint
CREATE TABLE "kuab_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"source_module" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'PROCESSED' NOT NULL,
	"error_message" text,
	"emitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kuab_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"assigned_to_employee_id" uuid NOT NULL,
	"assigned_to_role_id" uuid,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"escalation_level" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_accrual_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_date" date NOT NULL,
	"frequency_type" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_accrual_execution_logs_date_freq_unique" UNIQUE("execution_date","frequency_type")
);
--> statement-breakpoint
CREATE TABLE "leave_department_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"max_concurrent_leaves" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_encashment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"encashment_days" numeric(4, 2) NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"payroll_processed" boolean DEFAULT false NOT NULL,
	"reason" text NOT NULL,
	"approver_id" uuid,
	"actioned_by" text,
	"actioned_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_statutory_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"epf_employee_contribution_rate" numeric DEFAULT '12.00' NOT NULL,
	"epf_employer_contribution_rate" numeric DEFAULT '12.00' NOT NULL,
	"epf_wage_ceiling" numeric DEFAULT '15000.00' NOT NULL,
	"epf_include_employer_in_ctc" boolean DEFAULT true NOT NULL,
	"esi_employee_contribution_rate" numeric DEFAULT '0.75' NOT NULL,
	"esi_employer_contribution_rate" numeric DEFAULT '3.25' NOT NULL,
	"esi_wage_ceiling" numeric DEFAULT '21000.00' NOT NULL,
	"esi_include_employer_in_ctc" boolean DEFAULT true NOT NULL,
	"pt_state" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"run_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"payment_mode" text,
	"payment_reference" text,
	"payment_attachments" jsonb,
	"total_gross_amount" numeric DEFAULT '0' NOT NULL,
	"total_deductions" numeric DEFAULT '0' NOT NULL,
	"total_net_amount" numeric DEFAULT '0' NOT NULL,
	"processed_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslip_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payslip_id" uuid NOT NULL,
	"component_id" uuid,
	"component_name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"total_present_days" numeric DEFAULT '0' NOT NULL,
	"total_absent_days" numeric DEFAULT '0' NOT NULL,
	"gross_amount" numeric DEFAULT '0' NOT NULL,
	"deductions_amount" numeric DEFAULT '0' NOT NULL,
	"net_amount" numeric DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_advance_repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advance_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"payslip_id" uuid,
	"repayment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"method" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"reason" text,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"date_given" timestamp with time zone,
	"repayment_method" varchar(50) DEFAULT 'DEDUCT_FROM_PAYROLL',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_components" (
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
CREATE TABLE "task_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_instance_id" uuid NOT NULL,
	"percentage" integer NOT NULL,
	"trigger_time" timestamp with time zone NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"employee_response" text,
	"is_extension_approved" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_escalation_matrices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"role_id" uuid,
	"user_id" text,
	"timeout_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_history_salary" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hall_bookings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "halls" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "employee_history_salary" CASCADE;--> statement-breakpoint
DROP TABLE "hall_bookings" CASCADE;--> statement-breakpoint
DROP TABLE "halls" CASCADE;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" DROP CONSTRAINT "employee_leave_balances_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_leave_balances" DROP CONSTRAINT "employee_leave_balances_leave_type_id_leave_types_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ALTER COLUMN "location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_definitions" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_definitions" ALTER COLUMN "shift_code" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD COLUMN "taken" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD COLUMN "carried_forward" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "default_shift_id" uuid;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "target_stock" numeric;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "is_trackable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "approver_id" uuid;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "encashment_min_tenure_days" integer DEFAULT 365 NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "encashment_min_balance_retained" numeric(5, 2) DEFAULT '3.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "encashment_only_at_year_end" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "whatsapp_po_template" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD COLUMN "received_quantity" numeric;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD COLUMN "verified_unit_rate" numeric;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD COLUMN "receiving_status" text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "payment_method" text DEFAULT 'credit' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "public_token" text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "cashier_bill_amount" numeric;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "cashier_payment_method" text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "cashier_attachments" jsonb;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "calculated_total" numeric;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "routing_configuration_id" uuid;--> statement-breakpoint
ALTER TABLE "raw_biometric_punches" ADD COLUMN "snapshot_url" text;--> statement-breakpoint
ALTER TABLE "shift_definitions" ADD COLUMN "is_flexible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD COLUMN "priority" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD COLUMN "evidence_requirement_type" text;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD COLUMN "escalation_policy_id" uuid;--> statement-breakpoint
ALTER TABLE "task_instances" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "task_instances" ADD COLUMN "escalation_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task_instances" ADD COLUMN "priority" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "task_instances" ADD COLUMN "completion_proof_url" text;--> statement-breakpoint
ALTER TABLE "task_instances" ADD COLUMN "completion_data" jsonb;--> statement-breakpoint
ALTER TABLE "task_instances" ADD COLUMN "skipped_reason" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "credit_limit_amount" numeric;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "po_delivery_method" text DEFAULT 'WHATSAPP' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "po_whatsapp_preference" text DEFAULT 'TEXT_AND_PDF_LINK' NOT NULL;--> statement-breakpoint
ALTER TABLE "advance_repayment_schedules" ADD CONSTRAINT "advance_repayment_schedules_advance_request_id_employee_advance_requests_id_fk" FOREIGN KEY ("advance_request_id") REFERENCES "public"."employee_advance_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_type_definitions" ADD CONSTRAINT "advance_type_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_type_definitions" ADD CONSTRAINT "advance_type_definitions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularization_requests" ADD CONSTRAINT "attendance_regularization_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularization_requests" ADD CONSTRAINT "attendance_regularization_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularization_requests" ADD CONSTRAINT "attendance_regularization_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_regularization_requests" ADD CONSTRAINT "attendance_regularization_requests_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advance_requests" ADD CONSTRAINT "employee_advance_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advance_requests" ADD CONSTRAINT "employee_advance_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advance_requests" ADD CONSTRAINT "employee_advance_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advance_requests" ADD CONSTRAINT "employee_advance_requests_advance_type_id_advance_type_definitions_id_fk" FOREIGN KEY ("advance_type_id") REFERENCES "public"."advance_type_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_exits" ADD CONSTRAINT "employee_exits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_exits" ADD CONSTRAINT "employee_exits_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_structure_components" ADD CONSTRAINT "employee_salary_structure_components_structure_id_employee_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."employee_salary_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_structure_components" ADD CONSTRAINT "employee_salary_structure_components_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_policies" ADD CONSTRAINT "escalation_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kuab_escalation_rules" ADD CONSTRAINT "kuab_escalation_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kuab_events" ADD CONSTRAINT "kuab_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kuab_tasks" ADD CONSTRAINT "kuab_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kuab_tasks" ADD CONSTRAINT "kuab_tasks_event_id_kuab_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."kuab_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kuab_tasks" ADD CONSTRAINT "kuab_tasks_assigned_to_employee_id_employees_id_fk" FOREIGN KEY ("assigned_to_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kuab_tasks" ADD CONSTRAINT "kuab_tasks_assigned_to_role_id_business_roles_id_fk" FOREIGN KEY ("assigned_to_role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_department_policies" ADD CONSTRAINT "leave_department_policies_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_department_policies" ADD CONSTRAINT "leave_department_policies_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_encashment_requests" ADD CONSTRAINT "leave_encashment_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_encashment_requests" ADD CONSTRAINT "leave_encashment_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_encashment_requests" ADD CONSTRAINT "leave_encashment_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_encashment_requests" ADD CONSTRAINT "leave_encashment_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_encashment_requests" ADD CONSTRAINT "leave_encashment_requests_approver_id_employees_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_encashment_requests" ADD CONSTRAINT "leave_encashment_requests_actioned_by_user_id_fk" FOREIGN KEY ("actioned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_statutory_settings" ADD CONSTRAINT "organization_statutory_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_processed_by_user_id_user_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_components" ADD CONSTRAINT "payslip_components_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_components" ADD CONSTRAINT "payslip_components_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_repayments" ADD CONSTRAINT "salary_advance_repayments_advance_id_salary_advances_id_fk" FOREIGN KEY ("advance_id") REFERENCES "public"."salary_advances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_repayments" ADD CONSTRAINT "salary_advance_repayments_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checkpoints" ADD CONSTRAINT "task_checkpoints_task_instance_id_task_instances_id_fk" FOREIGN KEY ("task_instance_id") REFERENCES "public"."task_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_escalation_matrices" ADD CONSTRAINT "task_escalation_matrices_definition_id_task_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."task_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_escalation_matrices" ADD CONSTRAINT "task_escalation_matrices_role_id_business_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."business_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_escalation_matrices" ADD CONSTRAINT "task_escalation_matrices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kuab_events_org_idx" ON "kuab_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kuab_events_type_idx" ON "kuab_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "kuab_events_status_idx" ON "kuab_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kuab_tasks_org_idx" ON "kuab_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kuab_tasks_assignee_idx" ON "kuab_tasks" USING btree ("assigned_to_employee_id");--> statement-breakpoint
CREATE INDEX "kuab_tasks_status_idx" ON "kuab_tasks" USING btree ("status");--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_default_shift_id_shift_definitions_id_fk" FOREIGN KEY ("default_shift_id") REFERENCES "public"."shift_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approver_id_employees_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_leave_balances_emp_idx" ON "employee_leave_balances" USING btree ("employee_id");--> statement-breakpoint
ALTER TABLE "employee_leave_balances" DROP COLUMN "year";--> statement-breakpoint
ALTER TABLE "employee_leave_balances" DROP COLUMN "opening_balance";--> statement-breakpoint
ALTER TABLE "employee_leave_balances" DROP COLUMN "consumed";--> statement-breakpoint
ALTER TABLE "employee_leave_balances" DROP COLUMN "adjusted";--> statement-breakpoint
ALTER TABLE "employee_salary_info" DROP COLUMN "salary_type";--> statement-breakpoint
ALTER TABLE "employee_salary_info" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "employee_salary_info" DROP COLUMN "effective_from";--> statement-breakpoint
ALTER TABLE "shift_definitions" DROP COLUMN "min_punch_in_time";--> statement-breakpoint
ALTER TABLE "shift_definitions" DROP COLUMN "max_punch_in_time";--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_unique" UNIQUE("employee_id","leave_type_id");