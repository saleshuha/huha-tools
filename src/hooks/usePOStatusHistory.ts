import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface POStatusHistoryEntry {
  id: string;
  po_order_id: string;
  po_number: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
  change_reason: string | null;
  notes: string | null;
  created_at: string;
}

export function usePOStatusHistory(poNumber?: string, poOrderId?: string) {
  const [history, setHistory] = useState<POStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = async () => {
    if (!poNumber && !poOrderId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('po_status_history')
        .select('*')
        .order('changed_at', { ascending: false });

      if (poNumber) {
        query = query.eq('po_number', poNumber);
      } else if (poOrderId) {
        query = query.eq('po_order_id', poOrderId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching status history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load status history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (poNumber || poOrderId) {
      fetchHistory();
    }
  }, [poNumber, poOrderId]);

  return {
    history,
    loading,
    refetch: fetchHistory,
  };
}
