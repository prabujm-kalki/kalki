ALTER TABLE "purchase_debit_notes" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "purchase_debit_notes" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "purchase_debit_notes" ADD COLUMN "approved_by_user_id" text;--> statement-breakpoint
ALTER TABLE "purchase_debit_notes" ADD CONSTRAINT "purchase_debit_notes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_debit_notes" ADD CONSTRAINT "purchase_debit_notes_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;