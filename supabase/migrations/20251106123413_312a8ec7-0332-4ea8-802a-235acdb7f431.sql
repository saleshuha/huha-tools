-- Create purchase_links table for shareable PO links
CREATE TABLE purchase_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  po_numbers TEXT[] NOT NULL,
  title TEXT,
  description TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create purchase_updates table for tracking purchases
CREATE TABLE purchase_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES purchase_links(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  po_order_id UUID REFERENCES po_orders(id) ON DELETE CASCADE,
  asin TEXT,
  sku_code TEXT,
  model_number TEXT,
  title TEXT,
  purchased_quantity INTEGER DEFAULT 0,
  supplier_name TEXT,
  supplier_order_number TEXT,
  estimated_delivery DATE,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  updated_by_name TEXT,
  updated_by_email TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(link_id, po_order_id)
);

-- Enable RLS
ALTER TABLE purchase_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_updates ENABLE ROW LEVEL SECURITY;

-- Policies for purchase_links
CREATE POLICY "Users can create their own purchase links"
  ON purchase_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own purchase links"
  ON purchase_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase links"
  ON purchase_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase links"
  ON purchase_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active purchase links by token"
  ON purchase_links FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Policies for purchase_updates
CREATE POLICY "Anyone can insert purchase updates"
  ON purchase_updates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view purchase updates for active links"
  ON purchase_updates FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_links 
      WHERE purchase_links.id = purchase_updates.link_id 
      AND purchase_links.is_active = true
    )
  );

CREATE POLICY "Users can view all purchase updates for their links"
  ON purchase_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_links 
      WHERE purchase_links.id = purchase_updates.link_id 
      AND purchase_links.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can update purchase updates for active links"
  ON purchase_updates FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_links 
      WHERE purchase_links.id = purchase_updates.link_id 
      AND purchase_links.is_active = true
    )
  );

-- Indexes
CREATE INDEX idx_purchase_links_token ON purchase_links(link_token);
CREATE INDEX idx_purchase_links_user ON purchase_links(user_id);
CREATE INDEX idx_purchase_links_active ON purchase_links(is_active);
CREATE INDEX idx_purchase_updates_link ON purchase_updates(link_id);
CREATE INDEX idx_purchase_updates_po ON purchase_updates(po_number);
CREATE INDEX idx_purchase_updates_order ON purchase_updates(po_order_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_purchase_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_links_updated_at
  BEFORE UPDATE ON purchase_links
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_links_updated_at();

CREATE TRIGGER update_purchase_updates_updated_at
  BEFORE UPDATE ON purchase_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_links_updated_at();