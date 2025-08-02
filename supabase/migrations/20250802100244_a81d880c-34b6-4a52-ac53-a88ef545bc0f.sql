-- Create an enhanced function to match invoices/credits with fees and provide comprehensive analysis
CREATE OR REPLACE FUNCTION public.get_order_fees_analysis(
  country_filter text DEFAULT 'UAE',
  store_filter uuid DEFAULT NULL,
  start_date timestamp with time zone DEFAULT (now() - interval '3 months'),
  end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  order_number text,
  order_type text, -- 'invoice' or 'credit'
  item_nr text,
  sku text,
  description text,
  document_date timestamp with time zone,
  invoice_price numeric,
  total_fees numeric,
  net_amount numeric,
  fee_breakdown jsonb,
  fee_coverage_status text,
  order_status text,
  store_name text,
  profit_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH invoice_data AS (
    SELECT 
      i.invoice_nr as order_number,
      'invoice' as order_type,
      i.source_doc_nr as item_nr,
      i.sku,
      i.description,
      i.document_date,
      i.price_including_vat_doc_currency as invoice_price,
      i.user_id,
      COALESCE(s.name, 'Unknown Store') as store_name
    FROM public.noon_invoice_data i
    LEFT JOIN public.stores s ON s.id::text = i.issuer_legal_entity -- Assuming store mapping
    WHERE i.country = country_filter
      AND i.user_id = auth.uid()
      AND (store_filter IS NULL OR s.id = store_filter)
      AND (i.document_date IS NULL OR i.document_date BETWEEN start_date AND end_date)
  ),
  credit_data AS (
    SELECT 
      c.credit_note_nr as order_number,
      'credit' as order_type,
      c.source_doc_nr as item_nr,
      c.sku,
      c.description,
      c.document_date,
      c.price_including_vat_doc_currency as invoice_price,
      c.user_id,
      COALESCE(s.name, 'Unknown Store') as store_name
    FROM public.noon_credit_data c
    LEFT JOIN public.stores s ON s.id::text = c.issuer_legal_entity -- Assuming store mapping
    WHERE c.country = country_filter
      AND c.user_id = auth.uid()
      AND (store_filter IS NULL OR s.id = store_filter)
      AND (c.document_date IS NULL OR c.document_date BETWEEN start_date AND end_date)
  ),
  all_orders AS (
    SELECT * FROM invoice_data
    UNION ALL
    SELECT * FROM credit_data
  ),
  fees_aggregated AS (
    SELECT 
      f.order_nr,
      f.item_nr,
      f.item_status,
      SUM(COALESCE(f.fee_referral, 0) + COALESCE(f.fee_shipping, 0) + 
          COALESCE(f.fee_outbound_fbn, 0) + COALESCE(f.fee_weight_handling, 0) +
          COALESCE(f.fee_crossdock, 0) + COALESCE(f.fee_directship_outbound, 0) +
          COALESCE(f.fee_damaged_return, 0) + COALESCE(f.fee_noon_penalty, 0) +
          COALESCE(f.fee_item_cancellation, 0) + COALESCE(f.fee_warranty_penalty, 0) +
          COALESCE(f.fee_retention_penalty, 0) + COALESCE(f.fee_alternate_seller_fulfillment, 0) +
          COALESCE(f.fee_miscellaneous, 0) + COALESCE(f.fee_direct_collection, 0) +
          COALESCE(f.fee_reinvoicing, 0) + COALESCE(f.fee_noon_promo, 0) +
          COALESCE(f.fee_noon_markup, 0)) as total_fees,
      jsonb_build_object(
        'referral', SUM(COALESCE(f.fee_referral, 0)),
        'shipping', SUM(COALESCE(f.fee_shipping, 0)),
        'outbound_fbn', SUM(COALESCE(f.fee_outbound_fbn, 0)),
        'weight_handling', SUM(COALESCE(f.fee_weight_handling, 0)),
        'crossdock', SUM(COALESCE(f.fee_crossdock, 0)),
        'directship_outbound', SUM(COALESCE(f.fee_directship_outbound, 0)),
        'damaged_return', SUM(COALESCE(f.fee_damaged_return, 0)),
        'noon_penalty', SUM(COALESCE(f.fee_noon_penalty, 0)),
        'item_cancellation', SUM(COALESCE(f.fee_item_cancellation, 0)),
        'warranty_penalty', SUM(COALESCE(f.fee_warranty_penalty, 0)),
        'retention_penalty', SUM(COALESCE(f.fee_retention_penalty, 0)),
        'alternate_seller_fulfillment', SUM(COALESCE(f.fee_alternate_seller_fulfillment, 0)),
        'miscellaneous', SUM(COALESCE(f.fee_miscellaneous, 0)),
        'direct_collection', SUM(COALESCE(f.fee_direct_collection, 0)),
        'reinvoicing', SUM(COALESCE(f.fee_reinvoicing, 0)),
        'noon_promo', SUM(COALESCE(f.fee_noon_promo, 0)),
        'noon_markup', SUM(COALESCE(f.fee_noon_markup, 0))
      ) as fee_breakdown
    FROM public.noon_order_fees f
    WHERE f.country_code = country_filter
      AND f.user_id = auth.uid()
      AND (store_filter IS NULL OR f.store_id = store_filter)
    GROUP BY f.order_nr, f.item_nr, f.item_status
  )
  SELECT 
    o.order_number,
    o.order_type,
    o.item_nr,
    o.sku,
    o.description,
    o.document_date,
    COALESCE(o.invoice_price, 0) as invoice_price,
    COALESCE(f.total_fees, 0) as total_fees,
    COALESCE(o.invoice_price, 0) - COALESCE(f.total_fees, 0) as net_amount,
    COALESCE(f.fee_breakdown, '{}'::jsonb) as fee_breakdown,
    CASE 
      WHEN f.total_fees IS NOT NULL THEN 'Fees Available'
      ELSE 'Fees Missing'
    END as fee_coverage_status,
    COALESCE(f.item_status, 'Unknown') as order_status,
    o.store_name,
    CASE 
      WHEN COALESCE(o.invoice_price, 0) > 0 
      THEN ((COALESCE(o.invoice_price, 0) - COALESCE(f.total_fees, 0)) / o.invoice_price) * 100
      ELSE 0
    END as profit_margin
  FROM all_orders o
  LEFT JOIN fees_aggregated f ON (
    o.order_number = f.order_nr OR 
    o.item_nr = f.item_nr OR
    o.order_number = f.item_nr
  )
  ORDER BY o.document_date DESC NULLS LAST, o.order_number;
END;
$function$;