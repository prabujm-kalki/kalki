ALTER TABLE "organizations" 
ADD COLUMN IF NOT EXISTS "quotation_settings" jsonb DEFAULT '{"defaultValidityDays": 15, "defaultPaymentTerms": "Payment within 15 days of invoice", "defaultNotes": "Thank you for your business inquiry!", "defaultTermsAndConditions": "1. Goods once sold will be accepted under warranty policy.\n2. Rates quoted are valid until the validity date specified.\n3. Taxes as applicable at time of invoicing."}'::jsonb;

