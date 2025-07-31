export interface CarrefourPayment {
  id: string;
  user_id: string;
  order_number: string;
  sku_number: string;
  sale_value: number;
  seller_fees: number;
  pending_amount: number;
  cost: number;
  profit: number;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCarrefourPayment {
  order_number: string;
  sku_number: string;
  sale_value: number;
  seller_fees: number;
  pending_amount: number;
  cost: number;
  profit: number;
  country?: string;
}