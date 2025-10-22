-- Create suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Basic Information
  supplier_name TEXT NOT NULL,
  company_name TEXT,
  country TEXT NOT NULL,
  
  -- Contact Information
  contact_person TEXT,
  email TEXT,
  phone_number TEXT,
  whatsapp_number TEXT,
  wechat_id TEXT,
  
  -- Online Presence
  website_url TEXT,
  profile_link TEXT,
  
  -- Business Details
  business_type TEXT,
  product_categories JSONB DEFAULT '[]'::jsonb,
  payment_terms TEXT,
  minimum_order_quantity INTEGER,
  lead_time_days INTEGER,
  
  -- Performance Metrics
  rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
  total_orders INTEGER DEFAULT 0,
  average_delivery_days INTEGER,
  
  -- Additional Info
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suppliers"
  ON suppliers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
  ON suppliers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
  ON suppliers FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for suppliers
CREATE INDEX idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX idx_suppliers_country ON suppliers(country);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_supplier_name ON suppliers(supplier_name);

-- Create trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create supplier_contacts table
CREATE TABLE supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  contact_name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone_number TEXT,
  whatsapp_number TEXT,
  wechat_id TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for supplier_contacts
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their supplier contacts"
  ON supplier_contacts FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for supplier_contacts
CREATE INDEX idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);
CREATE INDEX idx_supplier_contacts_user_id ON supplier_contacts(user_id);

-- Create trigger for supplier_contacts updated_at
CREATE TRIGGER update_supplier_contacts_updated_at
  BEFORE UPDATE ON supplier_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();