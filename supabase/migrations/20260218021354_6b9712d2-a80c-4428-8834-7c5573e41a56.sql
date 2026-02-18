ALTER TABLE purchase_links 
ADD COLUMN po_order_ids UUID[] DEFAULT NULL;

COMMENT ON COLUMN purchase_links.po_order_ids IS 
  'Optional specific item IDs. When set, only these items are included instead of all items from po_numbers.';