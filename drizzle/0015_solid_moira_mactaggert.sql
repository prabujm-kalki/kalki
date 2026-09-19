CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_event_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"recipient_user_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"provider_reference" text,
	"failure_information" jsonb,
	"retry_at" timestamp with time zone,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_idempotency_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "notification_deliveries_attempt_count_check" CHECK ("notification_deliveries"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"work_instance_id" uuid,
	"source_event" text NOT NULL,
	"notification_type" text NOT NULL,
	"criticality" text DEFAULT 'NORMAL' NOT NULL,
	"recipient_user_id" text NOT NULL,
	"payload_reference" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processing_state" text DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_events_idempotency_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_channel_unique" UNIQUE("user_id","channel")
);
--> statement-breakpoint
CREATE TABLE "notification_provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"notification_delivery_id" uuid,
	"event_type" text NOT NULL,
	"raw_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_provider_events_unique" UNIQUE("provider","provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "scheduler_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_identity" text NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"items_scanned" integer DEFAULT 0 NOT NULL,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"failure_information" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_escalation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"work_instance_id" uuid NOT NULL,
	"stage_position" integer NOT NULL,
	"occurrence_index" integer DEFAULT 0 NOT NULL,
	"trigger_condition" text NOT NULL,
	"notification_event_id" uuid,
	"recipient_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'EXECUTED' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_escalation_history_instance_stage_occurrence_unique" UNIQUE("work_instance_id","stage_position","occurrence_index")
);
--> statement-breakpoint
ALTER TABLE "work_instances" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_event_id_notification_events_id_fk" FOREIGN KEY ("notification_event_id") REFERENCES "public"."notification_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_org_instance_fk" FOREIGN KEY ("organization_id","work_instance_id") REFERENCES "public"."work_instances"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_provider_events" ADD CONSTRAINT "notification_provider_events_notification_delivery_id_notification_deliveries_id_fk" FOREIGN KEY ("notification_delivery_id") REFERENCES "public"."notification_deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_escalation_history" ADD CONSTRAINT "work_escalation_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_escalation_history" ADD CONSTRAINT "work_escalation_history_org_instance_fk" FOREIGN KEY ("organization_id","work_instance_id") REFERENCES "public"."work_instances"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_deliveries_event_channel_idx" ON "notification_deliveries" USING btree ("notification_event_id","channel");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_retry_idx" ON "notification_deliveries" USING btree ("status","retry_at");--> statement-breakpoint
CREATE INDEX "notification_events_org_state_idx" ON "notification_events" USING btree ("organization_id","processing_state");--> statement-breakpoint
CREATE INDEX "work_escalation_history_org_instance_idx" ON "work_escalation_history" USING btree ("organization_id","work_instance_id");--> statement-breakpoint
CREATE INDEX "work_instances_organization_due_idx" ON "work_instances" USING btree ("organization_id","due_at");