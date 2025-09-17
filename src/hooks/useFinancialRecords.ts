import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialRecord, FinancialMetrics } from '@/types/financial';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export const useFinancialRecords = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Fetch all financial records
  const {
    data: records = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['financial-records', selectedCountry],
    queryFn: async (): Promise<FinancialRecord[]> => {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('country', selectedCountry)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Add new record
  const addRecordMutation = useMutation({
    mutationFn: async (newRecord: Omit<FinancialRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('financial_records')
        .insert([{
          ...newRecord,
          user_id: userData.user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
      toast({
        title: 'Record added',
        description: 'Financial record has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add financial record.',
        variant: 'destructive',
      });
      console.error('Error adding record:', error);
    },
  });

  // Update record
  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinancialRecord> }) => {
      const { data, error } = await supabase
        .from('financial_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
      toast({
        title: 'Record updated',
        description: 'Financial record has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update financial record.',
        variant: 'destructive',
      });
      console.error('Error updating record:', error);
    },
  });

  // Delete record
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
      toast({
        title: 'Record deleted',
        description: 'Financial record has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete financial record.',
        variant: 'destructive',
      });
      console.error('Error deleting record:', error);
    },
  });

  // Mark as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('financial_records')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
      toast({
        title: 'Payment recorded',
        description: 'Record has been marked as paid.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update payment status.',
        variant: 'destructive',
      });
      console.error('Error marking as paid:', error);
    },
  });

  // Calculate metrics
  const metrics: FinancialMetrics = {
    totalOutstanding: records
      .filter(r => r.payment_status !== 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0),
    totalPaid: records
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0),
    totalOverdue: records
      .filter(r => r.payment_status === 'overdue')
      .reduce((sum, r) => sum + Number(r.amount), 0),
    totalRecords: records.length,
    byType: {
      loan: records.filter(r => r.type === 'loan').length,
      expense: records.filter(r => r.type === 'expense').length,
      debt: records.filter(r => r.type === 'debt').length,
      other: records.filter(r => r.type === 'other').length,
    },
    byStatus: {
      pending: records.filter(r => r.payment_status === 'pending').length,
      partial: records.filter(r => r.payment_status === 'partial').length,
      paid: records.filter(r => r.payment_status === 'paid').length,
      overdue: records.filter(r => r.payment_status === 'overdue').length,
    },
  };

  return {
    records,
    metrics,
    isLoading,
    error,
    addRecord: addRecordMutation.mutate,
    updateRecord: updateRecordMutation.mutate,
    deleteRecord: deleteRecordMutation.mutate,
    markAsPaid: markAsPaidMutation.mutate,
    isAdding: addRecordMutation.isPending,
    isUpdating: updateRecordMutation.isPending,
    isDeleting: deleteRecordMutation.isPending,
    isMarkingPaid: markAsPaidMutation.isPending,
  };
};