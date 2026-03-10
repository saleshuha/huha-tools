export interface PurchaseLink {
  id: string;
  link_token: string;
  user_id: string;
  po_numbers: string[];
  title?: string;
  description?: string;
  expires_at?: string;
  is_active: boolean;
  access_count: number;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PurchaseUpdate {
  id: string;
  link_id: string;
  po_number: string;
  po_order_id?: string;
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  purchased_quantity: number;
  supplier_name?: string;
  supplier_order_number?: string;
  estimated_delivery?: string;
  unit_cost?: number;
  total_cost?: number;
  updated_by_name?: string;
  updated_by_email?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PurchaseLinkData {
  link: PurchaseLink;
  poOrders: any[];
  updates: PurchaseUpdate[];
  suppliers?: { id: string; supplier_name: string }[];
}

export interface GenerateLinkRequest {
  poNumbers: string[];
  poOrderIds?: string[];
  title?: string;
  description?: string;
  expiresInDays?: number;
  userId: string;
}

export interface SavePurchaseUpdateRequest {
  poOrderId: string;
  poNumber: string;
  asin?: string;
  skuCode?: string;
  modelNumber?: string;
  title?: string;
  purchasedQuantity: number;
  supplierName?: string;
  supplierOrderNumber?: string;
  estimatedDelivery?: string;
  unitCost?: number;
  totalCost?: number;
  updatedByName?: string;
  updatedByEmail?: string;
  notes?: string;
}
