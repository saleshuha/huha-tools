import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SunskySKU {
  id: string;
  sku_code: string;
  description?: string;
  cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface POOrder {
  id: string;
  po_number: string;
  sku_code: string;
  quantity: number;
  status: 'pending' | 'placed' | 'received' | 'cancelled';
  order_date?: string;
  expected_delivery?: string;
  notes?: string;
  file_name: string;
  created_at: string;
  updated_at: string;
  sunsky_sku?: SunskySKU;
}

export const usePOTracker = () => {
  const [sunskySKUs, setSunskySKUs] = useState<SunskySKU[]>([]);
  const [poOrders, setPOOrders] = useState<POOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch Sunsky SKUs
  const fetchSunskySKUs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('sunsky_skus')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSunskySKUs(data || []);
    } catch (error) {
      console.error('Error fetching Sunsky SKUs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Sunsky SKUs",
        variant: "destructive"
      });
    }
  };

  // Fetch PO Orders
  const fetchPOOrders = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('po_orders')
        .select(`
          *,
          sunsky_sku:sunsky_skus(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPOOrders(data || []);
    } catch (error) {
      console.error('Error fetching PO orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PO orders",
        variant: "destructive"
      });
    }
  };

  // Add multiple SKUs with user_id
  const addSKUs = async (skus: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at'>[]) => {
    setIsLoading(true);
    try {
      // Add user_id to each SKU for RLS
      const skusWithUserId = skus.map(sku => ({
        ...sku,
        user_id: undefined // Will be set by RLS policy
      }));

      const { data, error } = await (supabase as any)
        .from('sunsky_skus')
        .insert(skusWithUserId)
        .select();

      if (error) throw error;

      await fetchSunskySKUs();
      toast({
        title: "Success",
        description: `Added ${skus.length} SKUs successfully`
      });
    } catch (error) {
      console.error('Error adding SKUs:', error);
      toast({
        title: "Error",
        description: "Failed to add SKUs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Process PO files with mapped data
  const processPOFiles = async (mappedData: any[]) => {
    setIsLoading(true);
    try {
      const validOrders: Omit<POOrder, 'id' | 'created_at' | 'updated_at' | 'sunsky_sku'>[] = [];

      mappedData.forEach(item => {
        // Check if SKU exists in our database
        const existingSKU = sunskySKUs.find(sku => 
          sku.sku_code.toLowerCase() === item.sku_code.toLowerCase()
        );

        if (existingSKU) {
          validOrders.push({
            po_number: item.po_number,
            sku_code: item.sku_code,
            quantity: item.quantity,
            status: 'pending' as const,
            file_name: item.file_name,
            notes: undefined,
            order_date: undefined,
            expected_delivery: undefined
          });
        }
      });

      if (validOrders.length > 0) {
        const { data, error } = await (supabase as any)
          .from('po_orders')
          .insert(validOrders)
          .select();

        if (error) throw error;

        await fetchPOOrders();
        toast({
          title: "Success",
          description: `Processed ${validOrders.length} PO items from ${new Set(mappedData.map(item => item.file_name)).size} file(s)`
        });
      } else {
        toast({
          title: "No matches found",
          description: "No SKUs in the PO files matched your Sunsky database",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing PO files:', error);
      toast({
        title: "Error",
        description: "Failed to process PO files",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: POOrder['status']) => {
    try {
      const { error } = await (supabase as any)
        .from('po_orders')
        .update({ 
          status,
          order_date: status === 'placed' ? new Date().toISOString() : undefined
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
  };

  useEffect(() => {
    fetchSunskySKUs();
    fetchPOOrders();
  }, []);

  return {
    sunskySKUs,
    poOrders,
    isLoading,
    addSKUs,
    processPOFiles,
    updateOrderStatus,
    refetch: () => {
      fetchSunskySKUs();
      fetchPOOrders();
    }
  };
};