-- Update inventory template elements with dataColumn='Serial' to 'Serial Number'
UPDATE label_templates
SET canvas_data = jsonb_set(
  canvas_data,
  '{elements}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'dataColumn' = 'Serial'
        THEN jsonb_set(elem, '{dataColumn}', '"Serial Number"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(canvas_data->'elements') AS elem
  )
)
WHERE name ILIKE '%inventory%'
  AND canvas_data->'elements' IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(canvas_data->'elements') AS elem
    WHERE elem->>'dataColumn' = 'Serial'
  );