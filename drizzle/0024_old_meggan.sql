ALTER TABLE "items" ADD COLUMN "replenishment_strategy" text DEFAULT 'top_up' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "reorder_quantity" numeric;