-- Fix historical stock audit records that used wrong inventory_type
UPDATE stock_changes SET inventory_type = 'asin' WHERE inventory_type = 'asin_inventory';

-- Fix missing changed_by for stock audit entries
UPDATE stock_changes SET changed_by = user_id WHERE reference_type = 'stock_audit' AND changed_by IS NULL;