export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      asin_inventory: {
        Row: {
          asin: string
          country: string
          created_at: string
          date_added: string
          date_sold: string | null
          id: string
          last_restock_date: string | null
          notes: string | null
          quantity: number
          restock_date: string | null
          restock_quantity: number | null
          serial_number: string
          sku: string | null
          status: Database["public"]["Enums"]["inventory_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          asin: string
          country?: string
          created_at?: string
          date_added?: string
          date_sold?: string | null
          id?: string
          last_restock_date?: string | null
          notes?: string | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          serial_number: string
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string
          country?: string
          created_at?: string
          date_added?: string
          date_sold?: string | null
          id?: string
          last_restock_date?: string | null
          notes?: string | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          serial_number?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      carrefour_payments: {
        Row: {
          cost: number
          country: string
          created_at: string
          id: string
          order_number: string
          payment_status: string
          profit: number
          sale_value: number
          seller_fees: number
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost: number
          country?: string
          created_at?: string
          id?: string
          order_number: string
          payment_status?: string
          profit: number
          sale_value: number
          seller_fees: number
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number
          country?: string
          created_at?: string
          id?: string
          order_number?: string
          payment_status?: string
          profit?: number
          sale_value?: number
          seller_fees?: number
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrefour_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          from_currency: string
          id: string
          rate: number
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          from_currency: string
          id?: string
          rate: number
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      noon_credit_data: {
        Row: {
          business_unit: string | null
          contract: string | null
          country: string
          created_at: string
          credit_note_line_nr: string | null
          credit_note_nr: string | null
          description: string | null
          document_currency: string | null
          document_date: string | null
          document_subtype: string | null
          document_type: string | null
          file_name: string
          fx_rate: number | null
          id: string
          invoice_line_nr: string | null
          invoice_nr: string | null
          invoice_type_code: string | null
          issuer_city: string | null
          issuer_country: string | null
          issuer_legal_entity: string | null
          issuer_legal_name: string | null
          issuer_location: string | null
          issuer_trn: string | null
          price_excluding_vat_doc_currency: number | null
          price_excluding_vat_vat_currency: number | null
          price_including_vat_doc_currency: number | null
          receiver_city: string | null
          receiver_country: string | null
          receiver_legal_entity: string | null
          receiver_legal_name: string | null
          receiver_location: string | null
          receiver_trn: string | null
          refund_amount: number | null
          return_charges: number | null
          sku: string | null
          source_doc_line_nr: string | null
          source_doc_line_type: string | null
          source_doc_nr: string | null
          source_doc_type: string | null
          transaction_type: string | null
          updated_at: string
          upload_date: string
          user_id: string
          vat_amount_doc_currency: number | null
          vat_amount_vat_currency: number | null
          vat_currency: string | null
          vat_rate: number | null
        }
        Insert: {
          business_unit?: string | null
          contract?: string | null
          country?: string
          created_at?: string
          credit_note_line_nr?: string | null
          credit_note_nr?: string | null
          description?: string | null
          document_currency?: string | null
          document_date?: string | null
          document_subtype?: string | null
          document_type?: string | null
          file_name: string
          fx_rate?: number | null
          id?: string
          invoice_line_nr?: string | null
          invoice_nr?: string | null
          invoice_type_code?: string | null
          issuer_city?: string | null
          issuer_country?: string | null
          issuer_legal_entity?: string | null
          issuer_legal_name?: string | null
          issuer_location?: string | null
          issuer_trn?: string | null
          price_excluding_vat_doc_currency?: number | null
          price_excluding_vat_vat_currency?: number | null
          price_including_vat_doc_currency?: number | null
          receiver_city?: string | null
          receiver_country?: string | null
          receiver_legal_entity?: string | null
          receiver_legal_name?: string | null
          receiver_location?: string | null
          receiver_trn?: string | null
          refund_amount?: number | null
          return_charges?: number | null
          sku?: string | null
          source_doc_line_nr?: string | null
          source_doc_line_type?: string | null
          source_doc_nr?: string | null
          source_doc_type?: string | null
          transaction_type?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
          vat_amount_doc_currency?: number | null
          vat_amount_vat_currency?: number | null
          vat_currency?: string | null
          vat_rate?: number | null
        }
        Update: {
          business_unit?: string | null
          contract?: string | null
          country?: string
          created_at?: string
          credit_note_line_nr?: string | null
          credit_note_nr?: string | null
          description?: string | null
          document_currency?: string | null
          document_date?: string | null
          document_subtype?: string | null
          document_type?: string | null
          file_name?: string
          fx_rate?: number | null
          id?: string
          invoice_line_nr?: string | null
          invoice_nr?: string | null
          invoice_type_code?: string | null
          issuer_city?: string | null
          issuer_country?: string | null
          issuer_legal_entity?: string | null
          issuer_legal_name?: string | null
          issuer_location?: string | null
          issuer_trn?: string | null
          price_excluding_vat_doc_currency?: number | null
          price_excluding_vat_vat_currency?: number | null
          price_including_vat_doc_currency?: number | null
          receiver_city?: string | null
          receiver_country?: string | null
          receiver_legal_entity?: string | null
          receiver_legal_name?: string | null
          receiver_location?: string | null
          receiver_trn?: string | null
          refund_amount?: number | null
          return_charges?: number | null
          sku?: string | null
          source_doc_line_nr?: string | null
          source_doc_line_type?: string | null
          source_doc_nr?: string | null
          source_doc_type?: string | null
          transaction_type?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
          vat_amount_doc_currency?: number | null
          vat_amount_vat_currency?: number | null
          vat_currency?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      noon_file_headers: {
        Row: {
          created_at: string
          file_type: string
          headers: string[]
          id: string
          store_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_type: string
          headers: string[]
          id?: string
          store_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_type?: string
          headers?: string[]
          id?: string
          store_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      noon_invoice_data: {
        Row: {
          business_unit: string | null
          commission_amount: number | null
          contract: string | null
          country: string
          created_at: string
          credit_note_line_nr: string | null
          credit_note_nr: string | null
          description: string | null
          document_currency: string | null
          document_date: string | null
          document_subtype: string | null
          document_type: string | null
          file_name: string
          fx_rate: number | null
          id: string
          invoice_line_nr: string | null
          invoice_nr: string | null
          invoice_type_code: string | null
          issuer_city: string | null
          issuer_country: string | null
          issuer_legal_entity: string | null
          issuer_legal_name: string | null
          issuer_location: string | null
          issuer_trn: string | null
          net_amount_received: number | null
          price_excluding_vat_doc_currency: number | null
          price_excluding_vat_vat_currency: number | null
          price_including_vat_doc_currency: number | null
          receiver_city: string | null
          receiver_country: string | null
          receiver_legal_entity: string | null
          receiver_legal_name: string | null
          receiver_location: string | null
          receiver_trn: string | null
          shipping_amount: number | null
          sku: string | null
          source_doc_line_nr: string | null
          source_doc_line_type: string | null
          source_doc_nr: string | null
          source_doc_type: string | null
          transaction_type: string | null
          updated_at: string
          upload_date: string
          user_id: string
          vat_amount_doc_currency: number | null
          vat_amount_vat_currency: number | null
          vat_currency: string | null
          vat_rate: number | null
        }
        Insert: {
          business_unit?: string | null
          commission_amount?: number | null
          contract?: string | null
          country?: string
          created_at?: string
          credit_note_line_nr?: string | null
          credit_note_nr?: string | null
          description?: string | null
          document_currency?: string | null
          document_date?: string | null
          document_subtype?: string | null
          document_type?: string | null
          file_name: string
          fx_rate?: number | null
          id?: string
          invoice_line_nr?: string | null
          invoice_nr?: string | null
          invoice_type_code?: string | null
          issuer_city?: string | null
          issuer_country?: string | null
          issuer_legal_entity?: string | null
          issuer_legal_name?: string | null
          issuer_location?: string | null
          issuer_trn?: string | null
          net_amount_received?: number | null
          price_excluding_vat_doc_currency?: number | null
          price_excluding_vat_vat_currency?: number | null
          price_including_vat_doc_currency?: number | null
          receiver_city?: string | null
          receiver_country?: string | null
          receiver_legal_entity?: string | null
          receiver_legal_name?: string | null
          receiver_location?: string | null
          receiver_trn?: string | null
          shipping_amount?: number | null
          sku?: string | null
          source_doc_line_nr?: string | null
          source_doc_line_type?: string | null
          source_doc_nr?: string | null
          source_doc_type?: string | null
          transaction_type?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
          vat_amount_doc_currency?: number | null
          vat_amount_vat_currency?: number | null
          vat_currency?: string | null
          vat_rate?: number | null
        }
        Update: {
          business_unit?: string | null
          commission_amount?: number | null
          contract?: string | null
          country?: string
          created_at?: string
          credit_note_line_nr?: string | null
          credit_note_nr?: string | null
          description?: string | null
          document_currency?: string | null
          document_date?: string | null
          document_subtype?: string | null
          document_type?: string | null
          file_name?: string
          fx_rate?: number | null
          id?: string
          invoice_line_nr?: string | null
          invoice_nr?: string | null
          invoice_type_code?: string | null
          issuer_city?: string | null
          issuer_country?: string | null
          issuer_legal_entity?: string | null
          issuer_legal_name?: string | null
          issuer_location?: string | null
          issuer_trn?: string | null
          net_amount_received?: number | null
          price_excluding_vat_doc_currency?: number | null
          price_excluding_vat_vat_currency?: number | null
          price_including_vat_doc_currency?: number | null
          receiver_city?: string | null
          receiver_country?: string | null
          receiver_legal_entity?: string | null
          receiver_legal_name?: string | null
          receiver_location?: string | null
          receiver_trn?: string | null
          shipping_amount?: number | null
          sku?: string | null
          source_doc_line_nr?: string | null
          source_doc_line_type?: string | null
          source_doc_nr?: string | null
          source_doc_type?: string | null
          transaction_type?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
          vat_amount_doc_currency?: number | null
          vat_amount_vat_currency?: number | null
          vat_currency?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      noon_order_fees: {
        Row: {
          awb_nr: string | null
          base_price: number | null
          brand: string | null
          country_code: string
          created_at: string
          creditnote_nr: string | null
          currency_code: string | null
          delivered_date: string | null
          family: string | null
          fee_alternate_seller_fulfillment: number | null
          fee_crossdock: number | null
          fee_damaged_return: number | null
          fee_direct_collection: number | null
          fee_directship_outbound: number | null
          fee_item_cancellation: number | null
          fee_miscellaneous: number | null
          fee_noon_markup: number | null
          fee_noon_penalty: number | null
          fee_noon_promo: number | null
          fee_noon_rocket_referral: number | null
          fee_outbound_fbn: number | null
          fee_referral: number | null
          fee_reinvoicing: number | null
          fee_retention_penalty: number | null
          fee_shipping: number | null
          fee_warranty_penalty: number | null
          fee_weight_handling: number | null
          fulfillment_mode: string | null
          id: string
          id_partner: string | null
          invoice_nr: string | null
          invoice_price: number | null
          item_nr: string | null
          item_status: string | null
          last_statement_date: string | null
          marketplace: string | null
          noon_markup: number | null
          offer_price: number | null
          order_nr: string
          ordered_date: string | null
          partner_sales_nr: string | null
          partner_sku: string | null
          product_title: string | null
          product_type: string | null
          promo_coupon: number | null
          promo_deal: number | null
          report_month: string
          report_period_end: string | null
          report_period_start: string | null
          returned_date: string | null
          seller_price: number | null
          seller_promo: number | null
          shipped_date: string | null
          sku: string | null
          statement_nr: string | null
          store_id: string | null
          total_payment: number | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          awb_nr?: string | null
          base_price?: number | null
          brand?: string | null
          country_code?: string
          created_at?: string
          creditnote_nr?: string | null
          currency_code?: string | null
          delivered_date?: string | null
          family?: string | null
          fee_alternate_seller_fulfillment?: number | null
          fee_crossdock?: number | null
          fee_damaged_return?: number | null
          fee_direct_collection?: number | null
          fee_directship_outbound?: number | null
          fee_item_cancellation?: number | null
          fee_miscellaneous?: number | null
          fee_noon_markup?: number | null
          fee_noon_penalty?: number | null
          fee_noon_promo?: number | null
          fee_noon_rocket_referral?: number | null
          fee_outbound_fbn?: number | null
          fee_referral?: number | null
          fee_reinvoicing?: number | null
          fee_retention_penalty?: number | null
          fee_shipping?: number | null
          fee_warranty_penalty?: number | null
          fee_weight_handling?: number | null
          fulfillment_mode?: string | null
          id?: string
          id_partner?: string | null
          invoice_nr?: string | null
          invoice_price?: number | null
          item_nr?: string | null
          item_status?: string | null
          last_statement_date?: string | null
          marketplace?: string | null
          noon_markup?: number | null
          offer_price?: number | null
          order_nr: string
          ordered_date?: string | null
          partner_sales_nr?: string | null
          partner_sku?: string | null
          product_title?: string | null
          product_type?: string | null
          promo_coupon?: number | null
          promo_deal?: number | null
          report_month: string
          report_period_end?: string | null
          report_period_start?: string | null
          returned_date?: string | null
          seller_price?: number | null
          seller_promo?: number | null
          shipped_date?: string | null
          sku?: string | null
          statement_nr?: string | null
          store_id?: string | null
          total_payment?: number | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          awb_nr?: string | null
          base_price?: number | null
          brand?: string | null
          country_code?: string
          created_at?: string
          creditnote_nr?: string | null
          currency_code?: string | null
          delivered_date?: string | null
          family?: string | null
          fee_alternate_seller_fulfillment?: number | null
          fee_crossdock?: number | null
          fee_damaged_return?: number | null
          fee_direct_collection?: number | null
          fee_directship_outbound?: number | null
          fee_item_cancellation?: number | null
          fee_miscellaneous?: number | null
          fee_noon_markup?: number | null
          fee_noon_penalty?: number | null
          fee_noon_promo?: number | null
          fee_noon_rocket_referral?: number | null
          fee_outbound_fbn?: number | null
          fee_referral?: number | null
          fee_reinvoicing?: number | null
          fee_retention_penalty?: number | null
          fee_shipping?: number | null
          fee_warranty_penalty?: number | null
          fee_weight_handling?: number | null
          fulfillment_mode?: string | null
          id?: string
          id_partner?: string | null
          invoice_nr?: string | null
          invoice_price?: number | null
          item_nr?: string | null
          item_status?: string | null
          last_statement_date?: string | null
          marketplace?: string | null
          noon_markup?: number | null
          offer_price?: number | null
          order_nr?: string
          ordered_date?: string | null
          partner_sales_nr?: string | null
          partner_sku?: string | null
          product_title?: string | null
          product_type?: string | null
          promo_coupon?: number | null
          promo_deal?: number | null
          report_month?: string
          report_period_end?: string | null
          report_period_start?: string | null
          returned_date?: string | null
          seller_price?: number | null
          seller_promo?: number | null
          shipped_date?: string | null
          sku?: string | null
          statement_nr?: string | null
          store_id?: string | null
          total_payment?: number | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noon_order_fees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      noon_sales_data: {
        Row: {
          awb_nr: string | null
          base_price: number | null
          brand_ar: string | null
          brand_en: string | null
          cancel_reason: string | null
          cancelled_date: string | null
          country_code: string
          created_at: string
          delivered_date: string | null
          estimated_shipping_date: string | null
          family: string | null
          id: string
          id_partner: string | null
          invoice_price: number | null
          is_fbn: boolean | null
          item_nr: string | null
          item_status: string | null
          marketplace: string | null
          ordered_date: string | null
          product_subtype: string | null
          product_type: string | null
          purchase_item_nr: string | null
          report_month: string
          returned_date: string | null
          shipped_date: string | null
          sku: string | null
          store_id: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          awb_nr?: string | null
          base_price?: number | null
          brand_ar?: string | null
          brand_en?: string | null
          cancel_reason?: string | null
          cancelled_date?: string | null
          country_code?: string
          created_at?: string
          delivered_date?: string | null
          estimated_shipping_date?: string | null
          family?: string | null
          id?: string
          id_partner?: string | null
          invoice_price?: number | null
          is_fbn?: boolean | null
          item_nr?: string | null
          item_status?: string | null
          marketplace?: string | null
          ordered_date?: string | null
          product_subtype?: string | null
          product_type?: string | null
          purchase_item_nr?: string | null
          report_month: string
          returned_date?: string | null
          shipped_date?: string | null
          sku?: string | null
          store_id?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          awb_nr?: string | null
          base_price?: number | null
          brand_ar?: string | null
          brand_en?: string | null
          cancel_reason?: string | null
          cancelled_date?: string | null
          country_code?: string
          created_at?: string
          delivered_date?: string | null
          estimated_shipping_date?: string | null
          family?: string | null
          id?: string
          id_partner?: string | null
          invoice_price?: number | null
          is_fbn?: boolean | null
          item_nr?: string | null
          item_status?: string | null
          marketplace?: string | null
          ordered_date?: string | null
          product_subtype?: string | null
          product_type?: string | null
          purchase_item_nr?: string | null
          report_month?: string
          returned_date?: string | null
          shipped_date?: string | null
          sku?: string | null
          store_id?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_noon_sales_data_store"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          asin: string | null
          country: Database["public"]["Enums"]["country_code"] | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_date: string | null
          invoice_id: string | null
          item_cost: number | null
          item_title: string | null
          order_id: string
          payment_completed_date: string | null
          payment_due_date: string | null
          payment_notes: string | null
          payment_reminder_date: string | null
          payment_schedule_days: number | null
          payment_status: string | null
          quantity: number | null
          shipment_date: string | null
          sku: string | null
          status: string | null
          tax_rate: number | null
          updated_at: string | null
          user_id: string
          vat_id: string | null
          warehouse_code: string | null
        }
        Insert: {
          asin?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_date?: string | null
          invoice_id?: string | null
          item_cost?: number | null
          item_title?: string | null
          order_id: string
          payment_completed_date?: string | null
          payment_due_date?: string | null
          payment_notes?: string | null
          payment_reminder_date?: string | null
          payment_schedule_days?: number | null
          payment_status?: string | null
          quantity?: number | null
          shipment_date?: string | null
          sku?: string | null
          status?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          user_id: string
          vat_id?: string | null
          warehouse_code?: string | null
        }
        Update: {
          asin?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_date?: string | null
          invoice_id?: string | null
          item_cost?: number | null
          item_title?: string | null
          order_id?: string
          payment_completed_date?: string | null
          payment_due_date?: string | null
          payment_notes?: string | null
          payment_reminder_date?: string | null
          payment_schedule_days?: number | null
          payment_status?: string | null
          quantity?: number | null
          shipment_date?: string | null
          sku?: string | null
          status?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          user_id?: string
          vat_id?: string | null
          warehouse_code?: string | null
        }
        Relationships: []
      }
      payment_reports: {
        Row: {
          adjustments: number | null
          commission: number | null
          country_code: string
          created_at: string
          currency: string | null
          description: string | null
          fees: number | null
          file_name: string | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          order_id: string | null
          payment_date: string | null
          payment_method: string | null
          refunds: number | null
          report_month: string
          report_period_end: string | null
          report_period_start: string | null
          store_id: string | null
          tax: number | null
          transaction_id: string | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          adjustments?: number | null
          commission?: number | null
          country_code?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          fees?: number | null
          file_name?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          order_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          refunds?: number | null
          report_month: string
          report_period_end?: string | null
          report_period_start?: string | null
          store_id?: string | null
          tax?: number | null
          transaction_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          adjustments?: number | null
          commission?: number | null
          country_code?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          fees?: number | null
          file_name?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          order_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          refunds?: number | null
          report_month?: string
          report_period_end?: string | null
          report_period_start?: string | null
          store_id?: string | null
          tax?: number | null
          transaction_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_reports_store"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_terms: {
        Row: {
          country: Database["public"]["Enums"]["country_code"]
          created_at: string | null
          credit_days: number | null
          currency: string
          flag: string
          id: string
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          country: Database["public"]["Enums"]["country_code"]
          created_at?: string | null
          credit_days?: number | null
          currency: string
          flag: string
          id?: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string | null
          credit_days?: number | null
          currency?: string
          flag?: string
          id?: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          country: string | null
          created_at: string
          id: string
          payment_date: string | null
          platform: string
          region: string
          status: string
          store_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          country?: string | null
          created_at?: string
          id?: string
          payment_date?: string | null
          platform: string
          region: string
          status?: string
          store_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          country?: string | null
          created_at?: string
          id?: string
          payment_date?: string | null
          platform?: string
          region?: string
          status?: string
          store_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      po_orders: {
        Row: {
          asin: string | null
          country: string | null
          created_at: string
          currency: string | null
          expected_delivery: string | null
          external_id: string | null
          external_id_type: string | null
          file_name: string
          id: string
          model_number: string | null
          notes: string | null
          order_date: string | null
          po_number: string
          quantity: number
          ship_to_location: string | null
          sku_code: string
          sku_user_id: string
          status: string
          supplier_order_number: string | null
          title: string | null
          total_cost: number | null
          tracking_number: string | null
          tracking_url: string | null
          unit_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          expected_delivery?: string | null
          external_id?: string | null
          external_id_type?: string | null
          file_name: string
          id?: string
          model_number?: string | null
          notes?: string | null
          order_date?: string | null
          po_number: string
          quantity?: number
          ship_to_location?: string | null
          sku_code: string
          sku_user_id: string
          status?: string
          supplier_order_number?: string | null
          title?: string | null
          total_cost?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          unit_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          expected_delivery?: string | null
          external_id?: string | null
          external_id_type?: string | null
          file_name?: string
          id?: string
          model_number?: string | null
          notes?: string | null
          order_date?: string | null
          po_number?: string
          quantity?: number
          ship_to_location?: string | null
          sku_code?: string
          sku_user_id?: string
          status?: string
          supplier_order_number?: string | null
          title?: string | null
          total_cost?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          unit_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_orders: {
        Row: {
          asin: string | null
          created_at: string
          id: string
          inventory_id: string | null
          inventory_type: string
          item_title: string | null
          match_type: string
          new_stock: number | null
          notes: string | null
          order_number: string
          previous_stock: number | null
          processed_at: string
          quantity_processed: number
          sku: string | null
          source_file: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          inventory_type: string
          item_title?: string | null
          match_type: string
          new_stock?: number | null
          notes?: string | null
          order_number: string
          previous_stock?: number | null
          processed_at?: string
          quantity_processed?: number
          sku?: string | null
          source_file?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          inventory_type?: string
          item_title?: string | null
          match_type?: string
          new_stock?: number | null
          notes?: string | null
          order_number?: string
          previous_stock?: number | null
          processed_at?: string
          quantity_processed?: number
          sku?: string | null
          source_file?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_main_admin: boolean
          role: string
          shipping_rate: number | null
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_main_admin?: boolean
          role?: string
          shipping_rate?: number | null
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_main_admin?: boolean
          role?: string
          shipping_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sku_costs: {
        Row: {
          cost: number
          country: string
          created_at: string
          id: string
          notes: string | null
          sku: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost: number
          country?: string
          created_at?: string
          id?: string
          notes?: string | null
          sku: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number
          country?: string
          created_at?: string
          id?: string
          notes?: string | null
          sku?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sku_inventory: {
        Row: {
          bin_serial_number: string
          country: string
          created_at: string
          date_added: string
          date_sold: string | null
          id: string
          last_restock_date: string | null
          quantity: number
          restock_date: string | null
          restock_quantity: number | null
          sku_number: string
          status: Database["public"]["Enums"]["inventory_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bin_serial_number: string
          country?: string
          created_at?: string
          date_added?: string
          date_sold?: string | null
          id?: string
          last_restock_date?: string | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          sku_number: string
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bin_serial_number?: string
          country?: string
          created_at?: string
          date_added?: string
          date_sold?: string | null
          id?: string
          last_restock_date?: string | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          sku_number?: string
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_changes: {
        Row: {
          asin: string | null
          change_amount: number
          change_reason: string | null
          created_at: string
          id: string
          inventory_id: string
          inventory_type: string
          new_quantity: number
          previous_quantity: number
          serial_number: string | null
          sku_number: string | null
          user_id: string
        }
        Insert: {
          asin?: string | null
          change_amount: number
          change_reason?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          inventory_type: string
          new_quantity: number
          previous_quantity: number
          serial_number?: string | null
          sku_number?: string | null
          user_id: string
        }
        Update: {
          asin?: string | null
          change_amount?: number
          change_reason?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          inventory_type?: string
          new_quantity?: number
          previous_quantity?: number
          serial_number?: string | null
          sku_number?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          country: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sunsky_skus: {
        Row: {
          cost: number | null
          country: string
          created_at: string
          currency: string | null
          id: string
          sku_code: string
          title: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          cost?: number | null
          country: string
          created_at?: string
          currency?: string | null
          id?: string
          sku_code: string
          title?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          cost?: number | null
          country?: string
          created_at?: string
          currency?: string | null
          id?: string
          sku_code?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          country: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          country?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          country?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_stores: {
        Row: {
          created_at: string
          id: string
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          location: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_po_orders: {
        Args: { user_id_param: string }
        Returns: {
          asin: string
          country: string
          created_at: string
          currency: string
          expected_delivery: string
          external_id: string
          external_id_type: string
          file_name: string
          id: string
          model_number: string
          notes: string
          order_date: string
          po_number: string
          quantity: number
          ship_to_location: string
          sku_code: string
          sku_user_id: string
          status: string
          sunsky_sku: Json
          supplier_order_number: string
          title: string
          total_cost: number
          tracking_number: string
          tracking_url: string
          unit_cost: number
          updated_at: string
          user_id: string
        }[]
      }
      get_all_po_orders_unlimited: {
        Args: { user_id_param: string }
        Returns: {
          asin: string | null
          country: string | null
          created_at: string
          currency: string | null
          expected_delivery: string | null
          external_id: string | null
          external_id_type: string | null
          file_name: string
          id: string
          model_number: string | null
          notes: string | null
          order_date: string | null
          po_number: string
          quantity: number
          ship_to_location: string | null
          sku_code: string
          sku_user_id: string
          status: string
          supplier_order_number: string | null
          title: string | null
          total_cost: number | null
          tracking_number: string | null
          tracking_url: string | null
          unit_cost: number | null
          updated_at: string
          user_id: string
        }[]
      }
      get_all_sunsky_skus: {
        Args: { user_id_param: string }
        Returns: {
          cost: number
          country: string
          created_at: string
          currency: string
          description: string
          id: string
          notes: string
          sku_code: string
          title: string
          updated_at: string
          user_id: string
          weight: number
        }[]
      }
      get_exchange_rate: {
        Args: { from_currency: string; to_currency: string }
        Returns: number
      }
      get_items_needing_restock: {
        Args: Record<PropertyKey, never> | { country_filter?: string }
        Returns: {
          current_quantity: number
          days_since_last_restock: number
          identifier: string
          item_id: string
          table_name: string
        }[]
      }
      get_noon_sales_upload_summary: {
        Args: { country_filter?: string }
        Returns: {
          id: string
          record_count: number
          report_month: string
          store_name: string
          upload_date: string
        }[]
      }
      get_order_fees_analysis: {
        Args: {
          country_filter?: string
          end_date?: string
          start_date?: string
          store_filter?: string
        }
        Returns: {
          description: string
          document_date: string
          fee_breakdown: Json
          fee_coverage_status: string
          invoice_price: number
          item_nr: string
          net_amount: number
          order_number: string
          order_status: string
          order_type: string
          profit_margin: number
          sku: string
          store_name: string
          total_fees: number
        }[]
      }
      get_order_fees_analysis_optimized: {
        Args: {
          country_filter?: string
          end_date?: string
          limit_records?: number
          start_date?: string
          store_filter?: string
        }
        Returns: {
          description: string
          document_date: string
          fee_breakdown: Json
          fee_coverage_status: string
          invoice_price: number
          item_nr: string
          net_amount: number
          order_number: string
          order_status: string
          order_type: string
          profit_margin: number
          sku: string
          store_name: string
          total_fees: number
        }[]
      }
      get_sales_analytics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_days_to_sell: number
          fastest_selling_item: string
          predicted_restock_needed_items: Json
          product_type: string
          restock_frequency_days: number
          slowest_selling_item: string
          total_sold: number
        }[]
      }
      is_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      country_code: "UAE" | "KSA"
      inventory_status: "in-stock" | "sold" | "reserved" | "damaged" | "ordered"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      country_code: ["UAE", "KSA"],
      inventory_status: ["in-stock", "sold", "reserved", "damaged", "ordered"],
    },
  },
} as const
