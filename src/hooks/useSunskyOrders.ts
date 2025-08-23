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

  // Sync orders from Sunsky API - only orders placed from our app that match PO orders
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
      // First, get PO orders that have matching Sunsky SKUs (matched orders ready to place/placed)
      const { data: matchedPOs, error: poError } = await supabase
        .from('po_orders')
        .select(`
          po_number, 
          sku_code, 
          model_number, 
          supplier_order_number,
          status,
          title
        `)
        .in('status', ['pending', 'ordered', 'shipped', 'delivered', 'closed']);

      if (poError) throw poError;

      if (!matchedPOs || matchedPOs.length === 0) {
        toast({
          title: 'No Matched Orders Found',
          description: 'No PO orders with matching Sunsky SKUs found.',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // Get Sunsky SKUs to find matches
      const { data: sunskySkus, error: skuError } = await supabase
        .from('sunsky_skus')
        .select('sku_code');

      if (skuError) throw skuError;

      // Filter PO orders that have matching Sunsky SKUs
      const matchedOrders = matchedPOs.filter(po => 
        sunskySkus?.some(sku => 
          sku.sku_code === po.sku_code || 
          sku.sku_code === po.model_number
        )
      );

      if (matchedOrders.length === 0) {
        toast({
          title: 'No Matched Orders Found',
          description: 'No PO orders match available Sunsky SKUs.',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // Get unique order numbers that were placed (have supplier_order_number)
      const placedOrderNumbers = matchedOrders
        .map(po => po.supplier_order_number)
        .filter(Boolean);

      console.log('Syncing orders for placed order numbers:', placedOrderNumbers);

      // Group PO numbers by supplier order number for storage
      const poNumbersByOrderNumber = new Map();
      matchedOrders.forEach(po => {
        if (po.supplier_order_number) {
          if (!poNumbersByOrderNumber.has(po.supplier_order_number)) {
            poNumbersByOrderNumber.set(po.supplier_order_number, []);
          }
          poNumbersByOrderNumber.get(po.supplier_order_number).push(po.po_number);
        }
      });

      // Sync each placed order with PO context
      let syncedCount = 0;
      for (const orderNumber of placedOrderNumbers) {
        try {
          const relatedPONumbers = poNumbersByOrderNumber.get(orderNumber) || [];
          
          const { data, error } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'getOrderDetails',
              orderNumber: orderNumber,
              poNumbers: relatedPONumbers, // Pass related PO numbers
              apiKey: 'zawa.faza11',
              apiSecret: 'djbwfqewbqfeqljfw',
            },
          });

          if (error) {
            console.error(`Error syncing order ${orderNumber}:`, error);
            continue;
          }

          if (data.result === 'success') {
            syncedCount++;
          }
        } catch (err) {
          console.error(`Failed to sync order ${orderNumber}:`, err);
        }
      }

      toast({
        title: 'Success',
        description: `Synced ${syncedCount} matched orders from Sunsky`,
      });
      
      // Refresh local data
      await fetchStoredOrders();
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