ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "whatsapp_dispatch_mode" text DEFAULT 'WEB_LINK_POPUP' NOT NULL;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "whatsapp_content_format" text DEFAULT 'TEXT_AND_PDF_LINK' NOT NULL;

