-- Migration 0057: Add prep_unit and prep_unit_conversion to items table
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "prep_unit" text;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "prep_unit_conversion" numeric;
