export interface POGroup {
  id: string;
  user_id: string;
  group_name: string;
  description?: string;
  status: 'active' | 'archived';
  country: string;
  created_at: string;
  updated_at: string;
}

export interface POGroupMember {
  id: string;
  group_id: string;
  po_id: string;
  added_at: string;
}

export interface POGroupWithMembers extends POGroup {
  member_count: number;
  total_quantity: number;
  po_numbers: string[];
  po_ids: string[];
}

export interface EnhancedSearchResult {
  type: 'po' | 'inventory' | 'po_group';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  image_url?: string;
  context?: string;
  serial_number?: string;
  quantity?: number;
  
  // For PO results
  po_count?: number;
  po_numbers?: string[];
  priority?: number;
  
  // For grouped PO results
  po_group?: {
    id: string;
    name: string;
    total_quantity: number;
    po_ids: string[];
    po_numbers: string[];
  };
  
  // For inventory results
  status?: string;
  country?: string;
}
