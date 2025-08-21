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
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'closed';
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

  // Fetch PO orders using the unlimited RPC function
  const fetchPOOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Loading PO orders...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(10);
      setLoadingStatus('Fetching all PO orders...');

      // Use the unlimited RPC function to get ALL records
      const { data: allPOOrders, error } = await supabase
        .rpc('get_all_po_orders_unlimited', { 
          user_id_param: user.id 
        });

      if (error) throw error;

      console.log(`✅ Fetched ${allPOOrders?.length || 0} PO orders from RPC function`);
      
      // Verify no duplicates by checking unique IDs
      const uniqueIds = new Set();
      const uniquePOOrders = [];
      let duplicateCount = 0;
      
      for (const order of allPOOrders || []) {
        if (uniqueIds.has(order.id)) {
          duplicateCount++;
          console.warn(`🚨 Duplicate ID found: ${order.id}`);
        } else {
          uniqueIds.add(order.id);
          uniquePOOrders.push(order);
        }
      }
      
      if (duplicateCount > 0) {
        console.warn(`🚨 Removed ${duplicateCount} duplicate records`);
      }

      // Debug quantity calculation
      const totalQuantityDebug = uniquePOOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      console.log(`🔢 Total quantity from clean data: ${totalQuantityDebug} from ${uniquePOOrders.length} unique records`);

      setLoadingProgress(60);
      setLoadingStatus('Fetching Sunsky SKU data...');

      // Fetch Sunsky SKU data for matching
      const sunskySKUs = new Map();
      if (uniquePOOrders.length > 0) {
        const allSkuCodes = [...new Set(uniquePOOrders.map(order => order.sku_code || order.model_number).filter(Boolean))];
        
        if (allSkuCodes.length > 0) {
          // Fetch SKUs in batches to avoid URL length limits
          const skuBatchSize = 100;
          for (let i = 0; i < allSkuCodes.length; i += skuBatchSize) {
            const skuBatch = allSkuCodes.slice(i, i + skuBatchSize);
            
            const { data: skuData, error: skuError } = await supabase
              .from('sunsky_skus')
              .select('*')
              .eq('user_id', user.id)
              .in('sku_code', skuBatch);

            if (skuError) {
              console.warn('Error fetching SKU batch:', skuError);
            } else if (skuData) {
              skuData.forEach(sku => {
                sunskySKUs.set(sku.sku_code, sku);
              });
            }
          }
        }
      }

      setLoadingProgress(80);
      setLoadingStatus('Processing order data...');

      // Map orders with their corresponding SKU data
      const allOrders = uniquePOOrders.map(order => ({
        ...order,
        status: order.status as POOrder['status'],
        sunsky_sku: sunskySKUs.get(order.sku_code) || sunskySKUs.get(order.model_number) || null
      }));

      // Final verification
      const finalQuantity = allOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      console.log(`🎯 FINAL VERIFICATION: ${allOrders.length} orders, ${finalQuantity} total quantity`);

      setPOOrders(allOrders);

      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${allOrders.length} PO orders`);

    } catch (error) {
      console.error('❌ Error fetching PO orders:', error);
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

  // Process PO files with mapped data - Updated to handle new mandatory fields and prevent duplicates
  const processPOFiles = useCallback(async (mappedData: any[], sunskySKUs: any[]) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Processing PO files...');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(10);
      setLoadingStatus('Fetching existing PO orders...');

      // Fetch existing PO orders to check for duplicates
      const { data: existingPOs, error: fetchError } = await supabase
        .from('po_orders')
        .select('po_number, sku_code, asin, model_number, quantity, ship_to_location')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      setLoadingProgress(30);
      setLoadingStatus('Checking for duplicates...');

      const validOrders: any[] = [];
      const duplicateCount = { count: 0 };

      mappedData.forEach(item => {
        // Validate that all mandatory fields are present
        if (item.po_number && item.ship_to_location && item.asin && 
            item.model_number && item.title && item.quantity) {
          
          // Check for duplicates based on key identifying fields
          const isDuplicate = existingPOs?.some(existing => 
            existing.po_number === item.po_number &&
            existing.sku_code === (item.model_number || item.asin) &&
            existing.asin === item.asin &&
            existing.model_number === item.model_number &&
            existing.quantity === item.quantity &&
            existing.ship_to_location === item.ship_to_location
          );

          if (isDuplicate) {
            duplicateCount.count++;
            console.log(`Skipping duplicate PO: ${item.po_number} - ${item.model_number}`);
            return; // Skip this item
          }
          
          validOrders.push({
            po_number: item.po_number,
            ship_to_location: item.ship_to_location,
            asin: item.asin,
            model_number: item.model_number,
            title: item.title,
            quantity: item.quantity,
            sku_code: item.model_number || item.asin, // Use model_number as sku_code, fallback to asin
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
      setLoadingStatus(`Inserting ${validOrders.length} new orders...`);

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
        
        const skippedCount = mappedData.length - validOrders.length - duplicateCount.count;
        const fileCount = new Set(mappedData.map(item => item.file_name)).size;
        
        let description = `Processed ${validOrders.length} new PO items from ${fileCount} file(s)`;
        
        if (duplicateCount.count > 0) {
          description += `. ${duplicateCount.count} duplicates skipped`;
        }
        
        if (skippedCount > 0) {
          description += `. ${skippedCount} items skipped due to missing mandatory fields`;
        }

        toast({
          title: "Success",
          description
        });
      } else {
        const message = duplicateCount.count > 0 
          ? `All ${duplicateCount.count} items were duplicates and skipped`
          : "No valid orders found - all items are missing required fields";
        
        toast({
          title: duplicateCount.count > 0 ? "No new orders to process" : "No valid orders found",
          description: message,
          variant: duplicateCount.count > 0 ? "default" : "destructive"
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

  // Get model numbers from PO orders for Sunsky search - returns total count and unique models
  const getPOModelNumbers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Fetching ALL PO orders from database...');

      // Fetch ALL PO orders in batches to avoid any limits
      let allPOOrders = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from('po_orders')
          .select('id, model_number, sku_code, title, po_number, status')
          .eq('user_id', user.id)
          .not('status', 'in', '("completed", "cancelled", "delivered")')  // Only active POs
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (batch && batch.length > 0) {
          allPOOrders = [...allPOOrders, ...batch];
          console.log(`Fetched batch ${page + 1}: ${batch.length} active PO records (total so far: ${allPOOrders.length})`);
          
          if (batch.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Fetched ${allPOOrders.length} total ACTIVE PO orders from database`);

      // Extract model numbers from all PO orders
      const itemsWithModelNumbers = allPOOrders.filter(item => 
        item.model_number && 
        item.model_number.trim() !== ''
      );
      
      const allModelNumbers = itemsWithModelNumbers.map(item => item.model_number);
      const uniqueModelNumbers = [...new Set(allModelNumbers)];
      
      console.log(`📊 Found ${allModelNumbers.length} PO items with model numbers`);
      console.log(`🔍 Found ${uniqueModelNumbers.length} unique model numbers across all POs`);
      
      // Now filter out already imported products for processing
      let existingSKUCodes = new Set();
      
      if (uniqueModelNumbers.length > 0) {
        // Batch the SKU lookup to avoid URL length limits
        const batchSize = 100;
        for (let i = 0; i < uniqueModelNumbers.length; i += batchSize) {
          const batch = uniqueModelNumbers.slice(i, i + batchSize);
          
          const { data: existingSKUs, error: skusError } = await supabase
            .from('sunsky_skus')
            .select('sku_code')
            .eq('user_id', user.id)
            .in('sku_code', batch);

          if (skusError) {
            console.warn('Error checking existing SKUs:', skusError);
          } else if (existingSKUs) {
            existingSKUs.forEach(sku => existingSKUCodes.add(sku.sku_code));
          }
        }
      }

      const uniqueModelNumbersToProcess = uniqueModelNumbers.filter(modelNumber => !existingSKUCodes.has(modelNumber));
      
      console.log(`✅ ${existingSKUCodes.size} items already imported`);
      console.log(`⚡ ${uniqueModelNumbersToProcess.length} unique items need processing`);
      
      return {
        totalCount: allModelNumbers.length,            // Total PO items with model numbers
        uniqueCount: uniqueModelNumbersToProcess.length, // Items that need processing
        uniqueModels: uniqueModelNumbersToProcess,       // Model numbers to process
        allModels: allModelNumbers,                      // All model numbers
        totalUniqueCount: uniqueModelNumbers.length,     // Total unique across all POs
        alreadyImportedCount: existingSKUCodes.size      // Already imported count
      };
    } catch (error) {
      console.error('Error fetching PO model numbers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PO model numbers",
        variant: "destructive"
      });
      return {
        totalCount: 0,
        uniqueCount: 0,
        uniqueModels: [],
        allModels: [],
        totalUniqueCount: 0,
        alreadyImportedCount: 0
      };
    }
  }, [toast]);

  return {
    poOrders,
    isLoading,
    loadingProgress,
    loadingStatus,
    fetchPOOrders,
    processPOFiles,
    updateOrderStatus,
    updateTrackingInfo,
    getPOModelNumbers
  };
};