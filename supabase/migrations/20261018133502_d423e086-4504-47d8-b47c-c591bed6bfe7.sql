-- lovable-cron-fallback-reviewed: Wake on enqueue; retry asynchronous provider batches once per minute only while pending, unschedule after drain; no idle polling.
ALTER TABLE public.trendyol_products ADD COLUMN stock_sync_mapped boolean NOT NULL DEFAULT false;
UPDATE public.trendyol_products p SET stock_sync_mapped=true WHERE EXISTS (SELECT 1 FROM public.asin_inventory i WHERE i.user_id=p.user_id AND i.country='KSA' AND upper(trim(i.asin))=upper(trim(p.asin)));
CREATE TABLE public.trendyol_stock_queue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, product_id uuid NOT NULL REFERENCES public.trendyol_products(id) ON DELETE CASCADE,
 version bigint NOT NULL DEFAULT 1, sent_version bigint, batch_id text, state text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(product_id)
);
GRANT SELECT ON public.trendyol_stock_queue TO authenticated;
GRANT ALL ON public.trendyol_stock_queue TO service_role;
ALTER TABLE public.trendyol_stock_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY trendyol_stock_queue_owner ON public.trendyol_stock_queue FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trendyol_stock_queue_updated BEFORE UPDATE ON public.trendyol_stock_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.trendyol_stock_worker (id integer PRIMARY KEY, lease_until timestamptz NOT NULL DEFAULT '-infinity', lease_token uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.trendyol_stock_worker TO service_role;
ALTER TABLE public.trendyol_stock_worker ENABLE ROW LEVEL SECURITY;
INSERT INTO public.trendyol_stock_worker(id) VALUES(1);
CREATE TRIGGER trendyol_stock_worker_updated BEFORE UPDATE ON public.trendyol_stock_worker FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.wake_trendyol_stock() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM net.http_post(url:='https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/trendyol-stock',body:='{}'::jsonb,headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=1000);
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='trendyol-stock-retry') THEN
  PERFORM cron.schedule('trendyol-stock-retry','* * * * *',$job$SELECT public.wake_trendyol_stock_if_pending();$job$);
 END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.wake_trendyol_stock_if_pending() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.trendyol_stock_queue WHERE state IN ('pending','submitted')) THEN
  PERFORM net.http_post(url:='https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/trendyol-stock',body:='{}'::jsonb,headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=1000);
 ELSE
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='trendyol-stock-retry';
 END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.claim_trendyol_stock_worker(p_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.trendyol_stock_worker SET lease_until=now()+interval '120 seconds',lease_token=p_token WHERE id=1 AND lease_until<now();
 RETURN FOUND;
END; $$;
CREATE OR REPLACE FUNCTION public.release_trendyol_stock_worker(p_token uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.trendyol_stock_worker SET lease_until='-infinity',lease_token=NULL WHERE id=1 AND lease_token=p_token;
 IF NOT EXISTS(SELECT 1 FROM public.trendyol_stock_queue WHERE state IN ('pending','submitted')) THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='trendyol-stock-retry';
 END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.queue_trendyol_stock(p_user_id uuid,p_ids uuid[] DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 IF NOT public.has_role(p_user_id,'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 UPDATE public.trendyol_products p SET stock_sync_mapped=true WHERE p.user_id=p_user_id AND (p_ids IS NULL OR p.id=ANY(p_ids)) AND NOT p.stock_sync_mapped AND EXISTS(SELECT 1 FROM public.asin_inventory i WHERE i.user_id=p.user_id AND i.country='KSA' AND upper(trim(i.asin))=upper(trim(p.asin)));
 INSERT INTO public.trendyol_stock_queue(user_id,product_id) SELECT p.user_id,p.id FROM public.trendyol_products p WHERE p.user_id=p_user_id AND p.stock_sync_mapped AND (p_ids IS NULL OR p.id=ANY(p_ids))
 ON CONFLICT(product_id) DO UPDATE SET version=trendyol_stock_queue.version+1,state=CASE WHEN trendyol_stock_queue.batch_id IS NOT NULL THEN 'submitted' ELSE 'pending' END, next_attempt_at=now(),last_error=NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n>0 THEN PERFORM public.wake_trendyol_stock(); END IF;
 RETURN n;
END; $$;
CREATE OR REPLACE FUNCTION public.enqueue_trendyol_inventory_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; n integer:=0; affected integer;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.quantity,NEW.status,NEW.is_active,NEW.asin,NEW.country,NEW.user_id) IS NOT DISTINCT FROM (OLD.quantity,OLD.status,OLD.is_active,OLD.asin,OLD.country,OLD.user_id) THEN RETURN NEW; END IF;
 FOR r IN SELECT DISTINCT u,a FROM (SELECT OLD.user_id u,upper(trim(OLD.asin)) a,OLD.country c WHERE TG_OP<>'INSERT' UNION SELECT NEW.user_id,upper(trim(NEW.asin)),NEW.country WHERE TG_OP<>'DELETE') x WHERE c='KSA' AND a IS NOT NULL LOOP
  IF public.has_role(r.u,'admin') THEN
   UPDATE public.trendyol_products SET stock_sync_mapped=true WHERE user_id=r.u AND upper(trim(asin))=r.a AND NOT stock_sync_mapped;
   INSERT INTO public.trendyol_stock_queue(user_id,product_id) SELECT user_id,id FROM public.trendyol_products WHERE user_id=r.u AND upper(trim(asin))=r.a AND stock_sync_mapped
   ON CONFLICT(product_id) DO UPDATE SET version=trendyol_stock_queue.version+1,state=CASE WHEN trendyol_stock_queue.batch_id IS NOT NULL THEN 'submitted' ELSE 'pending' END,next_attempt_at=now(),last_error=NULL;
   GET DIAGNOSTICS affected=ROW_COUNT; n:=n+affected;
  END IF;
 END LOOP;
 IF n>0 THEN PERFORM public.wake_trendyol_stock(); END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER enqueue_trendyol_inventory_stock AFTER INSERT OR UPDATE OR DELETE ON public.asin_inventory FOR EACH ROW EXECUTE FUNCTION public.enqueue_trendyol_inventory_stock();
REVOKE ALL ON FUNCTION public.wake_trendyol_stock(),public.wake_trendyol_stock_if_pending(),public.claim_trendyol_stock_worker(uuid),public.release_trendyol_stock_worker(uuid),public.queue_trendyol_stock(uuid,uuid[]),public.enqueue_trendyol_inventory_stock() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wake_trendyol_stock(),public.wake_trendyol_stock_if_pending(),public.claim_trendyol_stock_worker(uuid),public.release_trendyol_stock_worker(uuid),public.queue_trendyol_stock(uuid,uuid[]) TO service_role;