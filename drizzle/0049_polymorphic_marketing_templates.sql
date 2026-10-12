-- Add target_entity_type column to marketing_templates
ALTER TABLE "marketing_templates" ADD COLUMN "target_entity_type" varchar(50) DEFAULT 'CUSTOMER' NOT NULL;
--> statement-breakpoint

-- Drop foreign key constraint on customer_id from marketing_template_audiences
ALTER TABLE "marketing_template_audiences" DROP CONSTRAINT IF EXISTS "marketing_template_audiences_customer_id_customers_id_fk";
--> statement-breakpoint

-- Add target_entity_type and target_entity_id to marketing_template_audiences (migrate data from customer_id if any)
ALTER TABLE "marketing_template_audiences" ADD COLUMN "target_entity_type" varchar(50) DEFAULT 'CUSTOMER' NOT NULL;
--> statement-breakpoint
ALTER TABLE "marketing_template_audiences" ADD COLUMN "target_entity_id" uuid;
--> statement-breakpoint
UPDATE "marketing_template_audiences" SET "target_entity_id" = "customer_id" WHERE "target_entity_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "marketing_template_audiences" ALTER COLUMN "target_entity_id" SET NOT NULL;
--> statement-breakpoint

-- Drop the old customer_id column
ALTER TABLE "marketing_template_audiences" DROP COLUMN "customer_id";
--> statement-breakpoint

-- Create composite index on (target_entity_type, target_entity_id)
CREATE INDEX IF NOT EXISTS "idx_polymorphic_target" ON "marketing_template_audiences" ("target_entity_type", "target_entity_id");