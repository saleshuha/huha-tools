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
      amazon_returns_data: {
        Row: {
          asin: string
          confidence_score: number | null
          country: string
          created_at: string
          file_name: string | null
          id: string
          impact_score: number | null
          notes: string | null
          priority_score: number | null
          product_title: string | null
          return_ratio: number | null
          returned_units: number
          shipped_units: number
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          asin: string
          confidence_score?: number | null
          country?: string
          created_at?: string
          file_name?: string | null
          id?: string
          impact_score?: number | null
          notes?: string | null
          priority_score?: number | null
          product_title?: string | null
          return_ratio?: number | null
          returned_units: number
          shipped_units: number
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          asin?: string
          confidence_score?: number | null
          country?: string
          created_at?: string
          file_name?: string | null
          id?: string
          impact_score?: number | null
          notes?: string | null
          priority_score?: number | null
          product_title?: string | null
          return_ratio?: number | null
          returned_units?: number
          shipped_units?: number
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      asin_cost_history: {
        Row: {
          asin: string
          created_at: string
          id: string
          link_id: string | null
          po_number: string | null
          recorded_date: string
          sku_code: string | null
          supplier_name: string | null
          title: string | null
          unit_cost: number
          user_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          link_id?: string | null
          po_number?: string | null
          recorded_date?: string
          sku_code?: string | null
          supplier_name?: string | null
          title?: string | null
          unit_cost: number
          user_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          link_id?: string | null
          po_number?: string | null
          recorded_date?: string
          sku_code?: string | null
          supplier_name?: string | null
          title?: string | null
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asin_cost_history_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "purchase_links"
            referencedColumns: ["id"]
          },
        ]
      }
      asin_inventory: {
        Row: {
          additional_serial_numbers: string[] | null
          asin: string
          country: string
          created_at: string
          date_added: string
          date_sold: string | null
          eligible_for_restock: boolean | null
          first_stock_added_at: string | null
          id: string
          is_active: boolean
          last_restock_date: string | null
          manual_restock_override: boolean | null
          notes: string | null
          ordered_at: string | null
          ordered_quantity: number | null
          quantity: number
          restock_date: string | null
          restock_quantity: number | null
          serial_number: string
          sku: string | null
          status: Database["public"]["Enums"]["inventory_status"]
          sunsky_order_number: string | null
          title: string | null
          updated_at: string
          user_id: string
          velocity_order_ref: string | null
        }
        Insert: {
          additional_serial_numbers?: string[] | null
          asin: string
          country?: string
          created_at?: string
          date_added?: string
          date_sold?: string | null
          eligible_for_restock?: boolean | null
          first_stock_added_at?: string | null
          id?: string
          is_active?: boolean
          last_restock_date?: string | null
          manual_restock_override?: boolean | null
          notes?: string | null
          ordered_at?: string | null
          ordered_quantity?: number | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          serial_number: string
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          sunsky_order_number?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          velocity_order_ref?: string | null
        }
        Update: {
          additional_serial_numbers?: string[] | null
          asin?: string
          country?: string
          created_at?: string
          date_added?: string
          date_sold?: string | null
          eligible_for_restock?: boolean | null
          first_stock_added_at?: string | null
          id?: string
          is_active?: boolean
          last_restock_date?: string | null
          manual_restock_override?: boolean | null
          notes?: string | null
          ordered_at?: string | null
          ordered_quantity?: number | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          serial_number?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          sunsky_order_number?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          velocity_order_ref?: string | null
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
      automation_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          parameters: Json | null
          result: Json | null
          started_at: string | null
          status: string | null
          task_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          parameters?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          task_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          parameters?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          task_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      category_mappings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          noon_category_id: string
          noon_category_name: string | null
          sunsky_category_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          noon_category_id: string
          noon_category_name?: string | null
          sunsky_category_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          noon_category_id?: string
          noon_category_name?: string | null
          sunsky_category_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_order_tracking: {
        Row: {
          asin: string
          created_at: string | null
          id: string
          inventory_id: string
          order_status: string
          ordered_at: string | null
          remaining_stock: number
          sale_date: string
          skip_reason: string | null
          sku: string | null
          sold_quantity: number
          sunsky_order_number: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asin: string
          created_at?: string | null
          id?: string
          inventory_id: string
          order_status?: string
          ordered_at?: string | null
          remaining_stock: number
          sale_date: string
          skip_reason?: string | null
          sku?: string | null
          sold_quantity: number
          sunsky_order_number?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asin?: string
          created_at?: string | null
          id?: string
          inventory_id?: string
          order_status?: string
          ordered_at?: string | null
          remaining_stock?: number
          sale_date?: string
          skip_reason?: string | null
          sku?: string | null
          sold_quantity?: number
          sunsky_order_number?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_order_tracking_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "asin_inventory"
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
          keep_forever: boolean
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
          keep_forever?: boolean
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
          keep_forever?: boolean
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
      export_mode_preferences: {
        Row: {
          created_at: string
          export_mode: string
          id: string
          item_id: string
          item_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          export_mode: string
          id?: string
          item_id: string
          item_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          export_mode?: string
          id?: string
          item_id?: string
          item_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fba_inventory: {
        Row: {
          asin: string
          condition: string | null
          created_at: string
          file_name: string | null
          fnsku: string | null
          id: string
          quantity: number
          sku: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asin: string
          condition?: string | null
          created_at?: string
          file_name?: string | null
          fnsku?: string | null
          id?: string
          quantity?: number
          sku?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string
          condition?: string | null
          created_at?: string
          file_name?: string | null
          fnsku?: string | null
          id?: string
          quantity?: number
          sku?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          amount: number
          country: string
          created_at: string
          currency: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          person_name: string
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          country?: string
          created_at?: string
          currency?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          person_name: string
          type?: Database["public"]["Enums"]["financial_record_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          country?: string
          created_at?: string
          currency?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          person_name?: string
          type?: Database["public"]["Enums"]["financial_record_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fulfillment_history: {
        Row: {
          asin: string | null
          created_at: string
          fulfilled_quantity: number
          fulfillment_source: string
          id: string
          inventory_id: string | null
          model_number: string | null
          notes: string | null
          original_quantity: number
          po_number: string
          sku_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          created_at?: string
          fulfilled_quantity: number
          fulfillment_source?: string
          id?: string
          inventory_id?: string | null
          model_number?: string | null
          notes?: string | null
          original_quantity: number
          po_number: string
          sku_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          created_at?: string
          fulfilled_quantity?: number
          fulfillment_source?: string
          id?: string
          inventory_id?: string | null
          model_number?: string | null
          notes?: string | null
          original_quantity?: number
          po_number?: string
          sku_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      huha_stores: {
        Row: {
          created_at: string
          credentials: Json | null
          huha_store_id: string
          id: string
          is_active: boolean | null
          store_name: string
          store_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials?: Json | null
          huha_store_id: string
          id?: string
          is_active?: boolean | null
          store_name: string
          store_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json | null
          huha_store_id?: string
          id?: string
          is_active?: boolean | null
          store_name?: string
          store_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_match_sessions: {
        Row: {
          country: string | null
          created_at: string
          file_name: string | null
          id: string
          in_stock_count: number | null
          match_results: Json | null
          matched_count: number | null
          out_of_stock_count: number | null
          partial_stock_count: number | null
          session_name: string
          total_items: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          in_stock_count?: number | null
          match_results?: Json | null
          matched_count?: number | null
          out_of_stock_count?: number | null
          partial_stock_count?: number | null
          session_name: string
          total_items?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          in_stock_count?: number | null
          match_results?: Json | null
          matched_count?: number | null
          out_of_stock_count?: number | null
          partial_stock_count?: number | null
          session_name?: string
          total_items?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      market_credit_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          link_ids: string[] | null
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
          supplier_name: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          link_ids?: string[] | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          supplier_name: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          link_ids?: string[] | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          supplier_name?: string
          user_id?: string
        }
        Relationships: []
      }
      market_item_costs: {
        Row: {
          asin: string
          created_at: string
          id: string
          sku: string | null
          source: string
          supplier_name: string | null
          title: string | null
          unit_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          sku?: string | null
          source?: string
          supplier_name?: string | null
          title?: string | null
          unit_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          sku?: string | null
          source?: string
          supplier_name?: string | null
          title?: string | null
          unit_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_purchase_items: {
        Row: {
          asin: string | null
          bill_reconciliation_id: string | null
          country: string | null
          created_at: string
          id: string
          platform: string
          purchase_id: string
          quantity: number
          sku: string | null
          title: string | null
          total_cost: number | null
          unit_cost: number
          user_id: string
        }
        Insert: {
          asin?: string | null
          bill_reconciliation_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          platform?: string
          purchase_id: string
          quantity?: number
          sku?: string | null
          title?: string | null
          total_cost?: number | null
          unit_cost?: number
          user_id: string
        }
        Update: {
          asin?: string | null
          bill_reconciliation_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          platform?: string
          purchase_id?: string
          quantity?: number
          sku?: string | null
          title?: string | null
          total_cost?: number | null
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bill_reconciliation"
            columns: ["bill_reconciliation_id"]
            isOneToOne: false
            referencedRelation: "supplier_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "market_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      market_purchase_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          items: Json
          link_token: string
          platform: string | null
          purchase_id: string | null
          supplier_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          link_token?: string
          platform?: string | null
          purchase_id?: string | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          link_token?: string
          platform?: string | null
          purchase_id?: string | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_purchase_links_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "market_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_purchase_links_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      market_purchases: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          platform: string
          purchase_date: string
          status: string
          supplier_id: string | null
          total_estimated_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          platform?: string
          purchase_date?: string
          status?: string
          supplier_id?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          platform?: string
          purchase_date?: string
          status?: string
          supplier_id?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      non_source_items: {
        Row: {
          asin: string | null
          country: string
          created_at: string
          id: string
          marked_at: string
          reason: string | null
          serial_number: string | null
          sku: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          country?: string
          created_at?: string
          id?: string
          marked_at?: string
          reason?: string | null
          serial_number?: string | null
          sku?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          country?: string
          created_at?: string
          id?: string
          marked_at?: string
          reason?: string | null
          serial_number?: string | null
          sku?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
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
      noon_order_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_message: string
          event_type: string
          id: string
          noon_order_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_message: string
          event_type: string
          id?: string
          noon_order_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_message?: string
          event_type?: string
          id?: string
          noon_order_id?: string
          user_id?: string
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
          noon_store_id: string | null
          order_country_code: string | null
          order_nr: string
          order_received_at: string | null
          order_status: string | null
          parent_sku: string | null
          partner_sku: string | null
          pbarcodes: string | null
          purchase_item_nr: string
          quantity: number | null
          selected_store_id: string | null
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
          noon_store_id?: string | null
          order_country_code?: string | null
          order_nr: string
          order_received_at?: string | null
          order_status?: string | null
          parent_sku?: string | null
          partner_sku?: string | null
          pbarcodes?: string | null
          purchase_item_nr: string
          quantity?: number | null
          selected_store_id?: string | null
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
          noon_store_id?: string | null
          order_country_code?: string | null
          order_nr?: string
          order_received_at?: string | null
          order_status?: string | null
          parent_sku?: string | null
          partner_sku?: string | null
          pbarcodes?: string | null
          purchase_item_nr?: string
          quantity?: number | null
          selected_store_id?: string | null
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
            foreignKeyName: "noon_orders_noon_store_id_fkey"
            columns: ["noon_store_id"]
            isOneToOne: false
            referencedRelation: "noon_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noon_orders_selected_store_id_fkey"
            columns: ["selected_store_id"]
            isOneToOne: false
            referencedRelation: "noon_stores_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noon_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      noon_processing_orders: {
        Row: {
          brand_code: string | null
          created_at: string
          file_name: string | null
          file_upload_date: string | null
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
          purchase_item_nr: string
          quantity: number | null
          selected_store_id: string | null
          shipment_created_at: string | null
          shipment_created_by: string | null
          shipment_nr: string | null
          shipment_user: string | null
          size: string | null
          sku: string | null
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
          file_upload_date?: string | null
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
          purchase_item_nr: string
          quantity?: number | null
          selected_store_id?: string | null
          shipment_created_at?: string | null
          shipment_created_by?: string | null
          shipment_nr?: string | null
          shipment_user?: string | null
          size?: string | null
          sku?: string | null
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
          file_upload_date?: string | null
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
          purchase_item_nr?: string
          quantity?: number | null
          selected_store_id?: string | null
          shipment_created_at?: string | null
          shipment_created_by?: string | null
          shipment_nr?: string | null
          shipment_user?: string | null
          size?: string | null
          sku?: string | null
          target_ready_at?: string | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      noon_stores: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
          partner_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          name: string
          partner_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          partner_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      noon_stores_config: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          partner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          partner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          partner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      po_group_members: {
        Row: {
          added_at: string | null
          group_id: string
          id: string
          po_id: string
        }
        Insert: {
          added_at?: string | null
          group_id: string
          id?: string
          po_id: string
        }
        Update: {
          added_at?: string | null
          group_id?: string
          id?: string
          po_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "po_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_group_members_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "po_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      po_groups: {
        Row: {
          country: string | null
          created_at: string | null
          description: string | null
          group_name: string
          id: string
          priority: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          group_name: string
          id?: string
          priority?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          group_name?: string
          id?: string
          priority?: number | null
          status?: string | null
          updated_at?: string | null
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
          batch_id: string | null
          country: string | null
          created_at: string
          currency: string | null
          expected_delivery: string | null
          external_id: string | null
          external_id_type: string | null
          file_name: string
          id: string
          is_printed: boolean
          item_key: string | null
          job_id: string | null
          label_printed_at: string | null
          model_number: string | null
          notes: string | null
          order_date: string | null
          po_key: string | null
          po_number: string
          printed_quantity: number
          priority: number | null
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
          batch_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          expected_delivery?: string | null
          external_id?: string | null
          external_id_type?: string | null
          file_name: string
          id?: string
          is_printed?: boolean
          item_key?: string | null
          job_id?: string | null
          label_printed_at?: string | null
          model_number?: string | null
          notes?: string | null
          order_date?: string | null
          po_key?: string | null
          po_number: string
          printed_quantity?: number
          priority?: number | null
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
          batch_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          expected_delivery?: string | null
          external_id?: string | null
          external_id_type?: string | null
          file_name?: string
          id?: string
          is_printed?: boolean
          item_key?: string | null
          job_id?: string | null
          label_printed_at?: string | null
          model_number?: string | null
          notes?: string | null
          order_date?: string | null
          po_key?: string | null
          po_number?: string
          printed_quantity?: number
          priority?: number | null
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
      po_status_history: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          po_number: string
          po_order_id: string
          previous_status: string | null
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          po_number: string
          po_order_id: string
          previous_status?: string | null
          user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          po_number?: string
          po_order_id?: string
          previous_status?: string | null
          user_id?: string
        }
        Relationships: []
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
          picked_from_bin: boolean
          previous_stock: number | null
          processed_at: string
          quantity_processed: number
          serial_number: string | null
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
          picked_from_bin?: boolean
          previous_stock?: number | null
          processed_at?: string
          quantity_processed?: number
          serial_number?: string | null
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
          picked_from_bin?: boolean
          previous_stock?: number | null
          processed_at?: string
          quantity_processed?: number
          serial_number?: string | null
          sku?: string | null
          source_file?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_barcodes: {
        Row: {
          asin: string | null
          barcode: string
          barcode_type: string | null
          created_at: string
          id: string
          model_number: string | null
          po_order_id: string | null
          sku_code: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          barcode: string
          barcode_type?: string | null
          created_at?: string
          id?: string
          model_number?: string | null
          po_order_id?: string | null
          sku_code?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          barcode?: string
          barcode_type?: string | null
          created_at?: string
          id?: string
          model_number?: string | null
          po_order_id?: string | null
          sku_code?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_barcodes_po_order_id_fkey"
            columns: ["po_order_id"]
            isOneToOne: false
            referencedRelation: "po_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          asin: string
          created_at: string
          id: string
          image_name: string | null
          image_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          image_name?: string | null
          image_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          image_name?: string | null
          image_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_listings: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          listed_at: string | null
          listing_data: Json | null
          platform: string
          platform_product_id: string | null
          platform_sku: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          sunsky_product_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          listed_at?: string | null
          listing_data?: Json | null
          platform: string
          platform_product_id?: string | null
          platform_sku?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          sunsky_product_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          listed_at?: string | null
          listing_data?: Json | null
          platform?: string
          platform_product_id?: string | null
          platform_sku?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          sunsky_product_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_listings_sunsky_product_id_fkey"
            columns: ["sunsky_product_id"]
            isOneToOne: false
            referencedRelation: "sunsky_products"
            referencedColumns: ["id"]
          },
        ]
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
          sunsky_recheck_after_days: number | null
          sunsky_skip_not_found: boolean | null
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
          sunsky_recheck_after_days?: number | null
          sunsky_skip_not_found?: boolean | null
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
          sunsky_recheck_after_days?: number | null
          sunsky_skip_not_found?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string
          items: Json
          link_id: string | null
          notes: string | null
          status: string
          subtotal: number | null
          supplier_name: string | null
          supplier_order_number: string | null
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          items?: Json
          link_id?: string | null
          notes?: string | null
          status?: string
          subtotal?: number | null
          supplier_name?: string | null
          supplier_order_number?: string | null
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          items?: Json
          link_id?: string | null
          notes?: string | null
          status?: string
          subtotal?: number | null
          supplier_name?: string | null
          supplier_order_number?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "purchase_links"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_link_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          link_id: string | null
          user_agent: string | null
          user_id: string | null
          vendor_email: string | null
          vendor_name: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          link_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          vendor_email?: string | null
          vendor_name?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          link_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          vendor_email?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_link_activity_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "purchase_links"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_links: {
        Row: {
          access_count: number | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          link_token: string
          metadata: Json | null
          password_hash: string | null
          po_numbers: string[]
          po_order_ids: string[] | null
          title: string | null
          total_updates_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          link_token: string
          metadata?: Json | null
          password_hash?: string | null
          po_numbers: string[]
          po_order_ids?: string[] | null
          title?: string | null
          total_updates_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          link_token?: string
          metadata?: Json | null
          password_hash?: string | null
          po_numbers?: string[]
          po_order_ids?: string[] | null
          title?: string | null
          total_updates_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_updates: {
        Row: {
          asin: string | null
          created_at: string
          estimated_delivery: string | null
          estimated_delivery_date: string | null
          id: string
          link_id: string
          metadata: Json | null
          model_number: string | null
          notes: string | null
          po_number: string
          po_order_id: string | null
          purchased_quantity: number | null
          sku_code: string | null
          supplier_name: string | null
          supplier_order_number: string | null
          title: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          updated_by_email: string | null
          updated_by_name: string | null
          vendor_email: string | null
          vendor_name: string | null
        }
        Insert: {
          asin?: string | null
          created_at?: string
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          link_id: string
          metadata?: Json | null
          model_number?: string | null
          notes?: string | null
          po_number: string
          po_order_id?: string | null
          purchased_quantity?: number | null
          sku_code?: string | null
          supplier_name?: string | null
          supplier_order_number?: string | null
          title?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          updated_by_email?: string | null
          updated_by_name?: string | null
          vendor_email?: string | null
          vendor_name?: string | null
        }
        Update: {
          asin?: string | null
          created_at?: string
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          link_id?: string
          metadata?: Json | null
          model_number?: string | null
          notes?: string | null
          po_number?: string
          po_order_id?: string | null
          purchased_quantity?: number | null
          sku_code?: string | null
          supplier_name?: string | null
          supplier_order_number?: string | null
          title?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          updated_by_email?: string | null
          updated_by_name?: string | null
          vendor_email?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_updates_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "purchase_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_updates_po_order_id_fkey"
            columns: ["po_order_id"]
            isOneToOne: false
            referencedRelation: "po_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_history: {
        Row: {
          asin: string | null
          created_at: string | null
          destination_details: Json | null
          destination_type: string
          error_message: string | null
          id: string
          model_number: string | null
          printed: boolean | null
          printer_name: string | null
          quantity: number
          serial_number: string | null
          sku_code: string | null
          success: boolean | null
          supplier_name: string | null
          template_type: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          asin?: string | null
          created_at?: string | null
          destination_details?: Json | null
          destination_type: string
          error_message?: string | null
          id?: string
          model_number?: string | null
          printed?: boolean | null
          printer_name?: string | null
          quantity: number
          serial_number?: string | null
          sku_code?: string | null
          success?: boolean | null
          supplier_name?: string | null
          template_type?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          asin?: string | null
          created_at?: string | null
          destination_details?: Json | null
          destination_type?: string
          error_message?: string | null
          id?: string
          model_number?: string | null
          printed?: boolean | null
          printer_name?: string | null
          quantity?: number
          serial_number?: string | null
          sku_code?: string | null
          success?: boolean | null
          supplier_name?: string | null
          template_type?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      replenishment_calculation_configs: {
        Row: {
          calculation_method: string
          config_name: string
          country: string
          created_at: string | null
          custom_formula: string | null
          exclude_first_n_days: number | null
          fast_moving_multiplier: number | null
          id: string
          include_manual_adjustments: boolean | null
          include_po_restocks: boolean | null
          include_returns: boolean | null
          include_sales: boolean
          is_default: boolean | null
          lead_time_days: number | null
          lookback_days: number | null
          manual_adjustment_weight: number | null
          max_order_quantity: number | null
          medium_moving_multiplier: number | null
          min_order_quantity: number | null
          notes: string | null
          po_restock_weight: number | null
          return_weight: number | null
          round_to_multiple: number | null
          safety_stock_days: number | null
          sales_weight: number
          slow_moving_multiplier: number | null
          updated_at: string | null
          use_velocity_multiplier: boolean | null
          user_id: string
        }
        Insert: {
          calculation_method?: string
          config_name: string
          country?: string
          created_at?: string | null
          custom_formula?: string | null
          exclude_first_n_days?: number | null
          fast_moving_multiplier?: number | null
          id?: string
          include_manual_adjustments?: boolean | null
          include_po_restocks?: boolean | null
          include_returns?: boolean | null
          include_sales?: boolean
          is_default?: boolean | null
          lead_time_days?: number | null
          lookback_days?: number | null
          manual_adjustment_weight?: number | null
          max_order_quantity?: number | null
          medium_moving_multiplier?: number | null
          min_order_quantity?: number | null
          notes?: string | null
          po_restock_weight?: number | null
          return_weight?: number | null
          round_to_multiple?: number | null
          safety_stock_days?: number | null
          sales_weight?: number
          slow_moving_multiplier?: number | null
          updated_at?: string | null
          use_velocity_multiplier?: boolean | null
          user_id: string
        }
        Update: {
          calculation_method?: string
          config_name?: string
          country?: string
          created_at?: string | null
          custom_formula?: string | null
          exclude_first_n_days?: number | null
          fast_moving_multiplier?: number | null
          id?: string
          include_manual_adjustments?: boolean | null
          include_po_restocks?: boolean | null
          include_returns?: boolean | null
          include_sales?: boolean
          is_default?: boolean | null
          lead_time_days?: number | null
          lookback_days?: number | null
          manual_adjustment_weight?: number | null
          max_order_quantity?: number | null
          medium_moving_multiplier?: number | null
          min_order_quantity?: number | null
          notes?: string | null
          po_restock_weight?: number | null
          return_weight?: number | null
          round_to_multiple?: number | null
          safety_stock_days?: number | null
          sales_weight?: number
          slow_moving_multiplier?: number | null
          updated_at?: string | null
          use_velocity_multiplier?: boolean | null
          user_id?: string
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
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      serial_number_counter: {
        Row: {
          next_serial: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          next_serial?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          next_serial?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shipped_orders: {
        Row: {
          asin: string
          created_at: string
          file_name: string | null
          id: string
          quantity: number
          sku: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          file_name?: string | null
          id?: string
          quantity?: number
          sku?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          file_name?: string | null
          id?: string
          quantity?: number
          sku?: string | null
          title?: string | null
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
          first_stock_added_at: string | null
          id: string
          last_restock_date: string | null
          manual_restock_override: boolean | null
          notes: string | null
          quantity: number
          restock_date: string | null
          restock_quantity: number | null
          sku_number: string
          status: string
          title: string | null
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
          first_stock_added_at?: string | null
          id?: string
          last_restock_date?: string | null
          manual_restock_override?: boolean | null
          notes?: string | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          sku_number: string
          status?: string
          title?: string | null
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
          first_stock_added_at?: string | null
          id?: string
          last_restock_date?: string | null
          manual_restock_override?: boolean | null
          notes?: string | null
          quantity?: number
          restock_date?: string | null
          restock_quantity?: number | null
          sku_number?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sku_match_patterns: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          last_used_at: string
          po_sku_pattern: string
          sunsky_sku_pattern: string
          times_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score: number
          created_at?: string
          id?: string
          last_used_at?: string
          po_sku_pattern: string
          sunsky_sku_pattern: string
          times_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_used_at?: string
          po_sku_pattern?: string
          sunsky_sku_pattern?: string
          times_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_changes: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          asin: string | null
          batch_id: string | null
          change_amount: number
          change_reason: string | null
          changed_by: string | null
          cost_per_unit: number | null
          created_at: string
          fulfillment_source: string | null
          id: string
          inventory_id: string
          inventory_type: string
          is_reverted: boolean | null
          metadata: Json | null
          new_quantity: number
          notes: string | null
          previous_quantity: number
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          reverted_at: string | null
          reverted_by: string | null
          serial_number: string | null
          sku_number: string | null
          source_type: Database["public"]["Enums"]["stock_change_source"] | null
          tags: string[] | null
          total_value: number | null
          user_id: string
          warehouse_location: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asin?: string | null
          batch_id?: string | null
          change_amount: number
          change_reason?: string | null
          changed_by?: string | null
          cost_per_unit?: number | null
          created_at?: string
          fulfillment_source?: string | null
          id?: string
          inventory_id: string
          inventory_type: string
          is_reverted?: boolean | null
          metadata?: Json | null
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          serial_number?: string | null
          sku_number?: string | null
          source_type?:
            | Database["public"]["Enums"]["stock_change_source"]
            | null
          tags?: string[] | null
          total_value?: number | null
          user_id: string
          warehouse_location?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asin?: string | null
          batch_id?: string | null
          change_amount?: number
          change_reason?: string | null
          changed_by?: string | null
          cost_per_unit?: number | null
          created_at?: string
          fulfillment_source?: string | null
          id?: string
          inventory_id?: string
          inventory_type?: string
          is_reverted?: boolean | null
          metadata?: Json | null
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          serial_number?: string | null
          sku_number?: string | null
          source_type?:
            | Database["public"]["Enums"]["stock_change_source"]
            | null
          tags?: string[] | null
          total_value?: number | null
          user_id?: string
          warehouse_location?: string | null
        }
        Relationships: []
      }
      stock_receiving_items: {
        Row: {
          asin: string | null
          created_at: string | null
          error_message: string | null
          has_pending_po: boolean | null
          id: string
          matched_pos: Json | null
          model_number: string | null
          quantity_added_to_inventory: number | null
          quantity_allocated_to_pos: number | null
          quantity_received: number
          receiving_notes: string | null
          serial_number: string | null
          session_id: string
          sku_code: string | null
          status: string | null
          supplier_name: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asin?: string | null
          created_at?: string | null
          error_message?: string | null
          has_pending_po?: boolean | null
          id?: string
          matched_pos?: Json | null
          model_number?: string | null
          quantity_added_to_inventory?: number | null
          quantity_allocated_to_pos?: number | null
          quantity_received: number
          receiving_notes?: string | null
          serial_number?: string | null
          session_id: string
          sku_code?: string | null
          status?: string | null
          supplier_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asin?: string | null
          created_at?: string | null
          error_message?: string | null
          has_pending_po?: boolean | null
          id?: string
          matched_pos?: Json | null
          model_number?: string | null
          quantity_added_to_inventory?: number | null
          quantity_allocated_to_pos?: number | null
          quantity_received?: number
          receiving_notes?: string | null
          serial_number?: string | null
          session_id?: string
          sku_code?: string | null
          status?: string | null
          supplier_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receiving_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stock_receiving_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receiving_sessions: {
        Row: {
          created_at: string | null
          id: string
          items_added_to_inventory: number | null
          items_allocated_to_pos: number | null
          notes: string | null
          session_date: string | null
          status: string | null
          total_items_received: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          items_added_to_inventory?: number | null
          items_allocated_to_pos?: number | null
          notes?: string | null
          session_date?: string | null
          status?: string | null
          total_items_received?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          items_added_to_inventory?: number | null
          items_allocated_to_pos?: number | null
          notes?: string | null
          session_date?: string | null
          status?: string | null
          total_items_received?: number | null
          updated_at?: string | null
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
      sunsky_categories: {
        Row: {
          code: string | null
          created_at: string
          gmt_modified: string | null
          hs_code: string | null
          id: string
          name: string
          parent_id: number | null
          short_name: string | null
          status: number | null
          sunsky_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          gmt_modified?: string | null
          hs_code?: string | null
          id?: string
          name: string
          parent_id?: number | null
          short_name?: string | null
          status?: number | null
          sunsky_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          gmt_modified?: string | null
          hs_code?: string | null
          id?: string
          name?: string
          parent_id?: number | null
          short_name?: string | null
          status?: number | null
          sunsky_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sunsky_credentials: {
        Row: {
          api_key: string | null
          api_key_encrypted: string | null
          api_secret: string | null
          api_secret_encrypted: string | null
          created_at: string
          id: string
          is_active: boolean
          key_last4: string | null
          last_tested: string | null
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          api_key_encrypted?: string | null
          api_secret?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_last4?: string | null
          last_tested?: string | null
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          api_key_encrypted?: string | null
          api_secret?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_last4?: string | null
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
      sunsky_not_found_skus: {
        Row: {
          created_at: string | null
          id: string
          last_search_date: string | null
          model_number: string
          notes: string | null
          search_attempts: number | null
          skip_until: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_search_date?: string | null
          model_number: string
          notes?: string | null
          search_attempts?: number | null
          skip_until?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_search_date?: string | null
          model_number?: string
          notes?: string | null
          search_attempts?: number | null
          skip_until?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      sunsky_order_items_new: {
        Row: {
          amount: number | null
          created_at: string
          delay_to_ship: boolean | null
          id: string
          item_no: string
          quantity: number
          remark: string | null
          scanned: boolean | null
          sunsky_order_id: string | null
          sunsky_order_number: string
          sunsky_product_id: string | null
          title: string | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          delay_to_ship?: boolean | null
          id?: string
          item_no: string
          quantity: number
          remark?: string | null
          scanned?: boolean | null
          sunsky_order_id?: string | null
          sunsky_order_number: string
          sunsky_product_id?: string | null
          title?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          delay_to_ship?: boolean | null
          id?: string
          item_no?: string
          quantity?: number
          remark?: string | null
          scanned?: boolean | null
          sunsky_order_id?: string | null
          sunsky_order_number?: string
          sunsky_product_id?: string | null
          title?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunsky_order_items_new_sunsky_order_id_fkey"
            columns: ["sunsky_order_id"]
            isOneToOne: false
            referencedRelation: "sunsky_orders_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sunsky_order_items_new_sunsky_product_id_fkey"
            columns: ["sunsky_product_id"]
            isOneToOne: false
            referencedRelation: "sunsky_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sunsky_orders: {
        Row: {
          created_at: string
          currency: string | null
          gmt_created: string | null
          gmt_paid: string | null
          gmt_shipped: string | null
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
          gmt_paid?: string | null
          gmt_shipped?: string | null
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
          gmt_paid?: string | null
          gmt_shipped?: string | null
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
      sunsky_orders_new: {
        Row: {
          amount: number | null
          created_at: string
          delivery_address: Json | null
          gmt_created: string | null
          gmt_paid: string | null
          gmt_shipped: string | null
          id: string
          raw_data: Json | null
          shipping_cost: number | null
          shipping_way_id: number | null
          shipping_way_name: string | null
          site_number: string | null
          status: Database["public"]["Enums"]["sunsky_order_status"] | null
          sunsky_order_number: string
          tax_amount: number | null
          total_amount: number | null
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          delivery_address?: Json | null
          gmt_created?: string | null
          gmt_paid?: string | null
          gmt_shipped?: string | null
          id?: string
          raw_data?: Json | null
          shipping_cost?: number | null
          shipping_way_id?: number | null
          shipping_way_name?: string | null
          site_number?: string | null
          status?: Database["public"]["Enums"]["sunsky_order_status"] | null
          sunsky_order_number: string
          tax_amount?: number | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          delivery_address?: Json | null
          gmt_created?: string | null
          gmt_paid?: string | null
          gmt_shipped?: string | null
          id?: string
          raw_data?: Json | null
          shipping_cost?: number | null
          shipping_way_id?: number | null
          shipping_way_name?: string | null
          site_number?: string | null
          status?: Database["public"]["Enums"]["sunsky_order_status"] | null
          sunsky_order_number?: string
          tax_amount?: number | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sunsky_product_images: {
        Row: {
          created_at: string
          download_error: string | null
          download_status: string
          id: string
          image_order: number
          image_type: string
          image_url: string
          item_no: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          download_error?: string | null
          download_status?: string
          id?: string
          image_order?: number
          image_type?: string
          image_url: string
          item_no: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          download_error?: string | null
          download_status?: string
          id?: string
          image_order?: number
          image_type?: string
          image_url?: string
          item_no?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sunsky_products: {
        Row: {
          barcode: string | null
          brand_name: string | null
          category_id: number | null
          clearance: boolean | null
          contains_battery: boolean | null
          created_at: string
          description: string | null
          gmt_listed: string | null
          gmt_modified: string | null
          group_item_no: string | null
          id: string
          item_no: string
          lead_time: string | null
          moq: number | null
          name: string | null
          oem: boolean | null
          org_price: number | null
          pack_qty: number | null
          pack_weight: number | null
          pic_count: number | null
          price: number | null
          raw_data: Json | null
          status: Database["public"]["Enums"]["sunsky_product_status"] | null
          stock: number | null
          sunsky_id: number
          unit_height: number | null
          unit_length: number | null
          unit_weight: number | null
          unit_width: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          warehouse: string | null
          with_logo: boolean | null
        }
        Insert: {
          barcode?: string | null
          brand_name?: string | null
          category_id?: number | null
          clearance?: boolean | null
          contains_battery?: boolean | null
          created_at?: string
          description?: string | null
          gmt_listed?: string | null
          gmt_modified?: string | null
          group_item_no?: string | null
          id?: string
          item_no: string
          lead_time?: string | null
          moq?: number | null
          name?: string | null
          oem?: boolean | null
          org_price?: number | null
          pack_qty?: number | null
          pack_weight?: number | null
          pic_count?: number | null
          price?: number | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["sunsky_product_status"] | null
          stock?: number | null
          sunsky_id: number
          unit_height?: number | null
          unit_length?: number | null
          unit_weight?: number | null
          unit_width?: number | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          warehouse?: string | null
          with_logo?: boolean | null
        }
        Update: {
          barcode?: string | null
          brand_name?: string | null
          category_id?: number | null
          clearance?: boolean | null
          contains_battery?: boolean | null
          created_at?: string
          description?: string | null
          gmt_listed?: string | null
          gmt_modified?: string | null
          group_item_no?: string | null
          id?: string
          item_no?: string
          lead_time?: string | null
          moq?: number | null
          name?: string | null
          oem?: boolean | null
          org_price?: number | null
          pack_qty?: number | null
          pack_weight?: number | null
          pic_count?: number | null
          price?: number | null
          raw_data?: Json | null
          status?: Database["public"]["Enums"]["sunsky_product_status"] | null
          stock?: number | null
          sunsky_id?: number
          unit_height?: number | null
          unit_length?: number | null
          unit_weight?: number | null
          unit_width?: number | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          warehouse?: string | null
          with_logo?: boolean | null
        }
        Relationships: []
      }
      sunsky_skus: {
        Row: {
          cost: number | null
          country: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_count: number | null
          images_download_date: string | null
          images_downloaded: boolean | null
          product_data: Json | null
          sku_code: string
          thumbnail_url: string | null
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
          image_count?: number | null
          images_download_date?: string | null
          images_downloaded?: boolean | null
          product_data?: Json | null
          sku_code: string
          thumbnail_url?: string | null
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
          image_count?: number | null
          images_download_date?: string | null
          images_downloaded?: boolean | null
          product_data?: Json | null
          sku_code?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      supplier_bills: {
        Row: {
          bill_date: string
          bill_reference: string | null
          created_at: string
          currency: string
          id: string
          linked_items: Json | null
          notes: string | null
          reconciled_at: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_date?: string
          bill_reference?: string | null
          created_at?: string
          currency?: string
          id?: string
          linked_items?: Json | null
          notes?: string | null
          reconciled_at?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_date?: string
          bill_reference?: string | null
          created_at?: string
          currency?: string
          id?: string
          linked_items?: Json | null
          notes?: string | null
          reconciled_at?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          contact_name: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          notes: string | null
          phone_number: string | null
          position: string | null
          supplier_id: string
          updated_at: string
          user_id: string
          wechat_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone_number?: string | null
          position?: string | null
          supplier_id: string
          updated_at?: string
          user_id: string
          wechat_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone_number?: string | null
          position?: string | null
          supplier_id?: string
          updated_at?: string
          user_id?: string
          wechat_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          average_delivery_days: number | null
          business_type: string | null
          company_name: string | null
          contact_person: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          lead_time_days: number | null
          minimum_order_quantity: number | null
          notes: string | null
          payment_terms: string | null
          phone_number: string | null
          product_categories: Json | null
          profile_link: string | null
          rating: number | null
          supplier_name: string
          tags: Json | null
          total_orders: number | null
          updated_at: string
          user_id: string
          website_url: string | null
          wechat_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          average_delivery_days?: number | null
          business_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          country: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          notes?: string | null
          payment_terms?: string | null
          phone_number?: string | null
          product_categories?: Json | null
          profile_link?: string | null
          rating?: number | null
          supplier_name: string
          tags?: Json | null
          total_orders?: number | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          average_delivery_days?: number | null
          business_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          notes?: string | null
          payment_terms?: string | null
          phone_number?: string | null
          product_categories?: Json | null
          profile_link?: string | null
          rating?: number | null
          supplier_name?: string
          tags?: Json | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_modified_at: string | null
          last_sync_at: string | null
          status: string | null
          sync_type: string
          total_records: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_modified_at?: string | null
          last_sync_at?: string | null
          status?: string | null
          sync_type: string
          total_records?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_modified_at?: string | null
          last_sync_at?: string | null
          status?: string | null
          sync_type?: string
          total_records?: number | null
          updated_at?: string
          user_id?: string
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
      taxonomy_events: {
        Row: {
          action_name: string | null
          category: string
          component_name: string | null
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          metadata: Json | null
          page_route: string
          page_title: string | null
          session_id: string
          subcategory: string
          tab_id: string | null
          tab_title: string | null
          user_id: string | null
        }
        Insert: {
          action_name?: string | null
          category: string
          component_name?: string | null
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_route: string
          page_title?: string | null
          session_id: string
          subcategory: string
          tab_id?: string | null
          tab_title?: string | null
          user_id?: string | null
        }
        Update: {
          action_name?: string | null
          category?: string
          component_name?: string | null
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_route?: string
          page_title?: string | null
          session_id?: string
          subcategory?: string
          tab_id?: string | null
          tab_title?: string | null
          user_id?: string | null
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
      user_page_permissions: {
        Row: {
          created_at: string | null
          id: string
          page_route: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_route: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_route?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      velocity_history: {
        Row: {
          actual_ordered: number | null
          confidence_score: number | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          manual_override: number | null
          override_reason: string | null
          system_recommendation: number
          user_id: string
          velocity_at_time: number | null
        }
        Insert: {
          actual_ordered?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          item_id: string
          item_type?: string
          manual_override?: number | null
          override_reason?: string | null
          system_recommendation: number
          user_id: string
          velocity_at_time?: number | null
        }
        Update: {
          actual_ordered?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          manual_override?: number | null
          override_reason?: string | null
          system_recommendation?: number
          user_id?: string
          velocity_at_time?: number | null
        }
        Relationships: []
      }
      velocity_quantity_overrides: {
        Row: {
          asin_id: string
          created_at: string | null
          id: string
          notes: string | null
          recommended_quantity: number
          system_recommendation: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asin_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recommended_quantity: number
          system_recommendation: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asin_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recommended_quantity?: number
          system_recommendation?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "velocity_quantity_overrides_asin_id_fkey"
            columns: ["asin_id"]
            isOneToOne: false
            referencedRelation: "asin_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      velocity_settings: {
        Row: {
          country: string
          created_at: string
          id: string
          lead_time_days: number
          max_order_quantity: number
          min_order_quantity: number
          safety_stock_enabled: boolean
          service_level_factor: number
          trend_sensitivity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          lead_time_days?: number
          max_order_quantity?: number
          min_order_quantity?: number
          safety_stock_enabled?: boolean
          service_level_factor?: number
          trend_sensitivity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          lead_time_days?: number
          max_order_quantity?: number
          min_order_quantity?: number
          safety_stock_enabled?: boolean
          service_level_factor?: number
          trend_sensitivity?: number
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
      cleanup_po_duplicates: { Args: never; Returns: number }
      count_restock_eligible_items: {
        Args: { country_filter: string }
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
          batch_id: string | null
          country: string | null
          created_at: string
          currency: string | null
          expected_delivery: string | null
          external_id: string | null
          external_id_type: string | null
          file_name: string
          id: string
          is_printed: boolean
          item_key: string | null
          job_id: string | null
          label_printed_at: string | null
          model_number: string | null
          notes: string | null
          order_date: string | null
          po_key: string | null
          po_number: string
          printed_quantity: number
          priority: number | null
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
        SetofOptions: {
          from: "*"
          to: "po_orders"
          isOneToOne: false
          isSetofReturn: true
        }
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
        Args: never
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
      get_comprehensive_performance_analysis: {
        Args: { country_filter?: string }
        Returns: {
          asin: string
          avg_days_to_sellout: number
          current_quantity: number
          days_in_inventory: number
          first_sale_date: string
          first_stock_date: string
          item_id: string
          last_sale_date: string
          performance_category: string
          performance_score: number
          sales_velocity_30d: number
          sales_velocity_7d: number
          sales_velocity_90d: number
          sales_velocity_lifetime: number
          sku: string
          stock_days_remaining: number
          title: string
          total_units_restocked: number
          total_units_sold_lifetime: number
          turnover_ratio: number
        }[]
      }
      get_cost_dates_for_asins: {
        Args: { p_asins: string[]; p_user_id: string }
        Returns: {
          asin: string
          unit_cost: number
          updated_at: string
        }[]
      }
      get_daily_sold_items_needing_orders: {
        Args: { country_filter?: string; target_date?: string }
        Returns: {
          asin: string
          inventory_id: string
          order_status: string
          ordered_at: string
          recommended_quantity: number
          remaining_stock: number
          sku: string
          sold_today: number
          sunsky_order_number: string
          title: string
          velocity_score: number
        }[]
      }
      get_exchange_rate: {
        Args: { from_currency: string; to_currency: string }
        Returns: number
      }
      get_inventory_metrics: {
        Args: { p_country: string; p_user_id: string }
        Returns: Json
      }
      get_inventory_velocity_analysis: {
        Args: { country_filter?: string; lookback_days?: number }
        Returns: {
          average_days_between_sales: number
          current_quantity: number
          days_since_last_restock: number
          days_since_last_sale: number
          identifier: string
          item_id: string
          recommended_reorder_quantity: number
          reorder_point: number
          sales_velocity: number
          stock_days_remaining: number
          table_name: string
          total_sales: number
          urgency_score: number
          velocity_category: string
        }[]
      }
      get_items_needing_replenishment: {
        Args: { country_filter?: string; lookback_days?: number }
        Returns: {
          asin: string
          current_quantity: number
          days_since_last_restock: number
          identifier: string
          item_id: string
          last_restock_quantity: number
          recommended_order_quantity: number
          replenishment_reason: string
          sku: string
          status: string
          table_name: string
          units_sold_since_restock: number
          urgency_level: string
        }[]
      }
      get_items_needing_restock:
        | {
            Args: never
            Returns: {
              current_quantity: number
              days_since_last_restock: number
              identifier: string
              item_id: string
              table_name: string
            }[]
          }
        | {
            Args: { country_filter?: string }
            Returns: {
              current_quantity: number
              days_since_last_restock: number
              identifier: string
              item_id: string
              status: string
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
      get_next_serial_number: { Args: { p_user_id: string }; Returns: string }
      get_next_serial_numbers_batch: {
        Args: { p_count: number; p_user_id: string }
        Returns: string[]
      }
      get_noon_images_for_skus: {
        Args: { p_skus: string[]; p_user_id: string }
        Returns: {
          image_url: string
          sku: string
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
          po_number: string
          total_line_items: number
        }[]
      }
      get_po_group_summaries: {
        Args: { p_user_id: string }
        Returns: {
          group_id: string
          member_count: number
          po_numbers: string[]
          total_quantity: number
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
      get_product_images_for_asins: {
        Args: { p_asins: string[]; p_user_id: string }
        Returns: {
          asin: string
          image_url: string
        }[]
      }
      get_quarterly_velocity_analysis: {
        Args: { country_filter?: string; lookback_years?: number }
        Returns: {
          asin: string
          asin_id: string
          current_quantity: number
          first_added_date: string
          growth_rate: number
          quarterly_data: Json
          recommended_quantity: number
          serial_number: string
          sku: string
          title: string
          total_added: number
          total_sold: number
          trend_pattern: string
          velocity_score: number
        }[]
      }
      get_replenishment_items_optimized: {
        Args: { lookback_days?: number; p_country?: string; p_user_id: string }
        Returns: {
          asin: string
          date_added: string
          date_sold: string
          eligible_for_restock: boolean
          id: string
          is_non_source: boolean
          last_restock_date: string
          ordered_at: string
          ordered_quantity: number
          quantity: number
          serial_number: string
          sku: string
          status: Database["public"]["Enums"]["inventory_status"]
          title: string
          total_stock_in: number
          total_stock_out: number
        }[]
      }
      get_restock_eligible_item_ids: {
        Args: { country_filter: string }
        Returns: {
          id: string
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
        Args: never
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
      get_suppliers_for_user: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          supplier_name: string
        }[]
      }
      get_unified_velocity_analysis: {
        Args: { country_filter?: string; lookback_days?: number }
        Returns: {
          asin: string
          average_days_between_sales: number
          current_quantity: number
          days_since_last_restock: number
          days_since_last_sale: number
          days_until_stockout: number
          identifier: string
          item_id: string
          quarterly_q1_added: number
          quarterly_q1_sold: number
          quarterly_q2_added: number
          quarterly_q2_sold: number
          quarterly_q3_added: number
          quarterly_q3_sold: number
          quarterly_q4_added: number
          quarterly_q4_sold: number
          recommendation_confidence: number
          recommended_reorder_quantity: number
          reorder_point: number
          safety_stock: number
          sales_velocity: number
          sku: string
          stock_days_remaining: number
          table_name: string
          title: string
          total_sales: number
          urgency_score: number
          velocity_30d: number
          velocity_60d: number
          velocity_90d: number
          velocity_category: string
          velocity_trend: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_sunsky_credentials_secure: {
        Args: never
        Returns: {
          api_key: string
          api_secret: string
          created_at: string
          id: string
          is_active: boolean
          key_last4: string
          last_tested: string
          name: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_admin: { Args: { user_id: string }; Returns: boolean }
      log_security_event: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_record_id?: string
          p_table_name?: string
        }
        Returns: undefined
      }
      remove_all_po_duplicates: {
        Args: { user_id_param: string }
        Returns: {
          affected_po_numbers: string[]
          deleted_count: number
          remaining_count: number
        }[]
      }
      remove_po_duplicates: {
        Args: { po_number_param: string; user_id_param: string }
        Returns: {
          deleted_count: number
          remaining_count: number
        }[]
      }
      update_asin_inventory_status_by_asin: {
        Args: {
          new_status: Database["public"]["Enums"]["inventory_status"]
          target_asin: string
          target_user_id?: string
        }
        Returns: {
          item_details: Json
          updated_count: number
        }[]
      }
      update_asin_inventory_status_by_sku: {
        Args: {
          new_status: Database["public"]["Enums"]["inventory_status"]
          target_sku: string
          target_user_id?: string
        }
        Returns: {
          item_details: Json
          updated_count: number
        }[]
      }
      update_no_stock_statuses: {
        Args: never
        Returns: {
          no_stock_count: number
          still_sold_count: number
          updated_count: number
        }[]
      }
      update_print_eligible_items_by_order_skus: {
        Args: { user_id_param: string }
        Returns: {
          total_unique_skus: number
          updated_active_count: number
          updated_inactive_count: number
        }[]
      }
      update_ungrouped_po_priorities: {
        Args: { user_id_param: string }
        Returns: {
          max_grouped_priority: number
          new_priority: number
          updated_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      country_code: "UAE" | "KSA"
      financial_record_type: "loan" | "expense" | "debt" | "other"
      inventory_status:
        | "in-stock"
        | "sold"
        | "reserved"
        | "damaged"
        | "ordered"
        | "no-stock"
        | "out-of-stock"
      listing_status: "pending" | "listed" | "failed" | "delisted"
      payment_status: "pending" | "partial" | "paid" | "overdue"
      stock_change_source:
        | "manual_adjustment"
        | "po_fulfillment"
        | "customer_sale"
        | "customer_return"
        | "damage_loss"
        | "inventory_correction"
        | "transfer_in"
        | "transfer_out"
        | "sunsky_order"
        | "stock_receiving"
      sunsky_order_status:
        | "unpaid"
        | "paid"
        | "shipped"
        | "cancelled"
        | "delivered"
      sunsky_product_status:
        | "active"
        | "inactive"
        | "out_of_stock"
        | "discontinued"
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
      app_role: ["admin", "user"],
      country_code: ["UAE", "KSA"],
      financial_record_type: ["loan", "expense", "debt", "other"],
      inventory_status: [
        "in-stock",
        "sold",
        "reserved",
        "damaged",
        "ordered",
        "no-stock",
        "out-of-stock",
      ],
      listing_status: ["pending", "listed", "failed", "delisted"],
      payment_status: ["pending", "partial", "paid", "overdue"],
      stock_change_source: [
        "manual_adjustment",
        "po_fulfillment",
        "customer_sale",
        "customer_return",
        "damage_loss",
        "inventory_correction",
        "transfer_in",
        "transfer_out",
        "sunsky_order",
        "stock_receiving",
      ],
      sunsky_order_status: [
        "unpaid",
        "paid",
        "shipped",
        "cancelled",
        "delivered",
      ],
      sunsky_product_status: [
        "active",
        "inactive",
        "out_of_stock",
        "discontinued",
      ],
    },
  },
} as const
