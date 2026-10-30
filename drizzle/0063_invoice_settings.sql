ALTER TABLE "organizations" 
ADD COLUMN IF NOT EXISTS "invoice_settings" jsonb DEFAULT '{
  "defaultTemplate": "CLASSIC_CORPORATE",
  "primaryColor": "#0f172a",
  "showLogo": true,
  "showHsn": true,
  "showUom": true,
  "showDiscount": true,
  "showTaxBreakup": true,
  "bankName": "",
  "accountNumber": "",
  "ifscCode": "",
  "accountHolder": "",
  "upiId": "",
  "authorizedSignatory": "Authorized Signatory",
  "defaultTerms": "1. Payment is due within agreed credit terms.\n2. Interest @ 18% p.a. charged on overdue invoices.\n3. Goods once sold will not be accepted back unless authorized."
}'::jsonb;
