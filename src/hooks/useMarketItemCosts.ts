import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

export interface MarketItemCost {
  id: string;
  user_id: string;
  asin: string;
  sku: string | null;
  title: string | null;
  unit_cost: number;
  supplier_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export function useMarketItemCosts(search?: string) {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const costsQuery = useQuery({
    queryKey: ["market_item_costs", profile?.id, search],
    queryFn: async () => {
      if (!profile?.id) return [];
      let query = supabase
        .from("market_item_costs")
        .select("*")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false });

      if (search) {
        query = query.or(`asin.ilike.%${search}%,sku.ilike.%${search}%,title.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketItemCost[];
    },
    enabled: !!profile?.id,
  });

  const upsertCost = useMutation({
    mutationFn: async (cost: { asin: string; sku?: string; title?: string; unit_cost: number; supplier_name?: string; source?: string }) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("market_item_costs")
        .upsert(
          { ...cost, user_id: profile.id, source: cost.source || "manual" },
          { onConflict: "user_id,asin" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_item_costs"] });
      toast.success("Cost saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkUpsertCosts = useMutation({
    mutationFn: async (costs: { asin: string; sku?: string; title?: string; unit_cost: number; supplier_name?: string }[]) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const rows = costs.map((c) => ({ ...c, user_id: profile.id, source: "manual" }));
      const { error } = await supabase
        .from("market_item_costs")
        .upsert(rows, { onConflict: "user_id,asin" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["market_item_costs"] });
      toast.success(`${vars.length} costs uploaded`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("market_item_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_item_costs"] });
      toast.success("Cost deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Lookup cost by ASIN
  const getCostByAsin = async (asin: string): Promise<number | null> => {
    if (!profile?.id) return null;
    const { data } = await supabase
      .from("market_item_costs")
      .select("unit_cost")
      .eq("user_id", profile.id)
      .eq("asin", asin)
      .limit(1)
      .single();
    return data?.unit_cost ?? null;
  };

  return {
    costs: costsQuery.data || [],
    isLoading: costsQuery.isLoading,
    upsertCost,
    bulkUpsertCosts,
    deleteCost,
    getCostByAsin,
    refetch: costsQuery.refetch,
  };
}
