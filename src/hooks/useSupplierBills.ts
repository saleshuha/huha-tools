import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

export interface SupplierBill {
  id: string;
  user_id: string;
  supplier_id?: string | null;
  bill_reference?: string | null;
  bill_date: string;
  total_amount: number;
  currency: string;
  status: "pending" | "partial" | "reconciled" | "disputed";
  notes?: string | null;
  reconciled_at?: string | null;
  created_at: string;
  updated_at: string;
  supplier?: { supplier_name: string; company_name?: string } | null;
}

export interface CreateSupplierBill {
  supplier_id?: string | null;
  bill_reference?: string;
  bill_date: string;
  total_amount: number;
  currency?: string;
  notes?: string;
}

export function useSupplierBills() {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();

  const billsQuery = useQuery({
    queryKey: ["supplier_bills", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("supplier_bills")
        .select(`*, supplier:suppliers(supplier_name, company_name)`)
        .eq("user_id", profile.id)
        .order("bill_date", { ascending: false });
      if (error) throw error;
      return (data || []) as SupplierBill[];
    },
    enabled: !!profile?.id,
  });

  const createBill = useMutation({
    mutationFn: async (payload: CreateSupplierBill) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("supplier_bills")
        .insert({ ...payload, user_id: profile.id, currency: payload.currency || "AED" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_bills"] });
      toast.success("Bill created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bill: ${error.message}`);
    },
  });

  const reconcileBill = useMutation({
    mutationFn: async ({
      billId,
      purchaseIds,
      status,
    }: {
      billId: string;
      purchaseIds: string[];
      status: "reconciled" | "partial" | "disputed";
    }) => {
      if (!profile?.id) throw new Error("Not authenticated");

      // Mark purchases as reconciled
      if (purchaseIds.length > 0) {
        const { error: purchaseError } = await supabase
          .from("market_purchases")
          .update({ status: "reconciled" })
          .in("id", purchaseIds);
        if (purchaseError) throw purchaseError;

        // Link items to this bill
        const { error: itemsError } = await supabase
          .from("market_purchase_items")
          .update({ bill_reconciliation_id: billId })
          .in("purchase_id", purchaseIds);
        if (itemsError) throw itemsError;
      }

      // Update bill status
      const { error: billError } = await supabase
        .from("supplier_bills")
        .update({
          status,
          reconciled_at: status === "reconciled" ? new Date().toISOString() : null,
        })
        .eq("id", billId);
      if (billError) throw billError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_bills"] });
      queryClient.invalidateQueries({ queryKey: ["market_purchases"] });
      queryClient.invalidateQueries({ queryKey: ["market_credit_balances"] });
      toast.success("Bill reconciled successfully");
    },
    onError: (error: Error) => {
      toast.error(`Reconciliation failed: ${error.message}`);
    },
  });

  const updateBillStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("supplier_bills")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_bills"] });
    },
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_bills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_bills"] });
      toast.success("Bill deleted");
    },
  });

  return {
    bills: billsQuery.data || [],
    isLoading: billsQuery.isLoading,
    createBill,
    reconcileBill,
    updateBillStatus,
    deleteBill,
  };
}
