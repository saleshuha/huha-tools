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
  gmt_paid?: string | null;
  gmt_shipped?: string | null;
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

  // Get order by number from current state
  const getOrderByNumber = (orderNumber: string): SunskyOrder | undefined => {
    return state.orders.find(order => order.number === orderNumber);
  };

  // Get credential name mapping (placeholder for future implementation)
  const getCredentialName = (credentialId: string): string | null => {
    // This could be enhanced to fetch credential names from the database
    return null;
  };

  // Fetch ALL synced orders from database using pagination to bypass Supabase limits
  const fetchStoredOrders = async (showOnlyPOLinked: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🔄 Fetching ALL synced Sunsky orders from database...');

      const batchSize = 1000;
      let allOrders: any[] = [];
      let currentOffset = 0;
      let hasMore = true;
      let totalCount = 0;

      // First, get the total count
      const { count: totalCountResult, error: countError } = await supabase
        .from('sunsky_orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (countError) {
        console.error('❌ Error getting count:', countError);
      } else {
        totalCount = totalCountResult || 0;
        console.log(`📊 Total orders in database: ${totalCount}`);
      }

      // Fetch orders in batches
      while (hasMore) {
        console.log(`📦 Fetching batch ${Math.floor(currentOffset / batchSize) + 1}... (offset: ${currentOffset})`);
        
        let query = supabase
          .from('sunsky_orders')
          .select(`
            id,
            user_id,
            number,
            status,
            site_number,
            gmt_created,
            total,
            currency,
            shipping_company,
            tracking_number,
            tracking_url,
            po_numbers,
            sunsky_credentials_id,
            raw,
            created_at,
            updated_at,
            status_last_updated_at,
            last_synced_at,
            sunsky_order_items (
              id,
              user_id,
              order_number,
              sku_code,
              model_number,
              title,
              quantity,
              unit_price,
              currency,
              asin,
              item_status,
              status_last_updated_at,
              expected_ship_date,
              last_synced_at,
              raw,
              created_at
            )
          `)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .order('gmt_created', { ascending: false })
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + batchSize - 1)

        if (showOnlyPOLinked) {
          // Only show orders that have PO relationships
          query = query.not('po_numbers', 'is', null);
        }

        const { data: batchOrders, error } = await query;

        if (error) {
          console.error('❌ Supabase query error:', error);
          throw error;
        }

        if (batchOrders && batchOrders.length > 0) {
          allOrders = [...allOrders, ...batchOrders];
          console.log(`📦 Batch ${Math.floor(currentOffset / batchSize) + 1} fetched: ${batchOrders.length} orders (total so far: ${allOrders.length})`);
          
          if (batchOrders.length < batchSize) {
            // This batch was smaller than expected, we've reached the end
            hasMore = false;
          } else {
            currentOffset += batchSize;
          }
        } else {
          // No more orders to fetch
          hasMore = false;
        }
      }

      // Format the orders to match the expected structure
      const ordersWithData: SunskyOrder[] = allOrders.map((order: any) => ({
        ...order,
        items: order.sunsky_order_items || [],
        credential_name: null // We'll fetch this separately if needed
      }));

      console.log(`📊 Successfully fetched ${ordersWithData.length} out of ${totalCount} total orders`);
      if (totalCount > 0 && ordersWithData.length < totalCount) {
        console.warn(`⚠️ Fetched ${ordersWithData.length} out of ${totalCount} total orders`);
      }

      console.log('Order numbers:', ordersWithData.slice(0, 10).map(o => o.number).join(', '), ordersWithData.length > 10 ? `... and ${ordersWithData.length - 10} more` : '');

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

  // Sync orders from Sunsky API with optional date range
  const syncOrdersFromAPI = async (
    credentialId?: string | null, 
    dateFrom?: Date | null, 
    dateTo?: Date | null
  ) => {
    setState(prev => ({ ...prev, syncing: true, error: null, progressCurrent: 0, progressTotal: 0, progressPercent: 0 }));

    try {
      // First check if user has any Sunsky credentials
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Error',
          description: 'Please sign in to sync orders.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      // If no credential provided, try to get the first available active one
      let finalCredentialId = credentialId;
      if (!finalCredentialId) {
        const { data: credentials, error: credError } = await supabase
          .from('sunsky_credentials')
          .select('id, name, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (credError) throw credError;

        if (!credentials || credentials.length === 0) {
          toast({
            title: 'No Sunsky Credentials',
            description: 'Please add your Sunsky API credentials before syncing orders.',
            variant: 'destructive',
          });
          setState(prev => ({ ...prev, syncing: false }));
          return;
        }

        finalCredentialId = (credentials[0] as any).id;
        console.log('Using first available credential:', finalCredentialId);
      }

      // Format dates for Sunsky API (MM/dd/yyyy)
      const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      };

      const dateRangeStr = dateFrom && dateTo 
        ? `${formatDate(dateFrom)} to ${formatDate(dateTo)}`
        : 'all time';

      console.log('Syncing Sunsky orders with credential:', finalCredentialId, 'Date range:', dateRangeStr);

      // Get delivered orders already in database to skip them
      console.log('🔍 Checking for delivered orders already in database...');
      const { data: deliveredOrdersData, error: deliveredError } = await supabase
        .from('sunsky_orders')
        .select('number')
        .eq('user_id', user.id)
        .in('status', ['6', 'delivered']); // Status 6 = delivered

      if (deliveredError) {
        console.warn('Failed to fetch delivered orders, continuing with sync:', deliveredError);
      }

      const deliveredOrderNumbers = new Set(deliveredOrdersData?.map((o: any) => o.number) || []);
      console.log(`📦 Found ${deliveredOrderNumbers.size} delivered orders in database to skip`);
      
      console.log(`🌍 Fetching orders from Sunsky API for date range: ${dateRangeStr}...`);
      
      toast({
        title: 'Syncing Orders',
        description: dateFrom && dateTo
          ? `Fetching orders from ${dateRangeStr}...`
          : 'Fetching all orders from your Sunsky account (this may take a while)...',
      });

      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'getAllOrders',
          apiId: finalCredentialId,
          skipDeliveredOrders: Array.from(deliveredOrderNumbers),
          gmtCreatedStart: dateFrom ? formatDate(dateFrom) : undefined,
          gmtCreatedEnd: dateTo ? formatDate(dateTo) : undefined
        },
      });

      if (error) {
        throw new Error(`API Error: ${error.message}`);
      }

      if (!data || data.result !== 'success') {
        throw new Error(data?.message || 'Failed to fetch orders from Sunsky API');
      }

      const allOrders = data.orders || [];
      const skippedCount = data.skippedCount || 0;
      console.log(`📦 Found ${allOrders.length} orders to sync (${skippedCount} delivered orders skipped)`);

      setState(prev => ({ ...prev, progressTotal: allOrders.length }));

      let syncedCount = 0;
      let errorCount = 0;

      // Process each order
      for (let i = 0; i < allOrders.length; i++) {
        const order = allOrders[i];
        
        setState(prev => ({ 
          ...prev, 
          progressCurrent: i + 1, 
          progressPercent: Math.round(((i + 1) / allOrders.length) * 100)
        }));

        try {
          // Store the order in our database with items
          const { data: saveData, error: saveError } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'saveOrderWithItems',
              orderData: order,
              apiId: finalCredentialId
            },
          });

          if (saveError) {
            console.error(`Error saving order ${order.number}:`, saveError);
            errorCount++;
          } else if (saveData?.result === 'success') {
            syncedCount++;
          } else {
            console.error(`Failed to save order ${order.number}:`, saveData);
            errorCount++;
          }
        } catch (err) {
          console.error(`Failed to process order ${order.number}:`, err);
          errorCount++;
        }
      }

      // Show summary toast
      const messages = [];
      if (syncedCount > 0) messages.push(`${syncedCount} synced`);
      if (errorCount > 0) messages.push(`${errorCount} failed`);
      if (skippedCount > 0) messages.push(`${skippedCount} delivered orders skipped`);

      const summaryMsg = messages.length > 0 ? messages.join(', ') : 'No orders processed';
      
      toast({
        title: 'Sync Complete',
        description: errorCount === allOrders.length && errorCount > 0 
          ? `All ${allOrders.length} orders failed. Please check your Sunsky API credentials.`
          : `${summaryMsg} out of ${allOrders.length + skippedCount} total orders`,
        variant: errorCount === allOrders.length ? 'destructive' : 'default',
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
  const getOrderDetails = async (
    orderNumber: string, 
    silent: boolean = false, 
    apiId?: string,
    options: { forceRefreshDelivered?: boolean } = {}
  ) => {
    const { forceRefreshDelivered = false } = options;
    
    // Check if order is delivered and should skip refresh
    const existingOrder = getOrderByNumber(orderNumber);
    if (existingOrder && (existingOrder.status === 'delivered' || existingOrder.status === '6') && !forceRefreshDelivered) {
      if (!silent) {
        toast({
          title: "Order Delivered",
          description: "This order is delivered. Use 'Force Refresh' to update anyway.",
        });
      }
      return;
    }

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
        if (data.reason === 'api_error') {
          if (!silent) {
            toast({
              title: 'API Issue',
              description: `Order ${orderNumber}: API credential or access issue. Please check your Sunsky credentials.`,
              variant: 'destructive',
            });
          }
        } else {
          if (!silent) {
            const wasDeliveredSkip = existingOrder?.status === 'delivered' && forceRefreshDelivered;
            toast({
              title: wasDeliveredSkip ? 'Force Refresh Complete' : 'Success',
              description: wasDeliveredSkip 
                ? `Delivered order ${orderNumber} forcefully refreshed`
                : 'Order details updated',
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

  // Auto-sync effect - run every minute to check for new orders
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🕒 Running periodic Sunsky order sync...');
      try {
        await fetchStoredOrders();
      } catch (error) {
        console.error('Periodic Sunsky sync error:', error);
      }
    }, 60 * 1000); // 1 minute

    return () => clearInterval(interval);
  }, []);

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
    getOrderByNumber,
    getCredentialName,
  };
};