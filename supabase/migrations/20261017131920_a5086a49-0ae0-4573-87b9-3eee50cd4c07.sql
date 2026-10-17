CREATE TABLE public.trendyol_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, asin text NOT NULL, sku text NOT NULL, barcode text NOT NULL,
 title text NOT NULL, description text NOT NULL DEFAULT '', brand_id bigint, category_id bigint, product_main_id text NOT NULL,
 sale_price numeric NOT NULL DEFAULT 0, list_price numeric NOT NULL DEFAULT 0, vat_rate integer NOT NULL DEFAULT 15,
 images jsonb NOT NULL DEFAULT '[]', attributes jsonb NOT NULL DEFAULT '[]', enabled boolean NOT NULL DEFAULT true,
 publish_status text NOT NULL DEFAULT 'draft', last_batch_id text, last_error text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,asin), UNIQUE(user_id,barcode), UNIQUE(user_id,sku)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.trendyol_products TO authenticated;
GRANT ALL ON public.trendyol_products TO service_role;
ALTER TABLE public.trendyol_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY trendyol_products_owner ON public.trendyol_products FOR ALL TO authenticated USING(user_id=auth.uid() AND public.has_role(auth.uid(),'admin')) WITH CHECK(user_id=auth.uid() AND public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trendyol_products_updated BEFORE UPDATE ON public.trendyol_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.trendyol_packages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, package_id text NOT NULL, order_number text NOT NULL,
 remote_status text NOT NULL, lines jsonb NOT NULL, payload jsonb NOT NULL, fulfilled_at timestamptz, fulfillment_result jsonb,
 last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,package_id)
);
GRANT SELECT ON public.trendyol_packages TO authenticated;
GRANT ALL ON public.trendyol_packages TO service_role;
ALTER TABLE public.trendyol_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY trendyol_packages_owner ON public.trendyol_packages FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trendyol_packages_updated BEFORE UPDATE ON public.trendyol_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.trendyol_sync_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL, action text NOT NULL,status text NOT NULL,
 batch_id text, product_ids uuid[] NOT NULL DEFAULT '{}', result jsonb, error_message text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trendyol_sync_runs TO authenticated;
GRANT ALL ON public.trendyol_sync_runs TO service_role;
ALTER TABLE public.trendyol_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY trendyol_runs_owner ON public.trendyol_sync_runs FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trendyol_runs_updated BEFORE UPDATE ON public.trendyol_sync_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.fulfill_trendyol_package(p_user_id uuid,p_package_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pkg public.trendyol_packages%ROWTYPE; line jsonb; mapping public.trendyol_products%ROWTYPE; inv public.asin_inventory%ROWTYPE;
 needed integer; available integer; take_qty integer; previous integer; allocations jsonb := '[]'; qty_text text;
BEGIN
 IF NOT public.has_role(p_user_id,'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('trendyol:'||p_user_id::text,0));
 SELECT * INTO pkg FROM public.trendyol_packages WHERE id=p_package_id AND user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order package not found'; END IF;
 IF pkg.fulfilled_at IS NOT NULL THEN RETURN jsonb_build_object('alreadyFulfilled',true,'allocations',pkg.fulfillment_result); END IF;
 IF pkg.remote_status NOT IN ('Created','Picking') THEN RAISE EXCEPTION 'Package status is not fulfillable: %',pkg.remote_status; END IF;
 IF jsonb_typeof(pkg.lines) <> 'array' OR jsonb_array_length(pkg.lines)=0 THEN RAISE EXCEPTION 'Package has no order lines'; END IF;
 -- Lock every potentially used row in deterministic order before any deduction.
 PERFORM i.id FROM public.asin_inventory i WHERE i.user_id=p_user_id AND i.country='KSA' AND coalesce(i.is_active,true) AND i.status='in-stock'
 AND upper(trim(i.asin)) IN (SELECT upper(trim(p.asin)) FROM public.trendyol_products p WHERE p.user_id=p_user_id AND p.barcode IN (SELECT l->>'barcode' FROM jsonb_array_elements(pkg.lines) l)) ORDER BY i.id FOR UPDATE;
 FOR line IN SELECT value FROM jsonb_array_elements(pkg.lines) LOOP
  qty_text := line->>'quantity';
  IF qty_text IS NULL OR qty_text !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Invalid order quantity'; END IF;
  needed := qty_text::integer;
  IF needed <= 0 THEN RAISE EXCEPTION 'Invalid order quantity'; END IF;
  SELECT * INTO mapping FROM public.trendyol_products WHERE user_id=p_user_id AND barcode=line->>'barcode' AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active inventory mapping for barcode %',line->>'barcode'; END IF;
  SELECT coalesce(sum(quantity),0) INTO available FROM public.asin_inventory WHERE user_id=p_user_id AND country='KSA' AND upper(trim(asin))=upper(trim(mapping.asin)) AND coalesce(is_active,true) AND status='in-stock' AND quantity>0;
  IF available < needed THEN RAISE EXCEPTION 'Insufficient stock for %: need %, available %',mapping.sku,needed,available; END IF;
  FOR inv IN SELECT * FROM public.asin_inventory WHERE user_id=p_user_id AND country='KSA' AND upper(trim(asin))=upper(trim(mapping.asin)) AND coalesce(is_active,true) AND status='in-stock' AND quantity>0 ORDER BY id FOR UPDATE LOOP
   EXIT WHEN needed=0; take_qty := least(needed,inv.quantity); previous := inv.quantity;
   UPDATE public.asin_inventory SET quantity=quantity-take_qty WHERE id=inv.id;
   INSERT INTO public.stock_changes(user_id,inventory_type,inventory_id,asin,sku_number,serial_number,previous_quantity,new_quantity,change_amount,change_reason,reference_type,reference_id,reference_number,changed_by,fulfillment_source,source_type,metadata)
   VALUES(p_user_id,'asin',inv.id,inv.asin,mapping.sku,inv.serial_number,previous,previous-take_qty,-take_qty,'Trendyol Saudi order fulfillment','trendyol_order',pkg.id,pkg.order_number,p_user_id,'trendyol','customer_sale',jsonb_build_object('package_id',pkg.package_id,'line_id',line->>'id'));
   allocations := allocations || jsonb_build_array(jsonb_build_object('inventoryId',inv.id,'asin',inv.asin,'sku',mapping.sku,'quantity',take_qty,'serial',inv.serial_number));
   needed := needed-take_qty;
  END LOOP;
 END LOOP;
 UPDATE public.trendyol_packages SET fulfilled_at=now(),fulfillment_result=allocations,last_error=NULL WHERE id=pkg.id;
 RETURN jsonb_build_object('alreadyFulfilled',false,'allocations',allocations);
END; $$;
REVOKE ALL ON FUNCTION public.fulfill_trendyol_package(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_trendyol_package(uuid,uuid) TO service_role;