import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface SunskyOrder {
  id: string;
  user_id: string;
  number: string;
  status: string | null;
  site_number: string | null;
  gmt_created: string | null;
  total: number | null;
  currency: string | null;
  shipping_company: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  raw: any;
  created_at: string;
  updated_at: string;
  items?: SunskyOrderItem[];
}

export interface SunskyOrderItem {
  id: string;
  user_id: string;
  order_number: string;
  sku_code: string | null;
  model_number: string | null;
  title: string | null;
  quantity: number | null;
  unit_price: number | null;
  currency: string | null;
  asin: string | null;
  raw: any;
  created_at: string;
}

interface SunskyOrdersState {
  orders: SunskyOrder[];
  loading: boolean;
  error: string | null;
  syncing: boolean;
}

export const useSunskyOrders = () => {
  const [state, setState] = useState<SunskyOrdersState>({
    orders: [],
    loading: false,
    error: null,
    syncing: false,
  });

  const { toast } = useToast();

  // Fetch orders from local database
  const fetchStoredOrders = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data: orders, error } = await supabase
        .from('sunsky_orders')
        .select(`
          *,
          items:sunsky_order_items(*)
        `)
        .order('gmt_created', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        orders: orders || [],
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false,
      }));
      toast({
        title: 'Error',
        description: `Failed to fetch orders: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Sync orders from Sunsky API
  const syncOrdersFromAPI = async (filters: {
    pageSize?: number;
    page?: number;
    status?: string;
    siteNumber?: string;
    gmtCreatedStart?: string;
    gmtCreatedEnd?: string;
    apiKey?: string;
    apiSecret?: string;
  } = {}) => {
    setState(prev => ({ ...prev, syncing: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'listOrders',
          apiKey: 'zawa.faza11',
          apiSecret: 'djbwfqewbqfeqljfw',
          ...filters,
        },
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: 'Success',
          description: `Synced ${data.result?.length || 0} orders from Sunsky`,
        });
        // Refresh local data
        await fetchStoredOrders();
      } else {
        throw new Error(data.message || 'Failed to sync orders');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast({
        title: 'Sync Error',
        description: `Failed to sync orders: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
  };

  // Get order details with items
  const getOrderDetails = async (orderNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'getOrderDetails',
          orderNumber,
        },
      });

      if (error) throw error;

      if (data.result === 'success') {
        // Refresh local data to get updated order with items
        await fetchStoredOrders();
        toast({
          title: 'Success',
          description: 'Order details updated',
        });
      } else {
        throw new Error(data.message || 'Failed to get order details');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to get order details: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Get order labels
  const getOrderLabels = async (orderNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'getOrderLabels',
          orderNumber,
        },
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: 'Success',
          description: 'Order labels retrieved',
        });
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get order labels');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to get order labels: ${error.message}`,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Load orders on mount
  useEffect(() => {
    fetchStoredOrders();
  }, []);

  return {
    ...state,
    fetchStoredOrders,
    syncOrdersFromAPI,
    getOrderDetails,
    getOrderLabels,
  };
};