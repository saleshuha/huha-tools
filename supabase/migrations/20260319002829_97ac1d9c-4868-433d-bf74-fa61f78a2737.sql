
-- Create enum for audit session status
CREATE TYPE public.audit_session_status AS ENUM ('in_progress', 'completed', 'cancelled');

-- Create enum for scan match status  
CREATE TYPE public.audit_scan_match_status AS ENUM ('matched', 'unmatched', 'duplicate');

-- Create stock_audit_sessions table
CREATE TABLE public.stock_audit_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  country TEXT NOT NULL DEFAULT 'UAE',
  name TEXT NOT NULL,
  status audit_session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_system_items INT NOT NULL DEFAULT 0,
  total_scanned INT NOT NULL DEFAULT 0,
  total_missing INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create stock_audit_scans table
CREATE TABLE public.stock_audit_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.stock_audit_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.asin_inventory(id) ON DELETE SET NULL,
  scanned_barcode TEXT NOT NULL,
  matched_serial_number TEXT,
  matched_asin TEXT,
  scanned_quantity INT NOT NULL DEFAULT 1,
  match_status audit_scan_match_status NOT NULL DEFAULT 'unmatched',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audit_scans ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_audit_sessions
CREATE POLICY "Users can view their own audit sessions"
  ON public.stock_audit_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audit sessions"
  ON public.stock_audit_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audit sessions"
  ON public.stock_audit_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audit sessions"
  ON public.stock_audit_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for stock_audit_scans
CREATE POLICY "Users can view their own audit scans"
  ON public.stock_audit_scans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audit scans"
  ON public.stock_audit_scans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audit scans"
  ON public.stock_audit_scans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast scan lookups by session
CREATE INDEX idx_stock_audit_scans_session ON public.stock_audit_scans(session_id);
CREATE INDEX idx_stock_audit_scans_barcode ON public.stock_audit_scans(scanned_barcode);
CREATE INDEX idx_stock_audit_scans_inventory ON public.stock_audit_scans(inventory_item_id);
