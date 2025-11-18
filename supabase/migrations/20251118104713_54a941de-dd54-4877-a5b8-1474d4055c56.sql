-- Add statistical confidence and priority scoring columns to amazon_returns_data
ALTER TABLE public.amazon_returns_data
ADD COLUMN confidence_score NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN shipped_units >= 50 THEN 100
    WHEN shipped_units > 0 THEN LEAST(100, (shipped_units::NUMERIC / 50) * 100)
    ELSE 0
  END
) STORED,
ADD COLUMN priority_score NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN shipped_units > 0 THEN 
      ((returned_units::NUMERIC / shipped_units::NUMERIC * 100) * 0.6) + 
      (LEAST(100, (shipped_units::NUMERIC / 50) * 100) * 0.4)
    ELSE 0
  END
) STORED,
ADD COLUMN impact_score INTEGER GENERATED ALWAYS AS (
  returned_units
) STORED;

-- Add indexes for new columns to optimize queries
CREATE INDEX idx_amazon_returns_confidence ON public.amazon_returns_data(confidence_score);
CREATE INDEX idx_amazon_returns_priority ON public.amazon_returns_data(priority_score DESC);
CREATE INDEX idx_amazon_returns_impact ON public.amazon_returns_data(impact_score DESC);

-- Add composite index for common query patterns
CREATE INDEX idx_amazon_returns_priority_confidence ON public.amazon_returns_data(priority_score DESC, confidence_score DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.amazon_returns_data.confidence_score IS 'Statistical confidence based on sample size (0-100). Higher values indicate more reliable return ratio data.';
COMMENT ON COLUMN public.amazon_returns_data.priority_score IS 'Composite score combining return ratio (60%) and statistical confidence (40%) for better prioritization.';
COMMENT ON COLUMN public.amazon_returns_data.impact_score IS 'Total units returned - measures absolute impact regardless of percentage.';