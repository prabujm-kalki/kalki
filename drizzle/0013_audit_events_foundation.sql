CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "location_id" uuid,
  "actor_user_id" text,
  "event_type" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_location_fk" FOREIGN KEY ("organization_id","location_id") REFERENCES "public"."locations"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_events_organization_created_idx" ON "audit_events" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX "audit_events_organization_entity_idx" ON "audit_events" USING btree ("organization_id","entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "audit_events_organization_actor_idx" ON "audit_events" USING btree ("organization_id","actor_user_id");
--> statement-breakpoint
CREATE INDEX "audit_events_organization_event_type_idx" ON "audit_events" USING btree ("organization_id","event_type");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_audit_event_mutation"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_events_append_only_update"
BEFORE UPDATE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION "prevent_audit_event_mutation"();
--> statement-breakpoint
CREATE TRIGGER "audit_events_append_only_delete"
BEFORE DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION "prevent_audit_event_mutation"();
