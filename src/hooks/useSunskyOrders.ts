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
  po_numbers?: string[] | null;
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
  item_status: string | null;
  status_last_updated_at: string | null;
  expected_ship_date: string | null;
  last_synced_at: string;
  raw: any;
  created_at: string;
}

interface SunskyOrdersState {
  orders: SunskyOrder[];
  loading: boolean;
  error: string | null;
  syncing: boolean;
  progressCurrent: number;
  progressTotal: number;
  progressPercent: number;
}

export const useSunskyOrders = () => {
  const [state, setState] = useState<SunskyOrdersState>({
    orders: [],
    loading: false,
    error: null,
    syncing: false,
    progressCurrent: 0,
    progressTotal: 0,
    progressPercent: 0,
  });

  const { toast } = useToast();

  // Fetch orders from local database - orders linked to our PO orders or with supplier order numbers
  const fetchStoredOrders = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get all placed supplier order numbers from PO orders for filtering
      const { data: poOrders, error: poError } = await supabase
        .from('po_orders')
        .select('supplier_order_number')
        .not('supplier_order_number', 'is', null);

      if (poError) throw poError;

      const supplierOrderNumbers = new Set(
        (poOrders || [])
          .map(po => po.supplier_order_number)
          .filter(Boolean)
      );

      console.log('Found supplier order numbers from PO orders:', Array.from(supplierOrderNumbers));

      // Fetch all orders and filter for those linked to our POs
      const { data: allOrders, error } = await supabase
        .from('sunsky_orders')
        .select(`
          *,
          items:sunsky_order_items(*)
        `)
        .order('gmt_created', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter orders that are either:
      // 1. Have po_numbers array with values (primary method)
      // 2. Have order number that matches a supplier_order_number from POs (fallback)
      const ordersWithPORelations: SunskyOrder[] = (allOrders || [])
        .filter((order: any): order is SunskyOrder => {
          const hasPoNumbers = order.po_numbers && Array.isArray(order.po_numbers) && order.po_numbers.length > 0;
          const matchesSupplierOrder = supplierOrderNumbers.has(order.number);
          return hasPoNumbers || matchesSupplierOrder;
        })
        .map((order: any): SunskyOrder => ({
          ...order,
          items: order.items || []
        }));

      console.log(`Filtered ${ordersWithPORelations.length} orders with PO relationships out of ${allOrders?.length || 0} total orders`);

      setState(prev => ({
        ...prev,
        orders: ordersWithPORelations,
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
  const syncOrdersFromAPI = async () => {
    setState(prev => ({ ...prev, syncing: true, error: null, progressCurrent: 0, progressTotal: 0, progressPercent: 0 }));

    try {
      // First, get PO orders that have matching Sunsky SKUs (matched orders ready to place/placed)
      const { data: allPOs, error: poError } = await supabase
        .from('po_orders')
        .select(`
          po_number, 
          sku_code, 
          model_number, 
          supplier_order_number,
          status,
          title
        `);

      if (poError) throw poError;

      console.log('Total PO orders found:', allPOs?.length || 0);

      if (!allPOs || allPOs.length === 0) {
        toast({
          title: 'No PO Orders Found',
          description: 'No PO orders exist in the system. Create some PO orders first.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // Get Sunsky SKUs to find matches
      const { data: sunskySkus, error: skuError } = await supabase
        .from('sunsky_skus')
        .select('sku_code');

      if (skuError) throw skuError;

      console.log('Total Sunsky SKUs found:', sunskySkus?.length || 0);

      if (!sunskySkus || sunskySkus.length === 0) {
        toast({
          title: 'No Sunsky SKUs Found',
          description: 'No Sunsky SKUs available. Import some SKUs from Sunsky first.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // Filter PO orders that have matching Sunsky SKUs
      const matchedOrders = allPOs.filter(po => 
        sunskySkus?.some(sku => 
          sku.sku_code === po.sku_code || 
          sku.sku_code === po.model_number
        )
      );

      console.log('PO orders with matching Sunsky SKUs:', matchedOrders.length);

      if (matchedOrders.length === 0) {
        toast({
          title: 'No Matched Orders Found',
          description: 'No PO orders match available Sunsky SKUs. Make sure your PO order SKUs match Sunsky product codes.',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // Get unique order numbers that were placed (have supplier_order_number)
      // Deduplicate to avoid processing the same order multiple times
      const placedOrderNumbers = [...new Set(matchedOrders
        .filter(po => po.supplier_order_number && po.supplier_order_number.trim() !== '')
        .map(po => po.supplier_order_number)
        .filter(Boolean))];

      console.log('Placed order numbers to sync:', placedOrderNumbers);

      if (placedOrderNumbers.length === 0) {
        toast({
          title: 'No Placed Orders Found',
          description: `Found ${matchedOrders.length} matched PO orders, but none have been placed on Sunsky yet. Place orders first to track them.`,
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // Group PO numbers by supplier order number for storage (deduplicated)
      const poNumbersByOrderNumber = new Map();
      matchedOrders.forEach(po => {
        if (po.supplier_order_number && po.supplier_order_number.trim() !== '') {
          if (!poNumbersByOrderNumber.has(po.supplier_order_number)) {
            poNumbersByOrderNumber.set(po.supplier_order_number, new Set());
          }
          poNumbersByOrderNumber.get(po.supplier_order_number).add(po.po_number);
        }
      });

      // Convert Sets back to arrays
      poNumbersByOrderNumber.forEach((poSet, orderNumber) => {
        poNumbersByOrderNumber.set(orderNumber, Array.from(poSet));
      });

      setState(prev => ({ ...prev, progressTotal: placedOrderNumbers.length }));

      // Sync each placed order with PO context and track progress
      let syncedCount = 0;
      let unpaidCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < placedOrderNumbers.length; i++) {
        const orderNumber = placedOrderNumbers[i];
        
        setState(prev => ({ 
          ...prev, 
          progressCurrent: i + 1, 
          progressPercent: Math.round(((i + 1) / placedOrderNumbers.length) * 100)
        }));

        try {
          const relatedPONumbers = poNumbersByOrderNumber.get(orderNumber) || [];
          
          console.log(`Attempting to sync order ${orderNumber} with PO numbers:`, relatedPONumbers);
          
          const { data, error } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'getOrderDetails',
              orderNumber: orderNumber,
              poNumbers: relatedPONumbers,
            },
          });

          console.log(`Response for order ${orderNumber}:`, { data, error });

          if (error) {
            console.error(`Error syncing order ${orderNumber}:`, error);
            errorCount++;
            toast({
              title: 'Connection Error',
              description: `Failed to connect to Sunsky API for order ${orderNumber}. Please check your credentials.`,
              variant: 'destructive',
            });
            continue;
          }

          if (data && data.result === 'success') {
            if (data.reason === 'unpaid') {
              console.log(`Order ${orderNumber} is unpaid - stored as pending`);
              unpaidCount++;
            } else {
              console.log(`Successfully synced order ${orderNumber}`);
              syncedCount++;
            }
          } else if (data && data.result === 'error') {
            console.error(`Order ${orderNumber} sync failed:`, data);
            errorCount++;
            const errorMsg = data.message || 'Unknown error';
            toast({
              title: 'Order Error',
              description: `Order ${orderNumber}: ${errorMsg}`,
              variant: 'destructive',
            });
          } else {
            console.error(`Order ${orderNumber} unexpected response:`, data);
            errorCount++;
            toast({
              title: 'Unexpected Response',
              description: `Order ${orderNumber}: Received unexpected response from Sunsky API`,
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error(`Failed to sync order ${orderNumber}:`, err);
          errorCount++;
          toast({
            title: 'Request Failed',
            description: `Order ${orderNumber}: ${err instanceof Error ? err.message : 'Network error'}`,
            variant: 'destructive',
          });
        }
      }

      // Show summary toast
      const messages = [];
      if (syncedCount > 0) messages.push(`${syncedCount} synced`);
      if (unpaidCount > 0) messages.push(`${unpaidCount} unpaid (stored as pending)`);
      if (errorCount > 0) messages.push(`${errorCount} failed`);

      toast({
        title: 'Sync Complete',
        description: `${messages.join(', ')} out of ${placedOrderNumbers.length} orders`,
        variant: errorCount === placedOrderNumbers.length ? 'destructive' : 'default',
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
      setState(prev => ({ ...prev, syncing: false, progressCurrent: 0, progressTotal: 0, progressPercent: 0 }));

      // Auto-refresh stored orders after sync
      console.log('Auto-refreshing stored orders after sync');
      await fetchStoredOrders();
    }
  };

  // Get order details with items - fetch if missing items
  const getOrderDetails = async (orderNumber: string, silent: boolean = false) => {
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
        if (!silent) {
          toast({
            title: 'Success',
            description: 'Order details updated',
          });
        }
      } else {
        throw new Error(data.message || 'Failed to get order details');
      }
    } catch (error: any) {
      if (!silent) {
        toast({
          title: 'Error',
          description: `Failed to get order details: ${error.message}`,
          variant: 'destructive',
        });
      }
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

  // Get slow/delayed items using RPC
  const getSlowItems = async (thresholdDays: number = 3) => {
    try {
      const { data, error } = await supabase.rpc('get_sunsky_slow_items', {
        threshold_days: thresholdDays
      });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get slow items:', error);
      return [];
    }
  };

  return {
    ...state,
    fetchStoredOrders,
    syncOrdersFromAPI,
    getOrderDetails,
    getOrderLabels,
    getSlowItems,
  };
};