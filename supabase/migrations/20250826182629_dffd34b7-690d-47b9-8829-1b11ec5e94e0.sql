-- Delete all PO orders (active and closed statuses)
DELETE FROM public.po_orders 
WHERE status IN ('pending', 'ordered', 'shipped', 'closed', 'delivered');

-- Delete Sunsky order items for placed orders (those with po_numbers)
DELETE FROM public.sunsky_order_items 
WHERE order_number IN (
  SELECT number FROM public.sunsky_orders 
  WHERE po_numbers IS NOT NULL AND cardinality(po_numbers) > 0
);

-- Delete placed Sunsky orders (those with po_numbers)
DELETE FROM public.sunsky_orders 
WHERE po_numbers IS NOT NULL AND cardinality(po_numbers) > 0;