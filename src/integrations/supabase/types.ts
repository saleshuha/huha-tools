export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
          user_id?: string
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
      profiles: {
        Row: {
          country: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_main_admin: boolean
          role: string
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
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_items_needing_restock: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          item_id: string
          identifier: string
          current_quantity: number
          days_since_last_restock: number
        }[]
      }
      get_sales_analytics: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          product_type: string
          total_sold: number
          avg_days_to_sell: number
          fastest_selling_item: string
          slowest_selling_item: string
          restock_frequency_days: number
          predicted_restock_needed_items: Json
        }[]
      }
      is_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
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
      inventory_status: ["in-stock", "sold", "reserved", "damaged", "ordered"],
    },
  },
} as const
