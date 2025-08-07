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

  // Fetch Sunsky SKUs with optimized loading
  const fetchSunskySKUs = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching Sunsky SKUs with optimized approach...');
      
      // Start with a reasonable initial load
      const { data: initialData, error: initialError, count } = await (supabase as any)
        .from('sunsky_skus')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1000);

      if (initialError) throw initialError;
      
      console.log(`Initial load: ${initialData?.length || 0} SKUs (${count} total available)`);
      setSunskySKUs(initialData || []);
      
      // If there are more records, load them in background
      if (count && count > 1000) {
        setTimeout(async () => {
          try {
            console.log('Loading remaining SKUs in background...');
            let allData = [...(initialData || [])];
            let from = 1000;
            const chunkSize = 2000; // Larger chunks for background loading
            
            while (from < count) {
              const { data: chunkData, error: chunkError } = await (supabase as any)
                .from('sunsky_skus')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, from + chunkSize - 1);

              if (chunkError) {
                console.error('Background chunk error:', chunkError);
                break;
              }
              
              if (chunkData && chunkData.length > 0) {
                allData = allData.concat(chunkData);
                setSunskySKUs([...allData]); // Update state with progress
                from += chunkSize;
                console.log(`Background loaded: ${allData.length}/${count} SKUs`);
                
                // Small delay to prevent overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 100));
              } else {
                break;
              }
            }
            
            console.log(`Finished loading all ${allData.length} SKUs`);
          } catch (error) {
            console.error('Background loading error:', error);
          }
        }, 100);
      }
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

  // Fetch PO Orders
  const fetchPOOrders = async () => {
    try {
      console.log('Fetching all PO orders...');
      
      // Remove the default 1000 row limit by fetching in chunks
      let allData: any[] = [];
      let from = 0;
      const chunkSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await (supabase as any)
          .from('po_orders')
          .select(`
            *,
            sunsky_sku:sunsky_skus(*)
          `)
          .order('created_at', { ascending: false })
          .range(from, from + chunkSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = allData.concat(data);
          from += chunkSize;
          hasMore = data.length === chunkSize;
          console.log(`Fetched ${allData.length} PO orders so far...`);
        } else {
          hasMore = false;
        }

        // Safety break to prevent infinite loops
        if (from > 50000) {
          console.warn('Reached maximum fetch limit of 50,000 PO orders');
          hasMore = false;
        }
      }

      console.log(`Total PO orders fetched: ${allData.length}`);
      setPOOrders(allData);
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