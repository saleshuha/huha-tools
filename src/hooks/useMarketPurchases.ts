import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

export interface MarketPurchaseItem {
  id?: string;
  purchase_id?: string;
  user_id?: string;
  asin?: string;
  sku?: string;
  title?: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
  platform: "amazon" | "noon" | "both";
  country?: string;
  bill_reconciliation_id?: string | null;
  created_at?: string;
}

export interface MarketPurchase {
  id: string;
  user_id: string;
  supplier_id?: string | null;
  purchase_date: string;
  platform: "amazon" | "noon" | "both" | "po";
  status: "draft" | "confirmed" | "reconciled";
  notes?: string | null;
  total_estimated_cost: number;
  created_at: string;
  updated_at: string;
  supplier?: { supplier_name: string; company_name?: string } | null;
  items?: MarketPurchaseItem[];
}

export interface CreateMarketPurchase {
  supplier_id?: string | null;
  purchase_date: string;
  platform: "amazon" | "noon" | "both" | "po";
  notes?: string;
  items: Omit<MarketPurchaseItem, "id" | "purchase_id" | "user_id" | "total_cost" | "created_at">[];
}

export function useMarketPurchases(filters?: {
  supplier_id?: string;
  platform?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}) {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const purchasesQuery = useQuery({
    queryKey: ["market_purchases", profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from("market_purchases")
        .select(`
          *,
          supplier:suppliers(supplier_name, company_name),
          items:market_purchase_items(*)
        `)
        .eq("user_id", profile.id)
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.supplier_id) query = query.eq("supplier_id", filters.supplier_id);
      if (filters?.platform) query = query.eq("platform", filters.platform);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.date_from) query = query.gte("purchase_date", filters.date_from);
      if (filters?.date_to) query = query.lte("purchase_date", filters.date_to);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketPurchase[];
    },
    enabled: !!profile?.id,
  });

  const createPurchase = useMutation({
    mutationFn: async (payload: CreateMarketPurchase) => {
      if (!profile?.id) throw new Error("Not authenticated");

      const { items, ...purchaseData } = payload;

      const { data: purchase, error: purchaseError } = await supabase
        .from("market_purchases")
        .insert({ ...purchaseData, user_id: profile.id, status: "confirmed" })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      if (items.length > 0) {
        const itemsWithIds = items.map((item) => ({
          ...item,
          purchase_id: purchase.id,
          user_id: profile.id,
        }));

        const { error: itemsError } = await supabase
          .from("market_purchase_items")
          .insert(itemsWithIds);

        if (itemsError) throw itemsError;
      }

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_purchases"] });
      toast.success("Purchase logged successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to log purchase: ${error.message}`);
    },
  });

  const updatePurchaseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("market_purchases")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_purchases"] });
    },
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("market_purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_purchases"] });
      toast.success("Purchase deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  return {
    purchases: purchasesQuery.data || [],
    isLoading: purchasesQuery.isLoading,
    createPurchase,
    updatePurchaseStatus,
    deletePurchase,
    refetch: purchasesQuery.refetch,
  };
}
