-- Create PO groups table for grouping multiple POs
CREATE TABLE IF NOT EXISTS po_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  country TEXT DEFAULT 'UAE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create join table for PO group membership
CREATE TABLE IF NOT EXISTS po_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES po_groups(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES po_orders(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, po_id)
);

-- Add RLS policies
ALTER TABLE po_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own PO groups"
ON po_groups FOR ALL TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own PO group members"
ON po_group_members FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM po_groups pg
    WHERE pg.id = group_id AND pg.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_po_groups_user_status ON po_groups(user_id, status);
CREATE INDEX IF NOT EXISTS idx_po_group_members_group ON po_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_po_group_members_po ON po_group_members(po_id);

-- Add label printed tracking column to po_orders
ALTER TABLE po_orders 
ADD COLUMN IF NOT EXISTS label_printed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN po_orders.label_printed_at IS 
'Timestamp when label was last printed during stock receiving';