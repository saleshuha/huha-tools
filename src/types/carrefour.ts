export interface CarrefourSalesOrder {
  id: string;
  user_id: string;
  order_number: string;
  sale_value: number;
  seller_fees: number;
  payment_status: 'Pending' | 'Received';
  cost: number;
  profit: number;
  status: 'Delivered' | 'Returned' | 'Cancelled' | 'Other';
  country: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCarrefourSalesOrder {
  order_number: string;
  sale_value: number;
  seller_fees: number;
  payment_status: 'Pending' | 'Received';
  cost: number;
  profit: number;
  status: 'Delivered' | 'Returned' | 'Cancelled' | 'Other';
  country?: string;
}