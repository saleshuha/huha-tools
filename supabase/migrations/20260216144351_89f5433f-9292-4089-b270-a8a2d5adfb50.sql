
-- Fix existing data: add all ungrouped PO items to their respective groups
INSERT INTO po_group_members (group_id, po_id)
SELECT DISTINCT pgm.group_id, po2.id
FROM po_group_members pgm
JOIN po_orders po ON po.id = pgm.po_id
JOIN po_orders po2 ON po2.po_number = po.po_number AND po2.user_id = po.user_id
LEFT JOIN po_group_members pgm2 ON pgm2.po_id = po2.id
WHERE pgm2.id IS NULL
ON CONFLICT DO NOTHING;

-- Also update priorities for these items to match their group priority
UPDATE po_orders po
SET priority = pg.priority
FROM po_group_members pgm
JOIN po_groups pg ON pg.id = pgm.group_id
WHERE po.id = pgm.po_id
AND po.priority != pg.priority;
