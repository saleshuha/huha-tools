
-- Create a trigger function that auto-adds new po_orders to their group if the po_number is already grouped
CREATE OR REPLACE FUNCTION public.auto_add_po_to_group()
RETURNS TRIGGER AS $$
DECLARE
  existing_group_id UUID;
  existing_priority INT;
BEGIN
  -- Check if any other PO item with the same po_number is already in a group
  SELECT pgm.group_id INTO existing_group_id
  FROM po_group_members pgm
  JOIN po_orders po ON po.id = pgm.po_id
  WHERE po.po_number = NEW.po_number
    AND po.user_id = NEW.user_id
  LIMIT 1;

  IF existing_group_id IS NOT NULL THEN
    -- Add the new PO item to the same group (ignore if already exists)
    INSERT INTO po_group_members (group_id, po_id)
    VALUES (existing_group_id, NEW.id)
    ON CONFLICT DO NOTHING;

    -- Get the group's priority and apply it to the new item
    SELECT priority INTO existing_priority
    FROM po_groups
    WHERE id = existing_group_id;

    IF existing_priority IS NOT NULL THEN
      NEW.priority := existing_priority;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger on po_orders
CREATE TRIGGER trg_auto_add_po_to_group
AFTER INSERT ON public.po_orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_po_to_group();
