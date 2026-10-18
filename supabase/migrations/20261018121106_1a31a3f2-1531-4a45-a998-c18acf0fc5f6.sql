CREATE TABLE public.trendyol_amazon_prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, asin text NOT NULL, price numeric, currency text NOT NULL DEFAULT 'SAR', status text NOT NULL, last_error text, fetched_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,asin)
);
GRANT SELECT ON public.trendyol_amazon_prices TO authenticated;
GRANT ALL ON public.trendyol_amazon_prices TO service_role;
ALTER TABLE public.trendyol_amazon_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators read own Amazon prices" ON public.trendyol_amazon_prices FOR SELECT TO authenticated USING (user_id=auth.uid() AND public.has_role(auth.uid(),'admin'));
CREATE TABLE public.trendyol_pricing_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE, percentage numeric NOT NULL DEFAULT 0 CHECK (percentage BETWEEN -100 AND 1000), fixed_sar numeric NOT NULL DEFAULT 0 CHECK (fixed_sar BETWEEN -10000 AND 10000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.trendyol_pricing_settings TO authenticated;
GRANT ALL ON public.trendyol_pricing_settings TO service_role;
ALTER TABLE public.trendyol_pricing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators manage own pricing settings" ON public.trendyol_pricing_settings FOR ALL TO authenticated USING (user_id=auth.uid() AND public.has_role(auth.uid(),'admin')) WITH CHECK (user_id=auth.uid() AND public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.touch_trendyol_pricing_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER touch_amazon_prices BEFORE UPDATE ON public.trendyol_amazon_prices FOR EACH ROW EXECUTE FUNCTION public.touch_trendyol_pricing_updated_at();
CREATE TRIGGER touch_pricing_settings BEFORE UPDATE ON public.trendyol_pricing_settings FOR EACH ROW EXECUTE FUNCTION public.touch_trendyol_pricing_updated_at();