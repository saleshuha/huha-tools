// Actual headers from Noon sales report
export interface NoonSalesHeaders {
  contract: string;
  business_unit: string;
  document_type: string; // "Invoice" or "Creditnote"
  invoice_type_code: string;
  document_subtype: string;
  document_date: string;
  invoice_nr: string;
  invoice_line_nr: string;
  credit_note_nr: string;
  credit_note_line_nr: string;
  transaction_type: string;
  source_doc_type: string;
  source_doc_nr: string;
  source_doc_line_type: string;
  source_doc_line_nr: string;
  description: string;
  sku: string;
  issuer_city: string;
  issuer_country: string;
  issuer_location: string;
  receiver_city: string;
  receiver_country: string;
  receiver_location: string;
  issuer_legal_entity: string;
  issuer_legal_name: string;
  issuer_trn: string;
  receiver_legal_entity: string;
  receiver_legal_name: string;
  receiver_trn: string;
  document_currency: string;
  vat_currency: string;
  vat_rate: string;
  fx_rate: string;
  price_excluding_vat_doc_currency: string;
  price_excluding_vat_vat_currency: string;
  vat_amount_doc_currency: string;
  vat_amount_vat_currency: string;
  price_including_vat_doc_currency: string;
}

export interface NoonFileData {
  headers: string[];
  data: string[][];
  fileName: string;
}

// Base interface for all Noon transactions
export interface NoonTransactionBase {
  id?: string;
  user_id: string;
  file_name: string;
  
  // Core transaction details
  contract?: string;
  business_unit?: string;
  document_type?: 'Invoice' | 'Creditnote';
  invoice_type_code?: string;
  document_subtype?: string;
  document_date?: string;
  
  // Invoice/Credit note numbers
  invoice_nr?: string;
  invoice_line_nr?: string;
  credit_note_nr?: string;
  credit_note_line_nr?: string;
  
  // Transaction context
  transaction_type?: string;
  source_doc_type?: string;
  source_doc_nr?: string;
  source_doc_line_type?: string;
  source_doc_line_nr?: string;
  
  // Product details
  description?: string;
  sku?: string;
  
  // Location details
  issuer_city?: string;
  issuer_country?: string;
  issuer_location?: string;
  receiver_city?: string;
  receiver_country?: string;
  receiver_location?: string;
  
  // Legal entities
  issuer_legal_entity?: string;
  issuer_legal_name?: string;
  issuer_trn?: string;
  receiver_legal_entity?: string;
  receiver_legal_name?: string;
  receiver_trn?: string;
  
  // Currency and rates
  document_currency?: string;
  vat_currency?: string;
  vat_rate?: number;
  fx_rate?: number;
  
  // Financial amounts (from file)
  price_excluding_vat_doc_currency?: number;
  price_excluding_vat_vat_currency?: number;
  vat_amount_doc_currency?: number;
  vat_amount_vat_currency?: number;
  price_including_vat_doc_currency?: number;
  
  // Metadata
  country?: string;
}

// Sales transaction (Invoice)
export interface NoonSalesTransaction extends NoonTransactionBase {
  document_type: 'Invoice';
  
  // Calculated fields for sales
  gross_sales_amount?: number;
  commission_rate?: number;
  commission_amount?: number;
  shipping_fee?: number;
  processing_fee?: number;
  other_fees?: number;
  net_amount_received?: number;
  
  // Related return information
  has_return?: boolean;
  return_transaction_id?: string;
}

// Return transaction (Credit note)
export interface NoonReturnTransaction extends NoonTransactionBase {
  document_type: 'Creditnote';
  
  // Return-specific fields
  return_reason?: string;
  return_charges?: number;
  restocking_fee?: number;
  shipping_return_fee?: number;
  refund_amount?: number;
  amount_deducted?: number;
  
  // Related sale information
  related_sale_id?: string;
  original_invoice_nr?: string;
}

// Union type for all transactions
export type NoonTransaction = NoonSalesTransaction | NoonReturnTransaction;

// Summary interfaces for analytics
export interface SalesSummary {
  total_gross_sales: number;
  total_commission: number;
  total_shipping_fees: number;
  total_other_fees: number;
  total_net_received: number;
  transaction_count: number;
}

export interface ReturnsSummary {
  total_returns: number;
  total_return_charges: number;
  total_refunded: number;
  total_deducted: number;
  return_count: number;
  return_rate: number; // percentage
}