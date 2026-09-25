CREATE TABLE "attendance_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"shift_definition_id" uuid,
	"first_punch_in" timestamp with time zone,
	"last_punch_out" timestamp with time zone,
	"gross_hours" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"net_hours" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"overtime_hours" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(30) NOT NULL,
	"is_regularized" boolean DEFAULT false NOT NULL,
	"regularization_reason" text,
	"regularized_by" text,
	"regularized_at" timestamp with time zone,
	"spread_over_exceeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biometric_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"uploaded_by" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"total_rows" integer NOT NULL,
	"successful_rows" integer NOT NULL,
	"failed_rows" integer NOT NULL,
	"errors" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"opening_balance" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"accrued" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"consumed" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"adjusted" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"closing_balance" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" numeric(4, 2) NOT NULL,
	"is_half_day" boolean DEFAULT false NOT NULL,
	"half_day_session" varchar(20),
	"reason" text NOT NULL,
	"evidence_url" text,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"actioned_by" text,
	"actioned_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_paid" boolean DEFAULT true NOT NULL,
	"allow_half_day" boolean DEFAULT true NOT NULL,
	"requires_evidence" boolean DEFAULT false NOT NULL,
	"min_notice_days" integer DEFAULT 0 NOT NULL,
	"max_consecutive_days" integer,
	"sandwich_rule_enabled" boolean DEFAULT false NOT NULL,
	"annual_allocation" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"max_carry_forward_days" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"is_encashable" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_biometric_punches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"biometric_id" varchar(100) NOT NULL,
	"employee_id" uuid,
	"punch_timestamp" timestamp with time zone NOT NULL,
	"punch_type" varchar(20) DEFAULT 'UNKNOWN' NOT NULL,
	"machine_id" varchar(100) NOT NULL,
	"source_type" varchar(50) DEFAULT 'EXCEL_IMPORT' NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_id" uuid,
	"shift_code" varchar(50) NOT NULL,
	"shift_name" varchar(100) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"min_punch_in_time" time,
	"max_punch_in_time" time,
	"grace_period_minutes" integer DEFAULT 15 NOT NULL,
	"min_hours_half_day" numeric(4, 2) DEFAULT '4.00' NOT NULL,
	"min_hours_full_day" numeric(4, 2) DEFAULT '8.00' NOT NULL,
	"rest_break_minutes" integer DEFAULT 60 NOT NULL,
	"is_cross_midnight" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_shift_definition_id_shift_definitions_id_fk" FOREIGN KEY ("shift_definition_id") REFERENCES "public"."shift_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_regularized_by_user_id_fk" FOREIGN KEY ("regularized_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_import_batches" ADD CONSTRAINT "biometric_import_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_import_batches" ADD CONSTRAINT "biometric_import_batches_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_import_batches" ADD CONSTRAINT "biometric_import_batches_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_actioned_by_user_id_fk" FOREIGN KEY ("actioned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_biometric_punches" ADD CONSTRAINT "raw_biometric_punches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_biometric_punches" ADD CONSTRAINT "raw_biometric_punches_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_biometric_punches" ADD CONSTRAINT "raw_biometric_punches_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_biometric_punches" ADD CONSTRAINT "raw_biometric_punches_import_batch_id_biometric_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."biometric_import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_definitions" ADD CONSTRAINT "shift_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_definitions" ADD CONSTRAINT "shift_definitions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;