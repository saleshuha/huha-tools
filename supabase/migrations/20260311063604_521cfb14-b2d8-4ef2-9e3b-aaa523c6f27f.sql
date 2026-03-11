
CREATE TABLE public.po_selection_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  po_numbers TEXT[] NOT NULL DEFAULT '{}',
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.po_selection_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presets"
  ON public.po_selection_presets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
