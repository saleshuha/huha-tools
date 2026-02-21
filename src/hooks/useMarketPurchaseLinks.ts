import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

export interface MarketLinkItem {
  asin: string;
  sku: string;
  title: string;
  qty: number;
  unit_cost: number;
}

export interface MarketPurchaseLink {
  id: string;
  link_token: string;
  user_id: string;
  purchase_id: string | null;
  title: string | null;
  supplier_id: string | null;
  platform: string;
  items: MarketLinkItem[];
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMarketPurchaseLinks() {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ["market_purchase_links", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("market_purchase_links")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MarketPurchaseLink[];
    },
    enabled: !!profile?.id,
  });

  const createLink = useMutation({
    mutationFn: async (payload: { title?: string; supplier_id?: string; platform?: string; items: MarketLinkItem[] }) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("market_purchase_links")
        .insert({
          user_id: profile.id,
          title: payload.title || `Market Purchase ${new Date().toLocaleDateString()}`,
          supplier_id: payload.supplier_id || null,
          platform: payload.platform || "both",
          items: payload.items as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MarketPurchaseLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_purchase_links"] });
      toast.success("Purchase link created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("market_purchase_links")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_purchase_links"] });
      toast.success("Link deactivated");
    },
  });

  return {
    links: linksQuery.data || [],
    isLoading: linksQuery.isLoading,
    createLink,
    deactivateLink,
    refetch: linksQuery.refetch,
  };
}
