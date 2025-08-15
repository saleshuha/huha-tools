export interface Order {
  id: string;
  order_id: string;
  invoice_id?: string;
  shipment_date?: string;
  invoice_date?: string;
  vat_id?: string;
  asin?: string;
  sku?: string;
  item_title?: string;
  quantity: number;
  item_cost: number;
  tax_rate: number;
  warehouse_code?: string;
  status: string;
  currency: string;
  country: 'UAE' | 'KSA';
  user_id: string;
  payment_due_date?: string;
  payment_schedule_days: number;
  payment_status: string;
  payment_reminder_date?: string;
  payment_completed_date?: string;
  payment_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrder {
  order_id: string;
  invoice_id?: string;
  shipment_date?: string;
  invoice_date?: string;
  vat_id?: string;
  asin?: string;
  sku?: string;
  item_title?: string;
  quantity?: number;
  item_cost?: number;
  tax_rate?: number;
  warehouse_code?: string;
  status?: string;
  currency?: string;
  country?: string;
  payment_schedule_days?: number;
  payment_status?: string;
  payment_notes?: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export interface PaymentTerms {
  id: string;
  country: string;
  credit_days: number;
  vat_rate: number;
  currency: string;
  flag: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalOrders: number;
  totalValue: number;
  pendingPayments: number;
  overduePayments: number;
  completedPayments: number;
  statusBreakdown: {
    [key: string]: number;
  };
  paymentStatusBreakdown: {
    [key: string]: number;
  };
  upcomingPayments: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
}