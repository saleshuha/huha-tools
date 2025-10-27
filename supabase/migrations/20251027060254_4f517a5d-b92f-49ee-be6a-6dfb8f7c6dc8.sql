-- Create taxonomy_events table for tracking user interactions and navigation
CREATE TABLE IF NOT EXISTS public.taxonomy_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'tab_change', 'dialog_open', 'dialog_close', 'button_click', 'action_complete', 'action_start', 'action_error')),
  category TEXT NOT NULL CHECK (category IN ('Amazon', 'Noon', 'Inventory', 'Tools', 'Suppliers', 'Label Designer', 'Admin')),
  subcategory TEXT NOT NULL,
  page_route TEXT NOT NULL,
  page_title TEXT,
  tab_id TEXT,
  tab_title TEXT,
  component_name TEXT,
  action_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.taxonomy_events ENABLE ROW LEVEL SECURITY;

-- Create policies for taxonomy_events
CREATE POLICY "Users can view their own taxonomy events"
ON public.taxonomy_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own taxonomy events"
ON public.taxonomy_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_taxonomy_events_user_id ON public.taxonomy_events(user_id);
CREATE INDEX idx_taxonomy_events_session_id ON public.taxonomy_events(session_id);
CREATE INDEX idx_taxonomy_events_category ON public.taxonomy_events(category);
CREATE INDEX idx_taxonomy_events_event_type ON public.taxonomy_events(event_type);
CREATE INDEX idx_taxonomy_events_created_at ON public.taxonomy_events(created_at DESC);
CREATE INDEX idx_taxonomy_events_page_route ON public.taxonomy_events(page_route);

-- Create index on metadata for JSONB queries
CREATE INDEX idx_taxonomy_events_metadata ON public.taxonomy_events USING GIN(metadata);

-- Add comment to table
COMMENT ON TABLE public.taxonomy_events IS 'Tracks user interactions, navigation, and behavior across the application for analytics and debugging';