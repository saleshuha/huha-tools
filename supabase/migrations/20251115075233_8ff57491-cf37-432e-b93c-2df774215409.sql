-- Add priority column to po_groups table
ALTER TABLE public.po_groups 
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 3;

-- Add comment to explain the priority field
COMMENT ON COLUMN public.po_groups.priority IS 'Priority level for the group (1=highest, 2=high, 3=normal, 4=low)';