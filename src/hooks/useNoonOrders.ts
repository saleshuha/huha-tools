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
  purchase_item_nr: string;
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

  const uploadOrders = async (orders: Partial<NoonOrder>[], fileName: string) => {
    setState(prev => ({ ...prev, uploading: true, error: null }));
    
    try {
      console.log('=== UPLOAD PROCESS START ===');
      console.log('Orders to upload:', orders.length);
      console.log('File name:', fileName);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Auth check - User:', user?.id);
      console.log('Auth check - Error:', userError);
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const ordersWithMetadata = orders.map((order, index) => {
        // Extract user field if it exists and map to shipment_user
        const { user: orderUser, ...orderData } = order as any;
        const finalOrder = {
          ...orderData,
          file_name: fileName,
          user_id: user.id, // Use authenticated user ID
          order_nr: orderData.order_nr || '', // Ensure order_nr is always present
          purchase_item_nr: orderData.purchase_item_nr || '', // Ensure purchase_item_nr is always present
          order_country_code: orderData.order_country_code || 'UAE', // Default country
          quantity: orderData.quantity || 1, // Default quantity
          is_reprintable: orderData.is_reprintable || false,
          is_printed: orderData.is_printed || false,
          // Fix field mapping - map 'user' field to 'shipment_user'
          shipment_user: orderUser || orderData.shipment_user || null,
        };
        
        console.log(`Order ${index + 1} - Purchase Item Nr:`, finalOrder.purchase_item_nr);
        return finalOrder;
      });

      // Check for duplicates one more time before upload
      const purchaseItemNrs = ordersWithMetadata.map(o => o.purchase_item_nr).filter(Boolean);
      const duplicates = purchaseItemNrs.filter((item, index) => purchaseItemNrs.indexOf(item) !== index);
      if (duplicates.length > 0) {
        console.log('Duplicate purchase item numbers found:', duplicates);
        throw new Error(`Duplicate Purchase Item Numbers in batch: ${[...new Set(duplicates)].join(', ')}`);
      }

      console.log('=== INSERTING TO DATABASE ===');
      console.log('Final orders with metadata:', ordersWithMetadata);

      const { data, error } = await supabase
        .from('noon_orders')
        .insert(ordersWithMetadata)
        .select();

      if (error) {
        console.log('=== DATABASE ERROR ===');
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        console.log('Error details:', error.details);
        console.log('Error hint:', error.hint);
        
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Some orders with the same Purchase Item Number already exist. Duplicate Purchase Item Numbers are not allowed.');
        }
        throw error;
      }

      console.log('=== UPLOAD SUCCESS ===');
      console.log('Uploaded orders:', data?.length || 0);

      toast({
        title: "Success",
        description: `Uploaded ${data?.length || 0} noon orders successfully`,
      });

      setState(prev => ({ ...prev, uploading: false }));
      await fetchOrders();
      
      return data;
    } catch (error) {
      console.error('=== UPLOAD ERROR ===', error);
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
      const { error } = await supabase
        .from('noon_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

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

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    uploading: state.uploading,
    uploadOrders,
    updateOrderStatus,
    placeOrderWithSunsky,
    syncOrderStatus,
    refreshOrders: fetchOrders,
  };
}