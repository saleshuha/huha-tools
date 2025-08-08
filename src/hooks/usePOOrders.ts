import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface POOrder {
  id: string;
  user_id: string;
  po_number: string;
  ship_to_location?: string;
  asin?: string;
  model_number?: string;
  title?: string;
  quantity: number;
  external_id?: string;
  external_id_type?: string;
  sku_code?: string; // Keep for backward compatibility
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  order_date?: string;
  expected_delivery?: string;
  notes?: string;
  file_name: string;
  country?: string;
  currency?: string;
  unit_cost?: number;
  total_cost?: number;
  sku_user_id?: string;
  supplier_order_number?: string;
  tracking_number?: string;
  tracking_url?: string;
  created_at: string;
  updated_at: string;
  sunsky_sku?: any;
}

export const usePOOrders = () => {
  const [poOrders, setPOOrders] = useState<POOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const { toast } = useToast();

  // Fetch PO orders efficiently using the database function
  const fetchPOOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Loading PO orders...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(30);
      setLoadingStatus('Fetching orders from database...');

      // Use the optimized database function
      const { data, error } = await supabase.rpc('get_all_po_orders', {
        user_id_param: user.id
      });

      if (error) throw error;

      setLoadingProgress(80);
      setLoadingStatus('Processing order data...');

      setPOOrders((data || []).map(order => ({
        ...order,
        status: order.status as POOrder['status']
      })));

      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${data?.length || 0} PO orders`);

      console.log(`Successfully loaded ${data?.length || 0} PO orders`);

    } catch (error) {
      console.error('Error fetching PO orders:', error);
      setLoadingStatus('Failed to load PO orders');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch PO orders",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
      }, 500);
    }
  }, [toast]);

  // Process PO files with mapped data - Updated to handle new mandatory fields
  const processPOFiles = useCallback(async (mappedData: any[], sunskySKUs: any[]) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Processing PO files...');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(20);
      setLoadingStatus('Validating data...');

      const validOrders: any[] = [];

      mappedData.forEach(item => {
        // Validate that all mandatory fields are present
        if (item.po_number && item.ship_to_location && item.asin && 
            item.model_number && item.title && item.quantity) {
          
          validOrders.push({
            po_number: item.po_number,
            ship_to_location: item.ship_to_location,
            asin: item.asin,
            model_number: item.model_number,
            title: item.title,
            quantity: item.quantity,
            external_id: item.external_id || null,
            external_id_type: item.external_id_type || null,
            status: 'pending',
            file_name: item.file_name,
            notes: undefined,
            order_date: undefined,
            expected_delivery: undefined,
            unit_cost: item.unit_cost || null,
            sku_user_id: user.id,
            user_id: user.id,
            country: undefined, // Will be set by trigger
            currency: undefined, // Will be set by trigger
            total_cost: undefined // Will be calculated by trigger
          });
        }
      });

      setLoadingProgress(60);
      setLoadingStatus(`Inserting ${validOrders.length} valid orders...`);

      if (validOrders.length > 0) {
        const { data, error } = await supabase
          .from('po_orders')
          .insert(validOrders)
          .select();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        setLoadingProgress(90);
        setLoadingStatus('Refreshing order list...');

        await fetchPOOrders();

        setLoadingProgress(100);
        
        const skippedCount = mappedData.length - validOrders.length;
        toast({
          title: "Success",
          description: `Processed ${validOrders.length} PO items from ${new Set(mappedData.map(item => item.file_name)).size} file(s)${skippedCount > 0 ? `. ${skippedCount} items skipped due to missing mandatory fields.` : ''}`
        });
      } else {
        toast({
          title: "No valid orders found",
          description: "All items are missing required fields (PO, Ship to Location, ASIN, Model Number, Title, Quantity)",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing PO files:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process PO files",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
      }, 1000);
    }
  }, [fetchPOOrders, toast]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, status: POOrder['status']) => {
    try {
      const { error } = await supabase
        .from('po_orders')
        .update({ 
          status,
          order_date: status === 'ordered' ? new Date().toISOString() : undefined
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchPOOrders();
      toast({
        title: "Success",
        description: `Order status updated to ${status}`
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  }, [fetchPOOrders, toast]);

  // Update tracking information
  const updateTrackingInfo = useCallback(async (orderId: string, trackingData: { supplier_order_number?: string; tracking_number?: string; tracking_url?: string }) => {
    try {
      const { error } = await supabase
        .from('po_orders')
        .update(trackingData)
        .eq('id', orderId);

      if (error) throw error;

      await fetchPOOrders();
      toast({
        title: "Success",
        description: "Tracking information updated"
      });
    } catch (error) {
      console.error('Error updating tracking info:', error);
      toast({
        title: "Error",
        description: "Failed to update tracking information",
        variant: "destructive"
      });
    }
  }, [fetchPOOrders, toast]);

  return {
    poOrders,
    isLoading,
    loadingProgress,
    loadingStatus,
    fetchPOOrders,
    processPOFiles,
    updateOrderStatus,
    updateTrackingInfo
  };
};