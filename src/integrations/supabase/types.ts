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
      automation_capture_events: {
        Row: {
          attributes: Json | null
          config_id: string | null
          created_at: string
          css: string | null
          id: string
          inner_text: string | null
          site_origin: string | null
          site_url: string | null
          tag: string | null
          user_id: string
          xpath: string | null
        }
        Insert: {
          attributes?: Json | null
          config_id?: string | null
          created_at?: string
          css?: string | null
          id?: string
          inner_text?: string | null
          site_origin?: string | null
          site_url?: string | null
          tag?: string | null
          user_id: string
          xpath?: string | null
        }
        Update: {
          attributes?: Json | null
          config_id?: string | null
          created_at?: string
          css?: string | null
          id?: string
          inner_text?: string | null
          site_origin?: string | null
          site_url?: string | null
          tag?: string | null
          user_id?: string
          xpath?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_capture_events_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "automation_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_capture_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_configs: {
        Row: {
          active: boolean
          created_at: string
          fields: Json
          id: string
          name: string | null
          site_origin: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fields?: Json
          id?: string
          name?: string | null
          site_origin: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fields?: Json
          id?: string
          name?: string | null
          site_origin?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          config_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          result: Json | null
          site_origin: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          config_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          result?: Json | null
          site_origin?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          config_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          result?: Json | null
          site_origin?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "automation_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      background_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          processed_items: number | null
          progress: number | null
          status: string
          total_items: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          progress?: number | null
          status?: string
          total_items?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          progress?: number | null
          status?: string
          total_items?: number | null
          type?: string
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
      export_history: {
        Row: {
          background_task_id: string | null
          created_at: string
          error_message: string | null
          export_type: string
          file_path: string | null
          file_size: number | null
          filters: Json
          id: string
          metadata: Json
          status: string
          total_items: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background_task_id?: string | null
          created_at?: string
          error_message?: string | null
          export_type: string
          file_path?: string | null
          file_size?: number | null
          filters?: Json
          id?: string
          metadata?: Json
          status?: string
          total_items?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background_task_id?: string | null
          created_at?: string
          error_message?: string | null
          export_type?: string
          file_path?: string | null
          file_size?: number | null
          filters?: Json
          id?: string
          metadata?: Json
          status?: string
          total_items?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_history_background_task_id_fkey"
            columns: ["background_task_id"]
            isOneToOne: false
            referencedRelation: "background_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      label_datasets: {
        Row: {
          created_at: string
          data: Json
          description: string | null
          headers: Json
          id: string
          name: string
          row_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          description?: string | null
          headers?: Json
          id?: string
          name: string
          row_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          description?: string | null
          headers?: Json
          id?: string
          name?: string
          row_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      label_templates: {
        Row: {
          canvas_data: Json
          created_at: string
          description: string | null
          height: number
          id: string
          name: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          canvas_data?: Json
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          canvas_data?: Json
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          width?: number
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
          default_values: Json | null
          file_type: string
          headers: string[]
          id: string
          locked_headers: string[] | null
          store_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_values?: Json | null
          file_type: string
          headers: string[]
          id?: string
          locked_headers?: string[] | null
          store_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_values?: Json | null
          file_type?: string
          headers?: string[]
          id?: string
          locked_headers?: string[] | null
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
      noon_orders: {
        Row: {
          brand_code: string | null
          created_at: string
          file_name: string | null
          fulfillment_timestamp: string | null
          id: string
          id_warehouse_configuration: string | null
          image_key: string | null
          is_printed: boolean | null
          is_reprintable: boolean | null
          item_status: string | null
          manifest_nr: string | null
          mp_code: string | null
          order_country_code: string | null
          order_nr: string
          order_received_at: string | null
          order_status: string | null
          parent_sku: string | null
          partner_sku: string | null
          pbarcodes: string | null
          purchase_item_nr: string | null
          quantity: number | null
          shipment_created_at: string | null
          shipment_created_by: string | null
          shipment_nr: string | null
          shipment_user: string | null
          size: string | null
          sku: string | null
          store_id: string | null
          sunsky_credentials_id: string | null
          sunsky_error_message: string | null
          sunsky_last_sync: string | null
          sunsky_order_number: string | null
          sunsky_order_status: number | null
          sunsky_tracking_number: string | null
          target_ready_at: string | null
          title: string | null
          title_ar: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_code?: string | null
          created_at?: string
          file_name?: string | null
          fulfillment_timestamp?: string | null
          id?: string
          id_warehouse_configuration?: string | null
          image_key?: string | null
          is_printed?: boolean | null
          is_reprintable?: boolean | null
          item_status?: string | null
          manifest_nr?: string | null
          mp_code?: string | null
          order_country_code?: string | null
          order_nr: string
          order_received_at?: string | null
          order_status?: string | null
          parent_sku?: string | null
          partner_sku?: string | null
          pbarcodes?: string | null
          purchase_item_nr?: string | null
          quantity?: number | null
          shipment_created_at?: string | null
          shipment_created_by?: string | null
          shipment_nr?: string | null
          shipment_user?: string | null
          size?: string | null
          sku?: string | null
          store_id?: string | null
          sunsky_credentials_id?: string | null
          sunsky_error_message?: string | null
          sunsky_last_sync?: string | null
          sunsky_order_number?: string | null
          sunsky_order_status?: number | null
          sunsky_tracking_number?: string | null
          target_ready_at?: string | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_code?: string | null
          created_at?: string
          file_name?: string | null
          fulfillment_timestamp?: string | null
          id?: string
          id_warehouse_configuration?: string | null
          image_key?: string | null
          is_printed?: boolean | null
          is_reprintable?: boolean | null
          item_status?: string | null
          manifest_nr?: string | null
          mp_code?: string | null
          order_country_code?: string | null
          order_nr?: string
          order_received_at?: string | null
          order_status?: string | null
          parent_sku?: string | null
          partner_sku?: string | null
          pbarcodes?: string | null
          purchase_item_nr?: string | null
          quantity?: number | null
          shipment_created_at?: string | null
          shipment_created_by?: string | null
          shipment_nr?: string | null
          shipment_user?: string | null
          size?: string | null
          sku?: string | null
          store_id?: string | null
          sunsky_credentials_id?: string | null
          sunsky_error_message?: string | null
          sunsky_last_sync?: string | null
          sunsky_order_number?: string | null
          sunsky_order_status?: number | null
          sunsky_tracking_number?: string | null
          target_ready_at?: string | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noon_orders_store_id_fkey"
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
      order_imports: {
        Row: {
          asin: string | null
          created_at: string
          gift_message: string | null
          has_inventory_match: boolean
          id: string
          inventory_id: string | null
          inventory_match_type: string | null
          is_gift: string | null
          is_processed: boolean
          item_cost: string | null
          item_quantity: number
          item_title: string | null
          match_field_type: string | null
          order_id: string
          order_place_date: string | null
          order_status: string | null
          phone_number: string | null
          processed_at: string | null
          required_ship_date: string | null
          ship_method: string | null
          ship_method_code: string | null
          ship_to_address_line1: string | null
          ship_to_address_line2: string | null
          ship_to_address_line3: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_name: string | null
          ship_to_state: string | null
          ship_to_zip_code: string | null
          shipped_date: string | null
          sku: string | null
          source_file: string
          tracking_id: string | null
          updated_at: string
          user_id: string
          warehouse_code: string | null
        }
        Insert: {
          asin?: string | null
          created_at?: string
          gift_message?: string | null
          has_inventory_match?: boolean
          id?: string
          inventory_id?: string | null
          inventory_match_type?: string | null
          is_gift?: string | null
          is_processed?: boolean
          item_cost?: string | null
          item_quantity?: number
          item_title?: string | null
          match_field_type?: string | null
          order_id: string
          order_place_date?: string | null
          order_status?: string | null
          phone_number?: string | null
          processed_at?: string | null
          required_ship_date?: string | null
          ship_method?: string | null
          ship_method_code?: string | null
          ship_to_address_line1?: string | null
          ship_to_address_line2?: string | null
          ship_to_address_line3?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_state?: string | null
          ship_to_zip_code?: string | null
          shipped_date?: string | null
          sku?: string | null
          source_file: string
          tracking_id?: string | null
          updated_at?: string
          user_id: string
          warehouse_code?: string | null
        }
        Update: {
          asin?: string | null
          created_at?: string
          gift_message?: string | null
          has_inventory_match?: boolean
          id?: string
          inventory_id?: string | null
          inventory_match_type?: string | null
          is_gift?: string | null
          is_processed?: boolean
          item_cost?: string | null
          item_quantity?: number
          item_title?: string | null
          match_field_type?: string | null
          order_id?: string
          order_place_date?: string | null
          order_status?: string | null
          phone_number?: string | null
          processed_at?: string | null
          required_ship_date?: string | null
          ship_method?: string | null
          ship_method_code?: string | null
          ship_to_address_line1?: string | null
          ship_to_address_line2?: string | null
          ship_to_address_line3?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_state?: string | null
          ship_to_zip_code?: string | null
          shipped_date?: string | null
          sku?: string | null
          source_file?: string
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
          warehouse_code?: string | null
        }
        Relationships: []
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
      po_job_items: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          model_number: string
          product_data: Json | null
          sku_code: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          model_number: string
          product_data?: Json | null
          sku_code?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          model_number?: string
          product_data?: Json | null
          sku_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sunsky_import_jobs"
            referencedColumns: ["id"]
          },
        ]
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
          item_key: string | null
          job_id: string | null
          model_number: string | null
          notes: string | null
          order_date: string | null
          po_key: string | null
          po_number: string
          quantity: number
          ship_to_location: string | null
          sku_code: string
          sku_user_id: string
          status: string
          sunsky_credentials_id: string | null
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
          item_key?: string | null
          job_id?: string | null
          model_number?: string | null
          notes?: string | null
          order_date?: string | null
          po_key?: string | null
          po_number: string
          quantity?: number
          ship_to_location?: string | null
          sku_code: string
          sku_user_id: string
          status?: string
          sunsky_credentials_id?: string | null
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
          item_key?: string | null
          job_id?: string | null
          model_number?: string | null
          notes?: string | null
          order_date?: string | null
          po_key?: string | null
          po_number?: string
          quantity?: number
          ship_to_location?: string | null
          sku_code?: string
          sku_user_id?: string
          status?: string
          sunsky_credentials_id?: string | null
          supplier_order_number?: string | null
          title?: string | null
          total_cost?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          unit_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "po_upload_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_orders_sunsky_credentials_id_fkey"
            columns: ["sunsky_credentials_id"]
            isOneToOne: false
            referencedRelation: "sunsky_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      po_upload_job_errors: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          job_id: string
          row_data: Json | null
          row_number: number
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          job_id: string
          row_data?: Json | null
          row_number: number
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          job_id?: string
          row_data?: Json | null
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_upload_job_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "po_upload_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      po_upload_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          error_rows: number | null
          file_name: string
          file_size: number | null
          id: string
          processed_rows: number | null
          processing_details: Json | null
          progress_percentage: number | null
          started_at: string | null
          status: string
          success_rows: number | null
          total_rows: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          error_rows?: number | null
          file_name: string
          file_size?: number | null
          id?: string
          processed_rows?: number | null
          processing_details?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          success_rows?: number | null
          total_rows?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          error_rows?: number | null
          file_name?: string
          file_size?: number | null
          id?: string
          processed_rows?: number | null
          processing_details?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          success_rows?: number | null
          total_rows?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      print_eligible_items: {
        Row: {
          created_at: string
          id: string
          identifier: string
          is_active: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          is_active?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          is_active?: boolean
          type?: string
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
      saved_delivery_addresses: {
        Row: {
          address: string
          address2: string | null
          city: string
          company: string | null
          country_id: string
          created_at: string
          email: string | null
          id: string
          is_default: boolean
          name: string
          postcode: string
          receiver: string
          state: string | null
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          address2?: string | null
          city: string
          company?: string | null
          country_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          name: string
          postcode: string
          receiver: string
          state?: string | null
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          address2?: string | null
          city?: string
          company?: string | null
          country_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          name?: string
          postcode?: string
          receiver?: string
          state?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string
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
          asin: string | null
          bin_serial_number: string
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
          sku_number: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          bin_serial_number: string
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
          sku_number: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          bin_serial_number?: string
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
          sku_number?: string
          status?: string
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
      sunsky_api_usage: {
        Row: {
          count: number
          created_at: string
          endpoint: string
          id: string
          key_hash: string
          last_request: string
          period: string
          updated_at: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          endpoint: string
          id?: string
          key_hash: string
          last_request?: string
          period: string
          updated_at?: string
          user_id?: string | null
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string
          endpoint?: string
          id?: string
          key_hash?: string
          last_request?: string
          period?: string
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      sunsky_credentials: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string
          id: string
          is_active: boolean
          last_tested: string | null
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_tested?: string | null
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_tested?: string | null
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sunsky_export_history: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          export_type: string
          file_name: string | null
          file_size: number | null
          filters: Json
          id: string
          pages_processed: number | null
          progress_percentage: number | null
          started_at: string
          status: string
          total_actual: number | null
          total_estimated: number | null
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_type?: string
          file_name?: string | null
          file_size?: number | null
          filters?: Json
          id?: string
          pages_processed?: number | null
          progress_percentage?: number | null
          started_at?: string
          status?: string
          total_actual?: number | null
          total_estimated?: number | null
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_type?: string
          file_name?: string | null
          file_size?: number | null
          filters?: Json
          id?: string
          pages_processed?: number | null
          progress_percentage?: number | null
          started_at?: string
          status?: string
          total_actual?: number | null
          total_estimated?: number | null
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sunsky_import_job_items: {
        Row: {
          cost: number | null
          created_at: string
          currency: string | null
          error_message: string | null
          id: string
          item_no: string
          job_id: string
          processed_at: string | null
          sku_code: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          item_no: string
          job_id: string
          processed_at?: string | null
          sku_code?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          item_no?: string
          job_id?: string
          processed_at?: string | null
          sku_code?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sunsky_import_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sunsky_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sunsky_import_jobs: {
        Row: {
          cancelled: boolean | null
          completed_at: string | null
          country: string
          created_at: string
          criteria: Json
          error_count: number
          id: string
          last_error: string | null
          paused: boolean | null
          processed_items: number
          started_at: string | null
          status: string
          success_count: number
          total_items: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled?: boolean | null
          completed_at?: string | null
          country?: string
          created_at?: string
          criteria: Json
          error_count?: number
          id?: string
          last_error?: string | null
          paused?: boolean | null
          processed_items?: number
          started_at?: string | null
          status?: string
          success_count?: number
          total_items?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled?: boolean | null
          completed_at?: string | null
          country?: string
          created_at?: string
          criteria?: Json
          error_count?: number
          id?: string
          last_error?: string | null
          paused?: boolean | null
          processed_items?: number
          started_at?: string | null
          status?: string
          success_count?: number
          total_items?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sunsky_import_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          job_id: string
          level: string
          message: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          job_id: string
          level: string
          message: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          job_id?: string
          level?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunsky_import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sunsky_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sunsky_order_items: {
        Row: {
          asin: string | null
          created_at: string
          currency: string | null
          expected_ship_date: string | null
          id: string
          item_status: string | null
          last_synced_at: string
          model_number: string | null
          order_number: string
          quantity: number | null
          raw: Json | null
          sku_code: string | null
          status_last_updated_at: string | null
          title: string | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          asin?: string | null
          created_at?: string
          currency?: string | null
          expected_ship_date?: string | null
          id?: string
          item_status?: string | null
          last_synced_at?: string
          model_number?: string | null
          order_number: string
          quantity?: number | null
          raw?: Json | null
          sku_code?: string | null
          status_last_updated_at?: string | null
          title?: string | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          asin?: string | null
          created_at?: string
          currency?: string | null
          expected_ship_date?: string | null
          id?: string
          item_status?: string | null
          last_synced_at?: string
          model_number?: string | null
          order_number?: string
          quantity?: number | null
          raw?: Json | null
          sku_code?: string | null
          status_last_updated_at?: string | null
          title?: string | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunsky_order_items_order_number_fkey"
            columns: ["order_number"]
            isOneToOne: false
            referencedRelation: "sunsky_orders"
            referencedColumns: ["number"]
          },
        ]
      }
      sunsky_orders: {
        Row: {
          created_at: string
          currency: string | null
          gmt_created: string | null
          id: string
          last_synced_at: string
          number: string
          po_numbers: string[] | null
          raw: Json | null
          shipping_company: string | null
          site_number: string | null
          status: string | null
          status_last_updated_at: string | null
          sunsky_credentials_id: string | null
          total: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          gmt_created?: string | null
          id?: string
          last_synced_at?: string
          number: string
          po_numbers?: string[] | null
          raw?: Json | null
          shipping_company?: string | null
          site_number?: string | null
          status?: string | null
          status_last_updated_at?: string | null
          sunsky_credentials_id?: string | null
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          gmt_created?: string | null
          id?: string
          last_synced_at?: string
          number?: string
          po_numbers?: string[] | null
          raw?: Json | null
          shipping_company?: string | null
          site_number?: string | null
          status?: string | null
          status_last_updated_at?: string | null
          sunsky_credentials_id?: string | null
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunsky_orders_sunsky_credentials_id_fkey"
            columns: ["sunsky_credentials_id"]
            isOneToOne: false
            referencedRelation: "sunsky_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      sunsky_skus: {
        Row: {
          cost: number | null
          country: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          product_data: Json | null
          sku_code: string
          title: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          cost?: number | null
          country?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          product_data?: Json | null
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
          description?: string | null
          id?: string
          product_data?: Json | null
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
      vendor_feed_logs: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          error_message: string | null
          feed_type: string
          file_name: string
          file_path: string | null
          id: string
          integration_id: string
          sent_at: string | null
          status: string
          total_items: number | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          error_message?: string | null
          feed_type?: string
          file_name: string
          file_path?: string | null
          id?: string
          integration_id: string
          sent_at?: string | null
          status?: string
          total_items?: number | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          error_message?: string | null
          feed_type?: string
          file_name?: string
          file_path?: string | null
          id?: string
          integration_id?: string
          sent_at?: string | null
          status?: string
          total_items?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_feed_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "vendor_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_integrations: {
        Row: {
          as2_async_mdn: boolean | null
          as2_certificate_path: string | null
          as2_compression: boolean | null
          as2_encryption_algorithm: string | null
          as2_endpoint_url: string | null
          as2_mdn_required: boolean | null
          as2_partner_id: string | null
          as2_private_key_path: string | null
          as2_receiver_id: string | null
          as2_retry_count: number | null
          as2_sender_id: string | null
          as2_signature_algorithm: string | null
          country: string
          created_at: string
          feed_schedule: string
          firewall_ip_ranges: string[] | null
          id: string
          is_active: boolean
          primary_key_type: string
          sftp_host: string | null
          sftp_port: number | null
          sftp_receive_host: string | null
          sftp_receive_port: number | null
          sftp_receive_remote_path: string | null
          sftp_receive_username: string | null
          sftp_remote_path: string | null
          sftp_username: string | null
          ssh_fingerprint_receiving: string | null
          ssh_fingerprint_sending: string | null
          transport_method: string
          updated_at: string
          user_id: string
          vendor_name: string
        }
        Insert: {
          as2_async_mdn?: boolean | null
          as2_certificate_path?: string | null
          as2_compression?: boolean | null
          as2_encryption_algorithm?: string | null
          as2_endpoint_url?: string | null
          as2_mdn_required?: boolean | null
          as2_partner_id?: string | null
          as2_private_key_path?: string | null
          as2_receiver_id?: string | null
          as2_retry_count?: number | null
          as2_sender_id?: string | null
          as2_signature_algorithm?: string | null
          country?: string
          created_at?: string
          feed_schedule?: string
          firewall_ip_ranges?: string[] | null
          id?: string
          is_active?: boolean
          primary_key_type?: string
          sftp_host?: string | null
          sftp_port?: number | null
          sftp_receive_host?: string | null
          sftp_receive_port?: number | null
          sftp_receive_remote_path?: string | null
          sftp_receive_username?: string | null
          sftp_remote_path?: string | null
          sftp_username?: string | null
          ssh_fingerprint_receiving?: string | null
          ssh_fingerprint_sending?: string | null
          transport_method?: string
          updated_at?: string
          user_id: string
          vendor_name?: string
        }
        Update: {
          as2_async_mdn?: boolean | null
          as2_certificate_path?: string | null
          as2_compression?: boolean | null
          as2_encryption_algorithm?: string | null
          as2_endpoint_url?: string | null
          as2_mdn_required?: boolean | null
          as2_partner_id?: string | null
          as2_private_key_path?: string | null
          as2_receiver_id?: string | null
          as2_retry_count?: number | null
          as2_sender_id?: string | null
          as2_signature_algorithm?: string | null
          country?: string
          created_at?: string
          feed_schedule?: string
          firewall_ip_ranges?: string[] | null
          id?: string
          is_active?: boolean
          primary_key_type?: string
          sftp_host?: string | null
          sftp_port?: number | null
          sftp_receive_host?: string | null
          sftp_receive_port?: number | null
          sftp_receive_remote_path?: string | null
          sftp_receive_username?: string | null
          sftp_remote_path?: string | null
          sftp_username?: string | null
          ssh_fingerprint_receiving?: string | null
          ssh_fingerprint_sending?: string | null
          transport_method?: string
          updated_at?: string
          user_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      vendor_item_mappings: {
        Row: {
          country: string
          created_at: string
          id: string
          integration_id: string
          internal_asin: string | null
          internal_sku: string | null
          is_active: boolean
          upc: string | null
          updated_at: string
          user_id: string
          vendor_asin: string | null
          vendor_sku: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          integration_id: string
          internal_asin?: string | null
          internal_sku?: string | null
          is_active?: boolean
          upc?: string | null
          updated_at?: string
          user_id: string
          vendor_asin?: string | null
          vendor_sku?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          integration_id?: string
          internal_asin?: string | null
          internal_sku?: string | null
          is_active?: boolean
          upc?: string | null
          updated_at?: string
          user_id?: string
          vendor_asin?: string | null
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_item_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "vendor_integrations"
            referencedColumns: ["id"]
          },
        ]
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
      cleanup_po_duplicates: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_active_po_metrics: {
        Args: { user_id_param: string }
        Returns: {
          ordered_orders: number
          pending_orders: number
          shipped_orders: number
          total_active_orders: number
          total_active_quantity: number
          unique_po_numbers: number
        }[]
      }
      get_active_po_metrics_raw: {
        Args: { user_id_param: string }
        Returns: {
          ordered_orders: number
          pending_orders: number
          shipped_orders: number
          total_active_orders: number
          total_active_quantity: number
          unique_po_numbers: number
        }[]
      }
      get_active_po_orders_latest: {
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
      get_all_po_orders_deduplicated: {
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
      get_all_po_orders_raw: {
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
          item_key: string | null
          job_id: string | null
          model_number: string | null
          notes: string | null
          order_date: string | null
          po_key: string | null
          po_number: string
          quantity: number
          ship_to_location: string | null
          sku_code: string
          sku_user_id: string
          status: string
          sunsky_credentials_id: string | null
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
      get_all_po_orders_with_sku_data: {
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
      get_all_user_sunsky_orders: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          currency: string
          gmt_created: string
          id: string
          is_app_placed: boolean
          items: Json
          last_synced_at: string
          number: string
          po_numbers: string[]
          raw: Json
          shipping_company: string
          site_number: string
          status: string
          status_last_updated_at: string
          sunsky_credentials_id: string
          total: number
          tracking_number: string
          tracking_url: string
          updated_at: string
          user_id: string
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
      get_job_item_stats: {
        Args: { job_id_param: string }
        Returns: {
          completed: number
          errors: number
          pending: number
          processing: number
          total: number
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
      get_po_comprehensive_metrics: {
        Args: { user_id_param: string }
        Returns: {
          matched_line_items: number
          matched_quantity: number
          pending_line_items: number
          pending_quantity: number
          placed_line_items: number
          placed_quantity: number
          status_breakdown: Json
          total_line_items: number
          total_quantity: number
          unique_po_numbers: number
        }[]
      }
      get_po_dashboard_summary: {
        Args: { user_id_param: string }
        Returns: {
          ordered_orders: number
          pending_orders: number
          recent_uploads: Json
          shipped_orders: number
          status_breakdown: Json
          top_suppliers: Json
          total_active_orders: number
          total_active_quantity: number
          total_active_value: number
          unique_po_numbers: number
        }[]
      }
      get_po_dashboard_summary_deduplicated: {
        Args: { user_id_param: string }
        Returns: {
          ordered_orders: number
          pending_orders: number
          recent_uploads: Json
          shipped_orders: number
          status_breakdown: Json
          top_suppliers: Json
          total_active_orders: number
          total_active_quantity: number
          total_active_value: number
          unique_po_numbers: number
        }[]
      }
      get_po_group_metrics: {
        Args: { user_id_param: string }
        Returns: {
          asn_quantity: number
          distinct_skus: number
          po_number: string
        }[]
      }
      get_po_reconciliation_summary: {
        Args: { user_id_param: string }
        Returns: {
          duplicate_records: number
          quantity_difference: number
          total_deduplicated_quantity: number
          total_deduplicated_records: number
          total_raw_quantity: number
          total_raw_records: number
        }[]
      }
      get_po_totals_raw: {
        Args: { user_id_param: string }
        Returns: {
          active_quantity: number
          active_records: number
          delivered_quantity: number
          delivered_records: number
          total_quantity: number
          total_records: number
        }[]
      }
      get_printable_orders: {
        Args: {
          date_filter_type?: string
          end_date: string
          start_date: string
          status_filter?: string
        }
        Returns: {
          asin: string
          created_at: string
          id: string
          item_quantity: number
          item_title: string
          order_id: string
          order_place_date: string
          order_status: string
          printable: boolean
          sku: string
          source_file: string
        }[]
      }
      get_procurement_unified_items: {
        Args: { country_filter?: string }
        Returns: {
          created_at: string
          expected_ship_date: string
          item_id: string
          model_number: string
          po_id: string
          po_number: string
          quantity: number
          sku: string
          source: string
          status: string
          status_last_updated_at: string
          sunsky_item_status: string
          sunsky_order_number: string
          supplier_order_number: string
          title: string
          tracking_number: string
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
      get_sunsky_orders_with_po_relations: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          currency: string
          gmt_created: string
          id: string
          items: Json
          last_synced_at: string
          number: string
          po_numbers: string[]
          raw: Json
          shipping_company: string
          site_number: string
          status: string
          status_last_updated_at: string
          total: number
          tracking_number: string
          tracking_url: string
          updated_at: string
          user_id: string
        }[]
      }
      get_sunsky_slow_items: {
        Args: { threshold_days?: number }
        Returns: {
          created_at: string
          days_in_status: number
          expected_ship_date: string
          item_status: string
          order_number: string
          sku_code: string
          title: string
        }[]
      }
      is_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      update_print_eligible_items_by_order_skus: {
        Args: { user_id_param: string }
        Returns: {
          total_unique_skus: number
          updated_active_count: number
          updated_inactive_count: number
        }[]
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
