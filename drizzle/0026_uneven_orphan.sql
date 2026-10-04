ALTER TABLE "task_definitions" ADD COLUMN "completion_time_mins" integer;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD COLUMN "escalation_delay_mins" integer;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD COLUMN "warning_threshold_mins" integer;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD COLUMN "allow_time_extension" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD COLUMN "max_extension_mins" integer;--> statement-breakpoint
ALTER TABLE "task_escalation_matrices" ADD COLUMN "escalate_to_reporting_manager" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_instances" ADD COLUMN "extension_requested_mins" integer DEFAULT 0 NOT NULL;