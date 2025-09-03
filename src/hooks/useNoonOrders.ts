import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NoonOrder {
  id: string;
  user_id: string;
  order_nr: string;
  order_status?: string;
  quantity: number;
  order_received_at?: string;
  purchase_item_nr: string; // Made required as per DB schema
  order_country_code: string;
  manifest_nr?: string;
  shipment_nr?: string;
  fulfillment_timestamp?: string;
  shipment_created_by?: string;
  shipment_user?: string;
  shipment_created_at?: string;
  id_warehouse_configuration?: string;
  target_ready_at?: string;
  item_status?: string;
  is_reprintable: boolean;
  is_printed: boolean;
  mp_code?: string;
  sku?: string;
  partner_sku?: string; // Sunsky item number
  title?: string;
  title_ar?: string;
  brand_code?: string;
  image_key?: string;
  parent_sku?: string;
  size?: string;
  pbarcodes?: string;
  // Sunsky integration fields
  sunsky_order_number?: string;
  sunsky_order_status?: number;
  sunsky_tracking_number?: string;
  sunsky_credentials_id?: string;
  sunsky_last_sync?: string;
  sunsky_error_message?: string;
  file_name?: string;
  selected_store_id?: string;
  created_at: string;
  updated_at: string;
}

interface NoonOrdersState {
  orders: NoonOrder[];
  loading: boolean;
  error: string | null;
  uploading: boolean;
}

export function useNoonOrders() {
  const [state, setState] = useState<NoonOrdersState>({
    orders: [],
    loading: false,
    error: null,
    uploading: false,
  });
  
  const { toast } = useToast();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('noon-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'noon_orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchOrders = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase
        .from('noon_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        orders: data || [],
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching noon orders:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        loading: false,
      }));
    }
  };

  const uploadOrders = async (orders: Partial<NoonOrder>[], fileName: string, selectedStoreId?: string) => {
    setState(prev => ({ ...prev, uploading: true, error: null }));
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const ordersWithMetadata = orders.map(order => ({
        ...order,
        file_name: fileName,
        user_id: order.user_id || user.id,
        // Only set defaults for processing-critical fields, preserve empty values for others
        order_nr: order.order_nr || '',
        purchase_item_nr: order.purchase_item_nr || '',
        order_country_code: order.order_country_code || 'UAE',
        quantity: order.quantity !== undefined ? order.quantity : 1,
        // Preserve boolean states as provided, or default to false only if undefined
        is_reprintable: order.is_reprintable !== undefined ? order.is_reprintable : false,
        is_printed: order.is_printed !== undefined ? order.is_printed : false,
        selected_store_id: selectedStoreId || null,
      }));

      let processedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process orders one by one to handle conflicts gracefully
      for (const order of ordersWithMetadata) {
        try {
          // Try to insert new order
          const { error: insertError } = await supabase
            .from('noon_orders')
            .insert(order);

          if (insertError) {
            if (insertError.code === '23505') {
              // Unique constraint violation - try to update existing order
              const { error: updateError } = await supabase
                .from('noon_orders')
                .update({
                  ...order,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('order_nr', order.order_nr)
                .eq('purchase_item_nr', order.purchase_item_nr);

              if (updateError) {
                console.warn(`Failed to update order ${order.order_nr}: ${updateError.message}`);
                errors.push(`${order.order_nr}: Update failed`);
                errorCount++;
              } else {
                processedCount++;
              }
            } else {
              console.error(`Failed to insert order ${order.order_nr}:`, insertError);
              errors.push(`${order.order_nr}: ${insertError.message}`);
              errorCount++;
            }
          } else {
            processedCount++;
          }
        } catch (err) {
          console.error(`Error processing order ${order.order_nr}:`, err);
          errors.push(`${order.order_nr}: Processing failed`);
          errorCount++;
        }
      }

      if (errorCount > 0 && processedCount === 0) {
        throw new Error(`Failed to upload all orders. Errors: ${errors.join(', ')}`);
      }

      toast({
        title: "Upload Complete",
        description: `${processedCount} orders processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      setState(prev => ({ ...prev, uploading: false }));
      await fetchOrders();
      
      return { processed: processedCount, errors: errorCount };
    } catch (error) {
      console.error('Error uploading noon orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload orders';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        uploading: false,
      }));
      
      toast({
        title: "Upload Error", 
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, updates: Partial<NoonOrder>) => {
    try {
      console.log('🔄 Updating order:', orderId, 'with updates:', updates);
      
      const { data, error } = await supabase
        .from('noon_orders')
        .update(updates)
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Database update successful:', data);

      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order =>
          order.id === orderId ? { ...order, ...updates } : order
        ),
      }));

      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Update Error",
        description: error instanceof Error ? error.message : 'Failed to update order',
        variant: "destructive",
      });
      return false;
    }
  };

  const placeOrderWithSunsky = async (orderId: string, credentialsId?: string) => {
    try {
      const order = state.orders.find(o => o.id === orderId);
      if (!order || !order.partner_sku) {
        throw new Error('Order not found or missing partner SKU');
      }

      // Call Sunsky API to create order
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'createOrder',
          apiId: credentialsId,
          orderData: {
            siteNumber: `NOON-${order.order_nr}`,
            items: [{
              itemNo: order.partner_sku,
              qty: order.quantity,
              remark: `Noon Order: ${order.order_nr}`,
            }],
            // Add shipping address if available
            deliveryAddress: {
              // These would need to be configured or collected
              countryId: order.order_country_code === 'UAE' ? 144 : 158, // UAE or KSA
              receiver: 'NOON Customer',
              address: 'Noon Fulfillment Center',
              city: order.order_country_code === 'UAE' ? 'Dubai' : 'Riyadh',
              state: order.order_country_code === 'UAE' ? 'Dubai' : 'Riyadh',
              postcode: '00000',
              telephone: '+971000000000',
              email: 'orders@noon.com',
              shipment: 'wholesale',
              shippingWayId: 0, // Pick up
            },
          },
        },
      });

      if (error) throw error;

      if (data.result === 'success') {
        const sunskyOrder = data.data;
        await updateOrderStatus(orderId, {
          sunsky_order_number: sunskyOrder.number,
          sunsky_order_status: sunskyOrder.status,
          sunsky_credentials_id: credentialsId,
          sunsky_last_sync: new Date().toISOString(),
          item_status: 'ordered',
        });

        toast({
          title: "Order Placed",
          description: `Order ${order.order_nr} placed successfully with Sunsky. Order #: ${sunskyOrder.number}`,
        });

        return sunskyOrder;
      } else {
        throw new Error(data.messages?.[0] || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing Sunsky order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      
      await updateOrderStatus(orderId, {
        sunsky_error_message: errorMessage,
        sunsky_last_sync: new Date().toISOString(),
      });

      toast({
        title: "Order Placement Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const syncOrderStatus = async (orderId: string) => {
    try {
      const order = state.orders.find(o => o.id === orderId);
      if (!order?.sunsky_order_number) {
        throw new Error('No Sunsky order number found');
      }

      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'getOrderDetails',
          apiId: order.sunsky_credentials_id,
          orderNumber: order.sunsky_order_number,
        },
      });

      if (error) throw error;

      if (data.result === 'success') {
        const sunskyOrder = data.data;
        await updateOrderStatus(orderId, {
          sunsky_order_status: sunskyOrder.status,
          sunsky_tracking_number: sunskyOrder.trackingNumber,
          sunsky_last_sync: new Date().toISOString(),
          sunsky_error_message: null,
        });

        return sunskyOrder;
      } else {
        throw new Error(data.messages?.[0] || 'Failed to sync order status');
      }
    } catch (error) {
      console.error('Error syncing order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync order status';
      
      await updateOrderStatus(orderId, {
        sunsky_error_message: errorMessage,
        sunsky_last_sync: new Date().toISOString(),
      });

      toast({
        title: "Sync Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  // Auto-processing for uploaded orders
  const processUploadedOrders = async () => {
    const uploadedOrders = state.orders.filter(order => 
      (order.order_status || 'uploaded') === 'uploaded' && 
      order.partner_sku && 
      order.quantity > 0
    );

    if (uploadedOrders.length === 0) return;

    console.log(`🔄 Auto-processing ${uploadedOrders.length} uploaded orders`);

    for (const order of uploadedOrders) {
      try {
        // Validate and move to ready_for_sunsky
        await updateOrderStatus(order.id, {
          order_status: 'ready_for_sunsky'
        });
      } catch (error) {
        console.error(`Failed to process order ${order.id}:`, error);
        await updateOrderStatus(order.id, {
          order_status: 'exception',
          sunsky_error_message: 'Auto-processing failed'
        });
      }
    }
  };

  // Auto-place orders that are ready for Sunsky
  const autoPlaceReadyOrders = async () => {
    const readyOrders = state.orders.filter(order => 
      order.order_status === 'ready_for_sunsky' && 
      order.partner_sku && 
      order.quantity > 0 && 
      !order.sunsky_order_number
    );

    if (readyOrders.length === 0) return;

    console.log(`🚀 Auto-placing ${readyOrders.length} ready orders with Sunsky`);

    // Get first available credentials
    const { data: credentials } = await supabase
      .from('sunsky_credentials')
      .select('id')
      .eq('is_active', true)
      .limit(1);

    if (!credentials || credentials.length === 0) {
      console.warn('No active Sunsky credentials found for auto-placement');
      return;
    }

    const credentialsId = credentials[0].id;

    for (const order of readyOrders) {
      try {
        await placeOrderWithSunsky(order.id, credentialsId);
      } catch (error) {
        console.error(`Failed to auto-place order ${order.id}:`, error);
        await updateOrderStatus(order.id, {
          order_status: 'exception',
          sunsky_error_message: error instanceof Error ? error.message : 'Auto-placement failed'
        });
      }
    }
  };

  // Auto-sync placed orders
  const autoSyncPlacedOrders = async () => {
    const placedOrders = state.orders.filter(order => 
      order.sunsky_order_number && 
      order.order_status !== 'delivered' &&
      (!order.sunsky_last_sync || new Date(order.sunsky_last_sync) < new Date(Date.now() - 30 * 60 * 1000)) // Last synced > 30 min ago
    );

    if (placedOrders.length === 0) return;

    console.log(`🔄 Auto-syncing ${placedOrders.length} placed orders`);

    for (const order of placedOrders) {
      try {
        await syncOrderStatus(order.id);
      } catch (error) {
        console.error(`Failed to auto-sync order ${order.id}:`, error);
      }
    }
  };

  // Auto-processing effect
  useEffect(() => {
    if (state.orders.length === 0) return;
    
    const runAutoProcessing = async () => {
      try {
        await processUploadedOrders();
        await autoPlaceReadyOrders();
        await autoSyncPlacedOrders();
      } catch (error) {
        console.error('Auto-processing error:', error);
      }
    };

    // Run auto-processing after a short delay when orders change
    const timer = setTimeout(runAutoProcessing, 2000);
    return () => clearTimeout(timer);
  }, [state.orders]);

  // Periodic auto-sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🕒 Running periodic auto-sync...');
      try {
        await autoSyncPlacedOrders();
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const getOrdersByStatus = (status: string) => state.orders.filter(order => (order.order_status || 'uploaded') === status);
  const findExceptions = () => state.orders.filter(order => order.order_status === 'exception' || !order.partner_sku || order.quantity <= 0 || order.sunsky_error_message);
  const batchUpdateOrders = async (orderIds: string[], updates: Partial<NoonOrder>) => {
    const { error } = await supabase.from('noon_orders').update(updates).in('id', orderIds);
    if (error) throw error;
    setState(prev => ({ ...prev, orders: prev.orders.map(order => orderIds.includes(order.id) ? { ...order, ...updates } : order) }));
  };

  return {
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    uploading: state.uploading,
    fetchOrders,
    uploadOrders,
    updateOrderStatus,
    placeOrderWithSunsky,
    syncOrderStatus,
    refreshOrders: fetchOrders,
    getOrdersByStatus,
    findExceptions,
    batchUpdateOrders,
  };
}