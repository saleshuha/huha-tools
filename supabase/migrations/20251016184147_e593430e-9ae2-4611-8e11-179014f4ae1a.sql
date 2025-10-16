-- Swap ASIN and SKU for specific item (serial number 00167)
UPDATE asin_inventory 
SET 
  asin = 'B0DYG644VD',
  sku = 'SYA002096612A',
  updated_at = now()
WHERE id = '6e7cef1b-f18b-4f06-975f-90437712fa01';