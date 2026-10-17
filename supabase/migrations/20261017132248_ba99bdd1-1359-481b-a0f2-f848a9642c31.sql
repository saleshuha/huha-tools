CREATE TABLE public.trendyol_fulfilled_lines(user_id uuid NOT NULL,line_id text NOT NULL,package_id uuid NOT NULL REFERENCES public.trendyol_packages(id),quantity integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,line_id));
GRANT ALL ON public.trendyol_fulfilled_lines TO service_role;
ALTER TABLE public.trendyol_fulfilled_lines ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.guard_trendyol_fulfilled_lines() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE line jsonb; qty text; lid text;
BEGIN
 IF OLD.fulfilled_at IS NULL AND NEW.fulfilled_at IS NOT NULL THEN
  FOR line IN SELECT value FROM jsonb_array_elements(NEW.lines) LOOP
   lid := line->>'id'; qty := line->>'quantity';
   IF lid IS NULL OR lid='' OR qty IS NULL OR qty !~ '^[0-9]+$' OR qty::integer<=0 THEN RAISE EXCEPTION 'Invalid Trendyol order line'; END IF;
   INSERT INTO public.trendyol_fulfilled_lines(user_id,line_id,package_id,quantity) VALUES(NEW.user_id,lid,NEW.id,qty::integer);
  END LOOP;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_trendyol_fulfilled_lines() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_trendyol_line_replay BEFORE UPDATE OF fulfilled_at ON public.trendyol_packages FOR EACH ROW EXECUTE FUNCTION public.guard_trendyol_fulfilled_lines();