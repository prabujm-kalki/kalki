-- Migration 0065: Add business type and comparison configurations to locations
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) NOT NULL DEFAULT 'RESTAURANT',
ADD COLUMN IF NOT EXISTS operating_profile VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS is_comparison_enabled BOOLEAN NOT NULL DEFAULT true;

-- Update existing locations to appropriate business types based on real operations
UPDATE locations SET business_type = 'CORPORATE_HQ', operating_profile = 'CORPORATE_HQ', is_comparison_enabled = false WHERE code = 'HO';
UPDATE locations SET business_type = 'RESTAURANT', operating_profile = 'RURAL', is_comparison_enabled = true WHERE code = 'AKP';
UPDATE locations SET business_type = 'RETAIL_STORE', operating_profile = 'RETAIL_SUPERMARKET', is_comparison_enabled = true WHERE code = 'APD' OR name ILIKE '%Department Store%';
UPDATE locations SET business_type = 'RESTAURANT', operating_profile = 'URBAN_HIGH_RENT', is_comparison_enabled = true WHERE code = 'APR';
UPDATE locations SET business_type = 'RESTAURANT', operating_profile = 'URBAN_HIGH_RENT', is_comparison_enabled = true WHERE code = 'ED';
