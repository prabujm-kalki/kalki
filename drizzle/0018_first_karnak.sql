ALTER TABLE "leave_types" ADD COLUMN "accrual_frequency" varchar(20) DEFAULT 'YEARLY';--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "accrual_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "carry_forward_expiry_months" integer;