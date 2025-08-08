// Complete header mapping for Noon Fees Reports
// This ensures all columns from the CSV are properly mapped to database fields

export const NOON_FEES_HEADERS = [
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
] as const;

export type NoonFeesHeader = typeof NOON_FEES_HEADERS[number];

// Database column mapping - maps CSV headers to database column names
export const NOON_FEES_COLUMN_MAPPING: Record<string, string> = {
  'id_partner': 'id_partner',
  'marketplace': 'marketplace',
  'order_nr': 'order_nr',
  'item_nr': 'item_nr',
  'partner_sales_nr': 'partner_sales_nr',
  'awb_nr': 'awb_nr',
  'sku': 'sku',
  'partner_sku': 'partner_sku',
  'fulfillment_mode': 'fulfillment_mode',
  'family': 'family',
  'product_type': 'product_type',
  'brand': 'brand',
  'product_title': 'product_title',
  'item_status': 'item_status',
  'country_code': 'country_code',
  'last_statement_date': 'last_statement_date',
  'ordered_date': 'ordered_date',
  'shipped_date': 'shipped_date',
  'delivered_date': 'delivered_date',
  'returned_date': 'returned_date',
  'currency_code': 'currency_code',
  'seller_price': 'seller_price',
  'seller_promo': 'seller_promo',
  'base_price': 'base_price',
  'promo_deal': 'promo_deal',
  'noon_markup': 'noon_markup',
  'offer_price': 'offer_price',
  'promo_coupon': 'promo_coupon',
  'invoice_price': 'invoice_price',
  'fee_noon_promo': 'fee_noon_promo',
  'fee_noon_markup': 'fee_noon_markup',
  'fee_referral': 'fee_referral',
  'fee_noon_rocket_referral': 'fee_noon_rocket_referral',
  'fee_outbound_fbn': 'fee_outbound_fbn',
  'fee_weight_handling': 'fee_weight_handling',
  'fee_crossdock': 'fee_crossdock',
  'fee_directship_outbound': 'fee_directship_outbound',
  'fee_shipping': 'fee_shipping',
  'fee_damaged_return': 'fee_damaged_return',
  'fee_noon_penalty': 'fee_noon_penalty',
  'fee_item_cancellation': 'fee_item_cancellation',
  'fee_warranty_penalty': 'fee_warranty_penalty',
  'fee_retention_penalty': 'fee_retention_penalty',
  'fee_alternate_seller_fulfillment': 'fee_alternate_seller_fulfillment',
  'fee_miscellaneous': 'fee_miscellaneous',
  'fee_direct_collection': 'fee_direct_collection',
  'fee_reinvoicing': 'fee_reinvoicing',
  'total_payment': 'total_payment',
  'statement_nr': 'statement_nr',
  'invoice_nr': 'invoice_nr',
  'creditnote_nr': 'creditnote_nr'
};

// Data type specifications for proper parsing
export const NOON_FEES_DATA_TYPES: Record<string, 'text' | 'numeric' | 'date' | 'timestamp'> = {
  'id_partner': 'text',
  'marketplace': 'text',
  'order_nr': 'text',
  'item_nr': 'text',
  'partner_sales_nr': 'text',
  'awb_nr': 'text',
  'sku': 'text',
  'partner_sku': 'text',
  'fulfillment_mode': 'text',
  'family': 'text',
  'product_type': 'text',
  'brand': 'text',
  'product_title': 'text',
  'item_status': 'text',
  'country_code': 'text',
  'last_statement_date': 'timestamp',
  'ordered_date': 'timestamp',
  'shipped_date': 'timestamp',
  'delivered_date': 'timestamp',
  'returned_date': 'timestamp',
  'currency_code': 'text',
  'seller_price': 'numeric',
  'seller_promo': 'numeric',
  'base_price': 'numeric',
  'promo_deal': 'numeric',
  'noon_markup': 'numeric',
  'offer_price': 'numeric',
  'promo_coupon': 'numeric',
  'invoice_price': 'numeric',
  'fee_noon_promo': 'numeric',
  'fee_noon_markup': 'numeric',
  'fee_referral': 'numeric',
  'fee_noon_rocket_referral': 'numeric',
  'fee_outbound_fbn': 'numeric',
  'fee_weight_handling': 'numeric',
  'fee_crossdock': 'numeric',
  'fee_directship_outbound': 'numeric',
  'fee_shipping': 'numeric',
  'fee_damaged_return': 'numeric',
  'fee_noon_penalty': 'numeric',
  'fee_item_cancellation': 'numeric',
  'fee_warranty_penalty': 'numeric',
  'fee_retention_penalty': 'numeric',
  'fee_alternate_seller_fulfillment': 'numeric',
  'fee_miscellaneous': 'numeric',
  'fee_direct_collection': 'numeric',
  'fee_reinvoicing': 'numeric',
  'total_payment': 'numeric',
  'statement_nr': 'text',
  'invoice_nr': 'text',
  'creditnote_nr': 'text'
};

// Utility function to validate CSV headers against expected headers
export const validateNoonFeesHeaders = (csvHeaders: string[]): {
  isValid: boolean;
  missingHeaders: string[];
  extraHeaders: string[];
} => {
  const normalizedCsvHeaders = csvHeaders.map(h => h.trim().toLowerCase());
  const normalizedExpectedHeaders = NOON_FEES_HEADERS.map(h => h.toLowerCase());
  
  const missingHeaders = normalizedExpectedHeaders.filter(
    header => !normalizedCsvHeaders.includes(header)
  );
  
  const extraHeaders = normalizedCsvHeaders.filter(
    header => !normalizedExpectedHeaders.includes(header)
  );
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders,
    extraHeaders
  };
};

// Utility function to parse CSV row data according to data types
export const parseNoonFeesRow = (row: Record<string, string>): Record<string, any> => {
  const parsedRow: Record<string, any> = {};
  
  for (const [header, value] of Object.entries(row)) {
    const normalizedHeader = header.trim().toLowerCase();
    const expectedHeader = NOON_FEES_HEADERS.find(h => h.toLowerCase() === normalizedHeader);
    
    if (!expectedHeader) continue;
    
    const dataType = NOON_FEES_DATA_TYPES[expectedHeader];
    const trimmedValue = value?.toString().trim();
    
    if (!trimmedValue || trimmedValue === '') {
      parsedRow[expectedHeader] = null;
      continue;
    }
    
    switch (dataType) {
      case 'numeric':
        const numericValue = parseFloat(trimmedValue.replace(/[,$]/g, ''));
        parsedRow[expectedHeader] = isNaN(numericValue) ? null : numericValue;
        break;
      case 'timestamp':
      case 'date':
        try {
          const dateValue = new Date(trimmedValue);
          parsedRow[expectedHeader] = isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
        } catch {
          parsedRow[expectedHeader] = null;
        }
        break;
      case 'text':
      default:
        parsedRow[expectedHeader] = trimmedValue;
        break;
    }
  }
  
  return parsedRow;
};

// Required fields that must have values
export const NOON_FEES_REQUIRED_FIELDS = [
  'order_nr',
  'country_code'
] as const;

// Utility to validate required fields are present
export const validateRequiredFields = (row: Record<string, any>): {
  isValid: boolean;
  missingFields: string[];
} => {
  const missingFields = NOON_FEES_REQUIRED_FIELDS.filter(
    field => !row[field] || row[field] === ''
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};