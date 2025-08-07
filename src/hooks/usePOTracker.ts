import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SunskySKU {
  id: string;
  user_id: string;
  sku_code: string;
  title?: string;
  description?: string;
  cost?: number;
  weight?: number;
  notes?: string;
  currency?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface POOrder {
  id: string;
  user_id: string;
  po_number: string;
  sku_code: string;
  quantity: number;
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
  sunsky_sku?: SunskySKU;
}

export const usePOTracker = () => {
  const [sunskySKUs, setSunskySKUs] = useState<SunskySKU[]>([]);
  const [poOrders, setPOOrders] = useState<POOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shippingRate, setShippingRate] = useState(0.005); // Default: 0.005 AED per gram
  const { toast } = useToast();

  // Fetch all Sunsky SKUs using database function (bypasses client limits)
  const fetchSunskySKUs = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching ALL Sunsky SKUs using database function...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Use RPC to call our custom function that bypasses limits
      const { data, error } = await supabase.rpc('get_all_sunsky_skus', {
        user_id_param: user.id
      });
      
      if (error) throw error;
      
      console.log(`Successfully loaded ALL ${data?.length || 0} SKUs using database function`);
      setSunskySKUs(data || []);
      
    } catch (error) {
      console.error('Error fetching Sunsky SKUs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Sunsky SKUs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all PO Orders using database function (bypasses client limits)
  const fetchPOOrders = async () => {
    try {
      console.log('Fetching ALL PO orders using database function...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Use RPC to call our custom function that bypasses limits
      const { data, error } = await supabase.rpc('get_all_po_orders', {
        user_id_param: user.id
      });
      
      if (error) throw error;
      
      console.log(`Successfully loaded ALL ${data?.length || 0} PO orders using database function`);
      
      // Transform the data to match our POOrder interface
      const transformedData = data?.map((order: any) => ({
        ...order,
        sunsky_sku: order.sunsky_sku || undefined
      })) || [];
      
      setPOOrders(transformedData);
      
    } catch (error) {
      console.error('Error fetching PO orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PO orders",
        variant: "destructive"
      });
    }
  };

  // Add multiple SKUs with upsert to handle duplicates
  const addSKUs = async (skus: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]) => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's country from profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Failed to get user profile');

      // Add user_id and country to each SKU
      const skusWithUserId = skus.map(sku => ({
        ...sku,
        user_id: user.id,
        country: profile.country
      }));

      console.log('Adding SKUs to database:', skusWithUserId.length);

      // Use proper upsert syntax for Supabase
      const { data, error } = await (supabase as any)
        .from('sunsky_skus')
        .upsert(skusWithUserId, { 
          onConflict: 'user_id,sku_code',
          ignoreDuplicates: false,
          count: 'exact'
        })
        .select();

      console.log('Database response:', { data, error, count: data?.length });

      if (error) {
        console.error('Upsert failed, trying chunked approach:', error);
        
        // Fallback: Process in smaller chunks
        let successCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        
        const chunkSize = 10; // Smaller chunks for better reliability
        
        for (let i = 0; i < skusWithUserId.length; i += chunkSize) {
          const chunk = skusWithUserId.slice(i, i + chunkSize);
          console.log(`Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(skusWithUserId.length/chunkSize)}`);
          
          try {
            const { data: chunkData, error: chunkError } = await (supabase as any)
              .from('sunsky_skus')
              .insert(chunk)
              .select();
              
            if (chunkError) {
              throw chunkError;
            }
            
            successCount += chunk.length;
            console.log(`Chunk successful: ${chunk.length} SKUs added`);
          } catch (chunkError: any) {
            console.log('Chunk failed, trying individual inserts:', chunkError);
            
            // Individual insert fallback
            for (const sku of chunk) {
              try {
                const { data: skuData, error: skuError } = await (supabase as any)
                  .from('sunsky_skus')
                  .insert([sku])
                  .select();
                  
                if (skuError) {
                  throw skuError;
                }
                
                successCount++;
                console.log(`Individual SKU success: ${sku.sku_code}`);
              } catch (skuError: any) {
                if (skuError.code === '23505' || skuError.message.includes('duplicate key')) {
                  duplicateCount++;
                  console.log(`Duplicate SKU skipped: ${sku.sku_code}`);
                } else {
                  errorCount++;
                  console.error(`Failed to save SKU ${sku.sku_code}:`, skuError);
                }
              }
            }
          }
        }
        
        await fetchSunskySKUs();
        toast({
          title: "Success",
          description: `Added ${successCount} new SKUs. ${duplicateCount} SKUs already existed. ${errorCount} failed.`
        });
        return;
      }

      await fetchSunskySKUs();
      toast({
        title: "Success",
        description: `Processed ${skus.length} SKUs successfully`
      });
    } catch (error) {
      console.error('Error adding SKUs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add SKUs",
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
            expected_delivery: undefined,
            unit_cost: item.unit_cost || existingSKU.cost,
            sku_user_id: user.id, // Set to current user ID
            user_id: user.id, // Add user_id for RLS policies
            country: undefined, // Will be set by trigger
            currency: undefined, // Will be set by trigger
            total_cost: undefined // Will be calculated by trigger
          });
        }
      });

      if (validOrders.length > 0) {
        const { data, error } = await (supabase as any)
          .from('po_orders')
          .insert(validOrders)
          .select();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

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
        description: error instanceof Error ? error.message : "Failed to process PO files",
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
  };

  // Update tracking information
  const updateTrackingInfo = async (orderId: string, trackingData: { supplier_order_number?: string; tracking_number?: string; tracking_url?: string }) => {
    try {
      const { error } = await (supabase as any)
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
  };

  useEffect(() => {
    fetchSunskySKUs();
    fetchPOOrders();
  }, []);

  // Update shipping rate
  const updateShippingRate = (rate: number) => {
    setShippingRate(rate);
    toast({
      title: "Success",
      description: `Shipping rate updated to ${rate.toFixed(3)} per gram`
    });
  };

  return {
    sunskySKUs,
    poOrders,
    isLoading,
    shippingRate,
    addSKUs,
    processPOFiles,
    updateOrderStatus,
    updateTrackingInfo,
    updateShippingRate,
    refetch: () => {
      fetchSunskySKUs();
      fetchPOOrders();
    }
  };
};