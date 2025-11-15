export type TaxonomyEventType = 
  | 'page_view'
  | 'tab_change'
  | 'dialog_open'
  | 'dialog_close'
  | 'button_click'
  | 'action_complete'
  | 'action_start'
  | 'action_error';

export type TaxonomyCategory = 
  | 'Amazon'
  | 'Noon'
  | 'Inventory'
  | 'Tools'
  | 'Suppliers'
  | 'Label Designer'
  | 'Admin'
  | 'Quran';

// Subcategory validation mapping
export const SUBCATEGORIES: Record<TaxonomyCategory, string[]> = {
  'Amazon': [
    'Order Processing',
    'PO Tracker',
    'PO Upload',
    'PO Labels',
    'PO Reports',
    'PO Analytics',
    'PO Purchase Links',
    'PO Details',
    'Fulfillment',
    'Image Upload',
    'Vendor Central',
    'Returns Analysis'
  ],
  'Noon': [
    'Order Processing',
    'Order Tracking',
    'Sales Tracker',
    'Dashboard',
    'Stores',
    'Analytics',
    'Tools',
    'Sales Data',
    'Fees Reports'
  ],
  'Inventory': [
    'Stock Management',
    'Replenishment',
    'Stock History',
    'Velocity Analytics'
  ],
  'Tools': [
    'File Processing',
    'Data Management',
    'Analysis',
    'Reports',
    'Utilities'
  ],
  'Suppliers': [
    'Sunsky',
    'Global Sources',
    'Carrefour',
    'Vendor Management'
  ],
  'Label Designer': [
    'Design',
    'Print',
    'Templates',
    'Setup'
  ],
  'Admin': [
    'Dashboard',
    'Users',
    'Settings',
    'Stores'
  ],
  'Quran': [
    'Main',
    'Documentation',
    'Reading',
    'Search'
  ]
};

export interface TaxonomyEvent {
  id?: string;
  user_id?: string;
  session_id: string;
  event_type: TaxonomyEventType;
  category: TaxonomyCategory;
  subcategory: string;
  page_route: string;
  page_title?: string;
  tab_id?: string;
  tab_title?: string;
  component_name?: string;
  action_name?: string;
  metadata?: Record<string, any>;
  duration_ms?: number;
  created_at?: string;
}

export interface PageViewEvent {
  category: TaxonomyCategory;
  subcategory: string;
  pageRoute: string;
  pageTitle: string;
  metadata?: Record<string, any>;
}

export interface TabChangeEvent {
  category: TaxonomyCategory;
  subcategory: string;
  fromTab: string;
  toTab: string;
  tabTitle: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface DialogEvent {
  action: 'open' | 'close';
  category: TaxonomyCategory;
  subcategory: string;
  dialogName: string;
  dialogType?: string;
  duration?: number;
  completed?: boolean;
  metadata?: Record<string, any>;
}

export interface ActionEvent {
  category: TaxonomyCategory;
  subcategory: string;
  actionName: string;
  actionType: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
}
