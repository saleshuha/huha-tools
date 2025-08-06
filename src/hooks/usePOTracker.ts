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

  // Add multiple SKUs
  const addSKUs = async (skus: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at'>[]) => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('sunsky_skus')
        .insert(skus)
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

  // Process PO files and match SKUs
  const processPOFiles = async (files: File[]) => {
    setIsLoading(true);
    try {
      const newOrders: Omit<POOrder, 'id' | 'created_at' | 'updated_at' | 'sunsky_sku'>[] = [];

      for (const file of files) {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
          
          if (columns.length >= 3) {
            const [poNumber, skuCode, quantity] = columns;
            
            // Check if SKU exists in our database
            const existingSKU = sunskySKUs.find(sku => 
              sku.sku_code.toLowerCase() === skuCode.toLowerCase()
            );

            if (existingSKU) {
            newOrders.push({
              po_number: poNumber,
              sku_code: skuCode,
              quantity: parseInt(quantity) || 1,
              status: 'pending' as const,
              file_name: file.name,
              notes: undefined,
              order_date: undefined,
              expected_delivery: undefined
            });
            }
          }
        }
      }

      if (newOrders.length > 0) {
        const { data, error } = await (supabase as any)
          .from('po_orders')
          .insert(newOrders)
          .select();

        if (error) throw error;

        await fetchPOOrders();
        toast({
          title: "Success",
          description: `Processed ${newOrders.length} PO items from ${files.length} file(s)`
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