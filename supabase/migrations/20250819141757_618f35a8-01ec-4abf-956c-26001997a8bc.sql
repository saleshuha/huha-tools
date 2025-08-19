-- Fix security linter issues
-- Issue 1: RLS Enabled No Policy - Add policies for sunsky_api_usage table
CREATE POLICY "Users can view their own API usage"
  ON public.sunsky_api_usage
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage API usage"
  ON public.sunsky_api_usage
  FOR ALL
  TO service_role
  USING (true);