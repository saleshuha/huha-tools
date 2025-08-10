import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SunskySKU {
  id: string;
  user_id: string;
  sku_code: string;
  title?: string;
  cost?: number;
  weight?: number;
  currency?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

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
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'closed' | 'cancelled';
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [shippingRate, setShippingRate] = useState(0.005); // Default: 0.005 AED per gram
  const { toast } = useToast();

  // Fetch ALL data using edge function (completely bypasses client limits)
  const fetchAllData = async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Starting data fetch...');
    
    try {
      console.log('Fetching ALL data using edge function...');
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session found:', !!session);
      console.log('Access token found:', !!session?.access_token);
      
      if (!session?.access_token) {
        throw new Error('No authentication session found');
      }

      setLoadingProgress(10);
      setLoadingStatus('Connecting to server...');
      console.log('Calling edge function...');
      
      // Simulate progress during the function call
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
        setLoadingStatus(prev => {
          if (prev.includes('SKUs')) return 'Loading PO orders...';
          if (prev.includes('server')) return 'Loading SKUs...';
          return prev;
        });
      }, 500);
      
      // Call our edge function that bypasses all limits
      const { data, error } = await supabase.functions.invoke('get-all-po-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setLoadingProgress(95);
      setLoadingStatus('Processing data...');

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from edge function');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setLoadingProgress(100);
      setLoadingStatus('Finalizing...');

      console.log('Edge function response:', data.message);
      
      // Update state with ALL data
      setSunskySKUs(data.data.sunskySKUs || []);
      setPOOrders(data.data.poOrders || []);

      console.log(`Successfully loaded ${data.data.sunskySKUs?.length || 0} SKUs and ${data.data.poOrders?.length || 0} PO orders`);
      
      setLoadingStatus(`Loaded ${data.data.sunskySKUs?.length || 0} SKUs and ${data.data.poOrders?.length || 0} PO orders`);
      
      toast({
        title: "Success",
        description: data.message || "Data refreshed successfully"
      });
      
    } catch (error) {
      console.error('Error fetching all data:', error);
      setLoadingStatus('Failed to load data');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch data. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
      }, 1000);
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
      const { data: profile, error: profileError } = await supabase
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
      const { data, error } = await supabase
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
            const { data: chunkData, error: chunkError } = await supabase
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
                const { data: skuData, error: skuError } = await supabase
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
        
        await fetchAllData();
        toast({
          title: "Success",
          description: `Added ${successCount} new SKUs. ${duplicateCount} SKUs already existed. ${errorCount} failed.`
        });
        return;
      }

      await fetchAllData();
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

  // Process PO files with mapped data - Updated to handle new mandatory fields
  const processPOFiles = async (mappedData: any[]) => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
            sku_user_id: user.id, // Set to current user ID for compatibility
            user_id: user.id, // Add user_id for RLS policies
            country: undefined, // Will be set by trigger
            currency: undefined, // Will be set by trigger
            total_cost: undefined // Will be calculated by trigger
          });
        }
      });

      if (validOrders.length > 0) {
        const { data, error } = await supabase
          .from('po_orders')
          .insert(validOrders)
          .select();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        await fetchAllData();
        toast({
          title: "Success",
          description: `Processed ${validOrders.length} PO items from ${new Set(mappedData.map(item => item.file_name)).size} file(s). ${mappedData.length - validOrders.length} items skipped due to missing mandatory fields.`
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
      setIsLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: POOrder['status']) => {
    try {
      const { error } = await supabase
        .from('po_orders')
        .update({ 
          status,
          order_date: status === 'ordered' ? new Date().toISOString() : undefined
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchAllData();
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
      const { error } = await supabase
        .from('po_orders')
        .update(trackingData)
        .eq('id', orderId);

      if (error) throw error;

      await fetchAllData();
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
    fetchAllData();
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
    loadingProgress,
    loadingStatus,
    shippingRate,
    addSKUs,
    processPOFiles,
    updateOrderStatus,
    updateTrackingInfo,
    updateShippingRate,
    refetch: fetchAllData
  };
};