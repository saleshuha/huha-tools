import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PODashboardSummary {
  total_active_orders: number;
  total_active_quantity: number;
  total_active_value: number;
  unique_po_numbers: number;
  pending_orders: number;
  ordered_orders: number;
  shipped_orders: number;
  recent_uploads: Array<{
    file_name: string;
    upload_date: string;
    order_count: number;
  }>;
  top_suppliers: Array<{
    po_number: string;
    total_value: number;
    order_count: number;
  }>;
  status_breakdown: {
    pending: number;
    ordered: number;
    shipped: number;
  };
}

export const usePODashboard = () => {
  const [summary, setSummary] = useState<PODashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDashboardSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .rpc('get_po_dashboard_summary', { user_id_param: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        const summaryData = data[0];
        setSummary({
          ...summaryData,
          recent_uploads: Array.isArray(summaryData.recent_uploads) 
            ? (summaryData.recent_uploads as Array<any>).map(item => ({
                file_name: String(item.file_name || ''),
                upload_date: String(item.upload_date || ''),
                order_count: Number(item.order_count || 0)
              }))
            : [],
          top_suppliers: Array.isArray(summaryData.top_suppliers) 
            ? (summaryData.top_suppliers as Array<any>).map(item => ({
                po_number: String(item.po_number || ''),
                total_value: Number(item.total_value || 0),
                order_count: Number(item.order_count || 0)
              }))
            : [],
          status_breakdown: typeof summaryData.status_breakdown === 'object' && summaryData.status_breakdown
            ? {
                pending: Number((summaryData.status_breakdown as any).pending || 0),
                ordered: Number((summaryData.status_breakdown as any).ordered || 0),
                shipped: Number((summaryData.status_breakdown as any).shipped || 0),
              }
            : { pending: 0, ordered: 0, shipped: 0 }
        });
      } else {
        // Set empty dashboard if no data
        setSummary({
          total_active_orders: 0,
          total_active_quantity: 0,
          total_active_value: 0,
          unique_po_numbers: 0,
          pending_orders: 0,
          ordered_orders: 0,
          shipped_orders: 0,
          recent_uploads: [],
          top_suppliers: [],
          status_breakdown: {
            pending: 0,
            ordered: 0,
            shipped: 0,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const refreshDashboard = useCallback(async () => {
    await fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  return {
    summary,
    isLoading,
    fetchDashboardSummary,
    refreshDashboard
  };
};