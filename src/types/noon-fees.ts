export interface NoonOrderFeesData {
  id_partner: string;
  marketplace: string;
  order_nr: string;
  item_nr: string;
  partner_sales_nr: string;
  awb_nr: string;
  sku: string;
  partner_sku: string;
  fulfillment_mode: string;
  family: string;
  product_type: string;
  brand: string;
  product_title: string;
  item_status: string;
  country_code: string;
  last_statement_date: string;
  ordered_date: string;
  shipped_date: string;
  delivered_date: string;
  returned_date: string;
  currency_code: string;
  seller_price: number;
  seller_promo: number;
  base_price: number;
  promo_deal: number;
  noon_markup: number;
  offer_price: number;
  promo_coupon: number;
  invoice_price: number;
  fee_noon_promo: number;
  fee_noon_markup: number;
  fee_referral: number;
  fee_noon_rocket_referral: number;
  fee_outbound_fbn: number;
  fee_weight_handling: number;
  fee_crossdock: number;
  fee_directship_outbound: number;
  fee_shipping: number;
  fee_damaged_return: number;
  fee_noon_penalty: number;
  fee_item_cancellation: number;
  fee_warranty_penalty: number;
  fee_retention_penalty: number;
  fee_alternate_seller_fulfillment: number;
  fee_miscellaneous: number;
  fee_direct_collection: number;
  fee_reinvoicing: number;
  total_payment: number;
  statement_nr: string;
  invoice_nr: string;
  creditnote_nr: string;
}

export interface NoonFeesSummary {
  totalOrders: number;
  totalRevenue: number;
  totalFees: number;
  netPayment: number;
  averageOrderValue: number;
  totalReturns: number;
  returnRate: number;
}

export interface NoonFeesAnalytics {
  topPerformingSKUs: Array<{
    sku: string;
    orders: number;
    revenue: number;
    fees: number;
    netPayment: number;
  }>;
  feeBreakdown: {
    referralFees: number;
    shippingFees: number;
    penaltyFees: number;
    fulfillmentFees: number;
    otherFees: number;
  };
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    fees: number;
    netPayment: number;
  }>;
}

export const NOON_FEES_EXPECTED_HEADERS = [
  'id_partner',
  'marketplace',
  'order_nr',
  'item_nr',
  'partner_sales_nr',
  'awb_nr',
  'sku',
  'partner_sku',
  'fulfillment_mode',
  'family',
  'product_type',
  'brand',
  'product_title',
  'item_status',
  'country_code',
  'last_statement_date',
  'ordered_date',
  'shipped_date',
  'delivered_date',
  'returned_date',
  'currency_code',
  'seller_price',
  'seller_promo',
  'base_price',
  'promo_deal',
  'noon_markup',
  'offer_price',
  'promo_coupon',
  'invoice_price',
  'fee_noon_promo',
  'fee_noon_markup',
  'fee_referral',
  'fee_noon_rocket_referral',
  'fee_outbound_fbn',
  'fee_weight_handling',
  'fee_crossdock',
  'fee_directship_outbound',
  'fee_shipping',
  'fee_damaged_return',
  'fee_noon_penalty',
  'fee_item_cancellation',
  'fee_warranty_penalty',
  'fee_retention_penalty',
  'fee_alternate_seller_fulfillment',
  'fee_miscellaneous',
  'fee_direct_collection',
  'fee_reinvoicing',
  'total_payment',
  'statement_nr',
  'invoice_nr',
  'creditnote_nr'
];