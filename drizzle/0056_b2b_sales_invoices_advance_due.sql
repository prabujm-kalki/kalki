-- Migration 0056: Add advance_paid and balance_due to b2b_sales_invoices
ALTER TABLE "b2b_sales_invoices" ADD COLUMN IF NOT EXISTS "advance_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE "b2b_sales_invoices" ADD COLUMN IF NOT EXISTS "balance_due" numeric(12, 2);
