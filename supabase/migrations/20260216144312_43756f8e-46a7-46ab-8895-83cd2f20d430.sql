
-- Drop the incorrect trigger and recreate properly
DROP TRIGGER IF EXISTS trg_auto_add_po_to_group ON public.po_orders;
DROP FUNCTION IF EXISTS public.auto_add_po_to_group();

-- Create as BEFORE INSERT trigger so we can modify NEW.priority
CREATE OR REPLACE FUNCTION public.auto_add_po_to_group()
RETURNS TRIGGER AS $$
DECLARE
  existing_group_id UUID;
  existing_priority INT;
BEGIN
  -- Check if any other PO item with the same po_number is already in a group
  SELECT pgm.group_id, pg.priority INTO existing_group_id, existing_priority
  FROM po_group_members pgm
  JOIN po_orders po ON po.id = pgm.po_id
  JOIN po_groups pg ON pg.id = pgm.group_id
  WHERE po.po_number = NEW.po_number
    AND po.user_id = NEW.user_id
  LIMIT 1;

  IF existing_group_id IS NOT NULL THEN
    -- Set the priority on the new item to match the group
    IF existing_priority IS NOT NULL THEN
      NEW.priority := existing_priority;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- BEFORE INSERT to set priority
CREATE TRIGGER trg_auto_add_po_to_group_before
BEFORE INSERT ON public.po_orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_po_to_group();

-- AFTER INSERT function to add to po_group_members (can't do INSERT in BEFORE trigger on same transaction reliably)
CREATE OR REPLACE FUNCTION public.auto_add_po_to_group_after()
RETURNS TRIGGER AS $$
DECLARE
  existing_group_id UUID;
BEGIN
  SELECT pgm.group_id INTO existing_group_id
  FROM po_group_members pgm
  JOIN po_orders po ON po.id = pgm.po_id
  WHERE po.po_number = NEW.po_number
    AND po.user_id = NEW.user_id
    AND pgm.po_id != NEW.id
  LIMIT 1;

  IF existing_group_id IS NOT NULL THEN
    INSERT INTO po_group_members (group_id, po_id)
    VALUES (existing_group_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_auto_add_po_to_group_after
AFTER INSERT ON public.po_orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_po_to_group_after();
