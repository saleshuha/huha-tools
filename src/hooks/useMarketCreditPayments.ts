import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

export interface MarketCreditPayment {
  id: string;
  user_id: string;
  supplier_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  link_ids: string[] | null;
  created_at: string;
}

export function useMarketCreditPayments() {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: ["market_credit_payments", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("market_credit_payments" as any)
        .select("*")
        .eq("user_id", profile.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MarketCreditPayment[];
    },
    enabled: !!profile?.id,
  });

  const createPayment = useMutation({
    mutationFn: async (payload: {
      supplier_name: string;
      amount: number;
      payment_date: string;
      payment_method: string;
      reference_number?: string;
      notes?: string;
      link_ids?: string[];
    }) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("market_credit_payments" as any)
        .insert({
          user_id: profile.id,
          supplier_name: payload.supplier_name,
          amount: payload.amount,
          payment_date: payload.payment_date,
          payment_method: payload.payment_method,
          reference_number: payload.reference_number || null,
          notes: payload.notes || null,
          link_ids: payload.link_ids || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MarketCreditPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_credit_payments"] });
      toast.success("Payment recorded successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("market_credit_payments" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market_credit_payments"] });
      toast.success("Payment deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    payments: paymentsQuery.data || [],
    isLoading: paymentsQuery.isLoading,
    createPayment,
    deletePayment,
  };
}
