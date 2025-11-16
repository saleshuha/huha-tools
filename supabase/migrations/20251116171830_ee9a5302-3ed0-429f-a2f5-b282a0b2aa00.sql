-- Update inventory label templates to use 'Serial Number' instead of 'Serial'
UPDATE label_templates
SET 
  canvas_data = jsonb_set(
    canvas_data,
    '{elements}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN elem->>'dataColumn' = 'Serial' 
          THEN elem || jsonb_build_object('dataColumn', 'Serial Number')
          ELSE elem
        END
      )
      FROM jsonb_array_elements(canvas_data->'elements') elem
    )
  ),
  updated_at = now()
WHERE name ILIKE '%inventory%'
  AND canvas_data->'elements' IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(canvas_data->'elements') elem 
    WHERE elem->>'dataColumn' = 'Serial'
  );