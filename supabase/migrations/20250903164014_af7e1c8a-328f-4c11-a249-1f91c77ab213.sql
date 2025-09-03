-- Clear noon orders data for cleanup
DELETE FROM public.noon_orders WHERE user_id = auth.uid();

-- Clear related noon order events
DELETE FROM public.noon_order_events WHERE user_id = auth.uid();