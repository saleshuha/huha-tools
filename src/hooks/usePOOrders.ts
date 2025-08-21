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

  // Fetch PO orders using raw data by default, with option for deduplicated view
  const fetchPOOrders = useCallback(async (useRawData = true) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Initializing...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(20);
      setLoadingStatus(`Fetching all PO orders ${useRawData ? '(raw data)' : '(deduplicated)'}...`);

      // Use raw or deduplicated function based on flag
      const functionName = useRawData ? 'get_all_po_orders_raw' : 'get_all_po_orders_deduplicated';
      const { data: ordersData, error } = await supabase.rpc(
        functionName,
        { user_id_param: user.id }
      );

      if (error) throw error;

      const allOrders = ordersData || [];
      
      setLoadingProgress(70);
      setLoadingStatus('Processing orders data...');

      // Convert to POOrder format
      const processedOrders: POOrder[] = allOrders.map(order => ({
        ...order,
        status: order.status as POOrder['status'],
      }));

      setLoadingProgress(90);
      setLoadingStatus('Finalizing...');

      // Log accurate metrics for verification
      const totalQuantity = processedOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      const uniquePONumbers = new Set(processedOrders.map(o => o.po_number)).size;
      const activeOrders = processedOrders.filter(o => ['pending', 'ordered', 'shipped'].includes(o.status));
      const activeQuantity = activeOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);

      console.log(`✅ DATABASE FUNCTION RESULTS (CANONICAL):`);
      console.log(`📦 Total Orders: ${processedOrders.length}`);
      console.log(`📋 Total Quantity: ${totalQuantity}`);
      console.log(`📄 Unique PO Numbers: ${uniquePONumbers}`);
      console.log(`🔄 Active Orders: ${activeOrders.length}`);
      console.log(`📊 Active Quantity: ${activeQuantity}`);

      setPOOrders(processedOrders);
      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${processedOrders.length} orders (${totalQuantity} total qty)`);

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
      }, 1000);
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

      // Validate each item and collect errors
      const validationErrors: string[] = [];
      const validItems = mappedData.filter(item => {
        // Required fields: po_number, quantity, file_name
        if (!item.po_number?.trim()) {
          validationErrors.push(`Missing PO number for row`);
          return false;
        }
        
        if (!item.quantity || isNaN(Number(item.quantity))) {
          validationErrors.push(`Invalid quantity for PO ${item.po_number}`);
          return false;
        }

        // Must have either model_number or asin (relaxed validation)
        if (!item.model_number?.trim() && !item.asin?.trim()) {
          validationErrors.push(`Missing both model_number and asin for PO ${item.po_number}`);
          return false;
        }

        return true;
      });
      
      console.log(`🔍 Validation results: ${validItems.length}/${mappedData.length} items passed validation`);
      
      if (validationErrors.length > 0) {
        console.log('❌ Validation errors:', validationErrors.slice(0, 5)); // Log first 5 errors
      }

      setLoadingProgress(50);
      setLoadingStatus('Processing valid items...');

      const validOrders: any[] = [];
      const duplicateCount = { count: 0 };

      validItems.forEach(item => {
        // Check for duplicates based on key identifying fields - only within same PO number
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
          console.log(`Skipping duplicate PO: ${item.po_number} - ${item.model_number || item.asin}`);
          return; // Skip this item
        }
        
        validOrders.push({
          po_number: item.po_number,
          ship_to_location: item.ship_to_location || 'Not specified',
          asin: item.asin || null,
          model_number: item.model_number || null,
          title: item.title || 'Title not provided',
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
        // Improved upload result message
        const totalProcessed = mappedData.length;
        const totalValid = validItems.length;
        const totalInserted = validOrders.length;
        const totalSkipped = totalProcessed - totalValid;
        const totalDuplicates = duplicateCount.count;

        let message = `Processed ${totalProcessed} rows: `;
        let details = [];
        
        if (totalInserted > 0) {
          details.push(`${totalInserted} inserted`);
        }
        if (totalDuplicates > 0) {
          details.push(`${totalDuplicates} duplicates skipped`);
        }
        if (totalSkipped > 0) {
          details.push(`${totalSkipped} invalid rows skipped`);
        }
        
        message += details.join(', ');

        if (validOrders.length > 0) {
          toast({
            title: "PO Upload Complete",
            description: message,
          });
        } else {
          toast({
            title: "Upload Issues", 
            description: `No valid orders could be processed. ${totalSkipped} rows had missing required fields, ${totalDuplicates} were duplicates.`,
            variant: "destructive"
          });
        }
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