export interface Supplier {
  id: string;
  user_id: string;
  supplier_name: string;
  company_name?: string;
  country: string;
  contact_person?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  wechat_id?: string;
  website_url?: string;
  profile_link?: string;
  business_type?: string;
  product_categories?: string[];
  payment_terms?: string;
  minimum_order_quantity?: number;
  lead_time_days?: number;
  rating?: number;
  total_orders?: number;
  average_delivery_days?: number;
  notes?: string;
  tags?: string[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierContact {
  id: string;
  supplier_id: string;
  user_id: string;
  contact_name: string;
  position?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  wechat_id?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplier {
  supplier_name: string;
  company_name?: string;
  country: string;
  contact_person?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  wechat_id?: string;
  website_url?: string;
  profile_link?: string;
  business_type?: string;
  product_categories?: string[];
  payment_terms?: string;
  minimum_order_quantity?: number;
  lead_time_days?: number;
  rating?: number;
  notes?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface CreateSupplierContact {
  supplier_id: string;
  contact_name: string;
  position?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  wechat_id?: string;
  is_primary?: boolean;
  notes?: string;
}
