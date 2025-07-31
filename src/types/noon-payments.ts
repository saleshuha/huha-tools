export interface NoonPaymentHeaders {
  contract: string;
  business_unit: string;
  document_type: string;
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
  fileType: 'invoice' | 'credit';
}

export interface NoonInvoiceData {
  id?: string;
  user_id: string;
  file_name: string;
  contract?: string;
  business_unit?: string;
  document_type?: string;
  invoice_type_code?: string;
  document_subtype?: string;
  document_date?: string;
  invoice_nr?: string;
  invoice_line_nr?: string;
  credit_note_nr?: string;
  credit_note_line_nr?: string;
  transaction_type?: string;
  source_doc_type?: string;
  source_doc_nr?: string;
  source_doc_line_type?: string;
  source_doc_line_nr?: string;
  description?: string;
  sku?: string;
  issuer_city?: string;
  issuer_country?: string;
  issuer_location?: string;
  receiver_city?: string;
  receiver_country?: string;
  receiver_location?: string;
  issuer_legal_entity?: string;
  issuer_legal_name?: string;
  issuer_trn?: string;
  receiver_legal_entity?: string;
  receiver_legal_name?: string;
  receiver_trn?: string;
  document_currency?: string;
  vat_currency?: string;
  vat_rate?: number;
  fx_rate?: number;
  price_excluding_vat_doc_currency?: number;
  price_excluding_vat_vat_currency?: number;
  vat_amount_doc_currency?: number;
  vat_amount_vat_currency?: number;
  price_including_vat_doc_currency?: number;
  commission_amount?: number;
  shipping_amount?: number;
  net_amount_received?: number;
  country?: string;
}

export interface NoonCreditData extends Omit<NoonInvoiceData, 'commission_amount' | 'shipping_amount' | 'net_amount_received'> {
  return_charges?: number;
  refund_amount?: number;
}