ALTER TABLE "shift_definitions" ADD COLUMN IF NOT EXISTS "max_monthly_late_occurrences" integer DEFAULT 3 NOT NULL;
ALTER TABLE "shift_definitions" ADD COLUMN IF NOT EXISTS "late_penalty_type" varchar(50) DEFAULT 'HALF_DAY_DEDUCTION' NOT NULL;
ALTER TABLE "shift_definitions" ADD COLUMN IF NOT EXISTS "extreme_late_threshold_minutes" integer DEFAULT 120 NOT NULL;
