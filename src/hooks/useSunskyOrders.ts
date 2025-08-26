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
  sunsky_credentials_id?: string | null;
  raw: any;
  created_at: string;
  updated_at: string;
  items?: SunskyOrderItem[];
  credential_name?: string | null;
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

  // Fetch orders from local database - now includes all Sunsky orders with optional PO-only filtering
  const fetchStoredOrders = async (showOnlyPOLinked: boolean = true) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get all placed supplier order numbers from PO orders for filtering
      const { data: poOrders, error: poError } = await supabase
        .from('po_orders')
        .select('supplier_order_number, po_number')
        .not('supplier_order_number', 'is', null);

      if (poError) throw poError;

      const supplierOrderNumbers = new Set(
        (poOrders || [])
          .map(po => po.supplier_order_number)
          .filter(Boolean)
      );

      // Create a mapping of supplier order numbers to PO numbers
      const supplierToPOMap = new Map();
      (poOrders || []).forEach(po => {
        if (po.supplier_order_number) {
          if (!supplierToPOMap.has(po.supplier_order_number)) {
            supplierToPOMap.set(po.supplier_order_number, new Set());
          }
          supplierToPOMap.get(po.supplier_order_number).add(po.po_number);
        }
      });

      console.log('Found supplier order numbers from PO orders:', Array.from(supplierOrderNumbers));

      // Fetch all orders with better filtering and enrichment
      const { data: allOrders, error } = await supabase
        .from('sunsky_orders')
        .select(`
          *,
          items:sunsky_order_items(*),
          sunsky_credential:sunsky_credentials(name)
        `)
        .order('gmt_created', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredOrders: SunskyOrder[];

      if (showOnlyPOLinked) {
        // Filter orders that are either:
        // 1. Have po_numbers array with values (primary method)
        // 2. Have order number that matches a supplier_order_number from POs (fallback)
        filteredOrders = (allOrders || [])
          .filter((order: any): order is SunskyOrder => {
            const hasPoNumbers = order.po_numbers && Array.isArray(order.po_numbers) && order.po_numbers.length > 0;
            const matchesSupplierOrder = supplierOrderNumbers.has(order.number);
            return hasPoNumbers || matchesSupplierOrder;
          });
      } else {
        // Show all orders
        filteredOrders = allOrders || [];
      }

      const ordersWithData: SunskyOrder[] = filteredOrders.map((order: any): SunskyOrder => {
        // If the order doesn't have po_numbers but matches a supplier order number, add the PO numbers
        let poNumbers = order.po_numbers || [];
        if (supplierToPOMap.has(order.number) && (!poNumbers || poNumbers.length === 0)) {
          poNumbers = Array.from(supplierToPOMap.get(order.number));
        }

        return {
          ...order,
          items: order.items || [],
          credential_name: order.sunsky_credential?.name || null,
          po_numbers: poNumbers
        };
      });

      console.log(`${showOnlyPOLinked ? 'Filtered' : 'Found'} ${filteredOrders.length} orders ${showOnlyPOLinked ? 'with PO relationships' : 'total'} out of ${allOrders?.length || 0} total orders`);

      setState(prev => ({
        ...prev,
        orders: ordersWithData,
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

  // Sync orders from Sunsky API - all orders that have been placed on Sunsky
  const syncOrdersFromAPI = async () => {
    setState(prev => ({ ...prev, syncing: true, error: null, progressCurrent: 0, progressTotal: 0, progressPercent: 0 }));

    try {
      // Get ALL PO orders that have supplier order numbers (orders that have been placed)
      const { data: allPOs, error: poError } = await supabase
        .from('po_orders')
        .select(`
          po_number, 
          sku_code, 
          model_number, 
          supplier_order_number,
          sunsky_credentials_id,
          status,
          title
        `)
        .not('supplier_order_number', 'is', null);

      if (poError) throw poError;

      console.log('Total PO orders with supplier order numbers found:', allPOs?.length || 0);

      if (!allPOs || allPOs.length === 0) {
        toast({
          title: 'No Placed Orders Found',
          description: 'No PO orders have been placed on Sunsky yet. Place some orders first to track them.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // Get unique order numbers that were placed (have supplier_order_number)
      // Include the credentials_id for each order to use the correct API account
      const placedOrdersMap = new Map();
      allPOs
        .filter(po => po.supplier_order_number && po.supplier_order_number.trim() !== '')
        .forEach(po => {
          const orderNumber = po.supplier_order_number;
          if (!placedOrdersMap.has(orderNumber)) {
            placedOrdersMap.set(orderNumber, {
              orderNumber,
              credentialId: po.sunsky_credentials_id,
              poNumbers: new Set()
            });
          }
          placedOrdersMap.get(orderNumber).poNumbers.add(po.po_number);
        });

      const placedOrderEntries = Array.from(placedOrdersMap.values());

      console.log('Unique placed order numbers to sync:', placedOrderEntries.length);

      if (placedOrderEntries.length === 0) {
        toast({
          title: 'No Valid Orders Found',
          description: 'No valid supplier order numbers found in PO orders.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      setState(prev => ({ ...prev, progressTotal: placedOrderEntries.length }));

      // Sync each placed order with PO context and correct credentials
      let syncedCount = 0;
      let unpaidCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < placedOrderEntries.length; i++) {
        const { orderNumber, credentialId, poNumbers } = placedOrderEntries[i];
        const relatedPONumbers = Array.from(poNumbers);
        
        setState(prev => ({ 
          ...prev, 
          progressCurrent: i + 1, 
          progressPercent: Math.round(((i + 1) / placedOrderEntries.length) * 100)
        }));

        try {
          console.log(`Attempting to sync order ${orderNumber} with credential ${credentialId} and PO numbers:`, relatedPONumbers);
          
          const { data, error } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'getOrderDetails',
              orderNumber: orderNumber,
              poNumbers: relatedPONumbers,
              apiId: credentialId // Use the credential from the PO order
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
            } else if (data.reason === 'error' || data.reason === 'api_error') {
              console.log(`Order ${orderNumber} has error status - stored as error`);
              errorCount++;
            } else {
              console.log(`Successfully synced order ${orderNumber}`);
              syncedCount++;
            }
          } else if (data && data.result === 'error') {
            console.error(`Order ${orderNumber} sync failed:`, data);
            errorCount++;
            const errorMsg = data.message || 'Unknown error';
            
            // Show more specific error for API credential issues
            if (data.reason === 'api_issue') {
              toast({
                title: 'API Credential Issue',
                description: `Order ${orderNumber}: ${errorMsg}`,
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Order Error',
                description: `Order ${orderNumber}: ${errorMsg}`,
                variant: 'destructive',
              });
            }
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
        description: `${messages.join(', ')} out of ${placedOrderEntries.length} orders`,
        variant: errorCount === placedOrderEntries.length ? 'destructive' : 'default',
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

  // Get order details with items - fetch if missing items with correct credential
  const getOrderDetails = async (orderNumber: string, silent: boolean = false, apiId?: string) => {
    try {
      console.log(`Fetching order details for ${orderNumber} with credential ${apiId}`);
      
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'getOrderDetails',
          orderNumber,
          apiId, // Pass credential ID if provided
        },
      });

      if (error) throw error;

      console.log(`Order details response for ${orderNumber}:`, data);

      if (data.result === 'success') {
        // Check if it was an unpaid order
        if (data.reason === 'unpaid') {
          if (!silent) {
            toast({
              title: 'Order Status',
              description: `Order ${orderNumber} is not yet paid on Sunsky and has no item details available`,
              variant: 'destructive',
            });
          }
        } else if (data.reason === 'error' || data.reason === 'api_error') {
          if (!silent) {
            toast({
              title: 'API Issue',
              description: data.reason === 'api_error' 
                ? `Order ${orderNumber}: API credential or access issue. Please check your Sunsky credentials.`
                : `Order ${orderNumber} has an error status on Sunsky - items may not be available`,
              variant: 'destructive',
            });
          }
        } else {
          if (!silent) {
            toast({
              title: 'Success',
              description: 'Order details updated',
            });
          }
        }
        
        // Refresh local data to get updated order
        await fetchStoredOrders();
      } else {
        throw new Error(data.message || 'Failed to get order details');
      }
    } catch (error: any) {
      console.error(`Failed to get order details for ${orderNumber}:`, error);
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