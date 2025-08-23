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
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'closed' | 'partial-fulfilled';
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

  // Fetch PO orders using direct query to load all data without limits
  const fetchPOOrders = useCallback(async (useRawData = true) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Fetching PO orders...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(30);
      
      console.log('🔄 Starting PO orders fetch for user:', user.id);
      
      // First, get all PO orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('po_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('❌ Error fetching PO orders:', ordersError);
        throw ordersError;
      }

      console.log('📊 Fetched PO orders:', ordersData?.length);

      setLoadingProgress(50);
      
      // Then get all sunsky_skus for this user to join manually
      const { data: sunskyData, error: sunskyError } = await supabase
        .from('sunsky_skus')
        .select('*')
        .eq('user_id', user.id);

      if (sunskyError) {
        console.warn('⚠️ Error fetching Sunsky SKUs (non-critical):', sunskyError);
      }

      console.log('📦 Fetched Sunsky SKUs:', sunskyData?.length || 0);

      setLoadingProgress(70);
      setLoadingStatus('Processing orders...');

      // Create a lookup map for sunsky SKUs
      const sunskyMap = new Map();
      if (sunskyData) {
        sunskyData.forEach(sku => {
          sunskyMap.set(sku.sku_code, sku);
        });
      }

      // Join the data manually and convert to POOrder format
      const processedOrders: POOrder[] = (ordersData || []).map(order => {
        // Try to find matching sunsky SKU by sku_code or model_number
        let matchingSunsky = null;
        if (order.sku_code) {
          matchingSunsky = sunskyMap.get(order.sku_code);
        }
        if (!matchingSunsky && order.model_number) {
          matchingSunsky = sunskyMap.get(order.model_number);
        }

        return {
          ...order,
          status: order.status as POOrder['status'],
          sunsky_sku: matchingSunsky || null,
        };
      });

      console.log(`✅ Processed ${processedOrders.length} PO orders with SKU matching`);

      setPOOrders(processedOrders);
      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${processedOrders.length} orders`);

    } catch (error) {
      console.error('❌ Error in fetchPOOrders:', error);
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

  // Process PO files with mapped data - Process each order individually
  const processPOFiles = useCallback(async (mappedData: any[], sunskySKUs: any[]) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Processing PO files...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(20);
      setLoadingStatus('Validating order data...');

      // Process each order individually to ensure proper handling
      const processedResults = {
        inserted: 0,
        duplicates: 0,
        invalid: 0,
        errors: [] as string[],
        skippedReasons: [] as string[]  // Track why records were skipped
      };

      console.log(`📊 Starting processing of ${mappedData.length} rows from file`);

      for (let i = 0; i < mappedData.length; i++) {
        const item = mappedData[i];
        setLoadingProgress(20 + (i / mappedData.length) * 60);
        setLoadingStatus(`Processing order ${i + 1} of ${mappedData.length}...`);

        // Log each row for debugging
        console.log(`🔍 STAGE 3 Processing row ${i + 1}/${mappedData.length}:`, {
          po_number: item.po_number,
          quantity: item.quantity,
          model_number: item.model_number,
          asin: item.asin
        });

        // Validate required fields
        if (!item.po_number?.trim()) {
          processedResults.invalid++;
          const error = `Row ${i + 1}: Missing PO number`;
          processedResults.errors.push(error);
          processedResults.skippedReasons.push(error);
          console.log(`❌ STAGE 3 SKIP: ${error}`);
          continue;
        }
        
        if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
          processedResults.invalid++;
          const error = `Row ${i + 1}: Invalid quantity for PO ${item.po_number} (value: ${item.quantity})`;
          processedResults.errors.push(error);
          processedResults.skippedReasons.push(error);
          console.log(`❌ STAGE 3 SKIP: ${error}`);
          continue;
        }

        if (!item.model_number?.trim() && !item.asin?.trim()) {
          processedResults.invalid++;
          const error = `Row ${i + 1}: Missing both model_number and asin for PO ${item.po_number}`;
          processedResults.errors.push(error);
          processedResults.skippedReasons.push(error);
          console.log(`❌ STAGE 3 SKIP: ${error}`);
          continue;
        }

        // Check for duplicates
        const { data: existing, error: checkError } = await supabase
          .from('po_orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('po_number', item.po_number)
          .eq('sku_code', item.model_number || item.asin)
          .eq('quantity', Number(item.quantity))
          .maybeSingle();

        if (checkError) {
          const error = `Row ${i + 1}: Database error checking duplicates`;
          processedResults.errors.push(error);
          processedResults.skippedReasons.push(error);
          console.log(`❌ STAGE 3 SKIP: ${error}:`, checkError);
          continue;
        }

        if (existing) {
          processedResults.duplicates++;
          const skip = `Row ${i + 1}: Duplicate found for PO ${item.po_number}, SKU ${item.model_number || item.asin}`;
          processedResults.skippedReasons.push(skip);
          console.log(`⚠️ STAGE 3 SKIP (DUPLICATE): ${skip}`);
          continue;
        }

        // Insert individual order
        const orderData = {
          po_number: item.po_number.trim(),
          ship_to_location: item.ship_to_location?.trim() || 'Not specified',
          asin: item.asin?.trim() || null,
          model_number: item.model_number?.trim() || null,
          title: item.title?.trim() || 'Title not provided',
          quantity: Number(item.quantity),
          sku_code: (item.model_number?.trim() || item.asin?.trim()),
          external_id: item.external_id?.trim() || null,
          external_id_type: item.external_id_type?.trim() || null,
          status: 'pending',
          file_name: item.file_name,
          unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
          sku_user_id: user.id,
          user_id: user.id
        };

        const { error: insertError } = await supabase
          .from('po_orders')
          .insert([orderData]);

        if (insertError) {
          const error = `Row ${i + 1}: ${insertError.message}`;
          processedResults.errors.push(error);
          processedResults.skippedReasons.push(error);
          console.log(`❌ Insert error: ${error}`);
          continue;
        }

        processedResults.inserted++;
        console.log(`✅ Row ${i + 1}: Successfully inserted`);
      }

      console.log(`📊 STAGE 3 (DATABASE) PROCESSING SUMMARY:`);
      console.log(`🔢 Records received from Stage 2: ${mappedData.length}`);
      console.log(`✅ Successfully inserted into database: ${processedResults.inserted}`);
      console.log(`❌ Stage 3 validation failures: ${processedResults.invalid}`);
      console.log(`⚠️ Duplicates skipped: ${processedResults.duplicates}`);
      console.log(`🎯 FINAL RESULT: ${processedResults.inserted} records in database`);
      
      if (processedResults.skippedReasons.length > 0) {
        console.log('❌ Stage 3 skip reasons:', processedResults.skippedReasons);
      }

      console.log('\n🏁 COMPLETE PROCESSING PIPELINE SUMMARY:');
      console.log('Stage 1: File Parsing & Empty Row Removal (see above)');
      console.log('Stage 2: Column Mapping & Field Validation (see above)');
      console.log(`Stage 3: Database Validation & Insert = ${processedResults.inserted} final records`);
      console.log('\n💡 If your final count is less than expected, check the Stage 1 and Stage 2 logs above for skipped rows.');

      setLoadingProgress(90);
      setLoadingStatus('Refreshing order list...');
      
      await fetchPOOrders();

      // Show results
      const totalProcessed = mappedData.length;
      let message = `Processed ${totalProcessed} rows: `;
      let details = [];
      
      if (processedResults.inserted > 0) {
        details.push(`${processedResults.inserted} inserted`);
      }
      if (processedResults.duplicates > 0) {
        details.push(`${processedResults.duplicates} duplicates skipped`);
      }
      if (processedResults.invalid > 0) {
        details.push(`${processedResults.invalid} invalid rows`);
      }
      
      message += details.join(', ');

      if (processedResults.errors.length > 0) {
        console.log('Processing errors:', processedResults.errors.slice(0, 10));
        console.log('All skipped reasons:', processedResults.skippedReasons);
      }

      toast({
        title: processedResults.inserted > 0 ? "PO Upload Complete" : "Upload Issues",
        description: message,
        variant: processedResults.inserted > 0 ? "default" : "destructive"
      });

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

  // Bulk update order status
  const bulkUpdateOrderStatus = useCallback(async (fromStatus: POOrder['status'], toStatus: POOrder['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: ordersToUpdate, error: fetchError } = await supabase
        .from('po_orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', fromStatus);

      if (fetchError) throw fetchError;

      if (!ordersToUpdate || ordersToUpdate.length === 0) {
        toast({
          title: "No Orders Found",
          description: `No orders with status "${fromStatus}" found to update`,
          variant: "destructive"
        });
        return { count: 0 };
      }

      const { error } = await supabase
        .from('po_orders')
        .update({ 
          status: toStatus,
          order_date: toStatus === 'ordered' ? new Date().toISOString() : null
        })
        .eq('user_id', user.id)
        .eq('status', fromStatus);

      if (error) throw error;

      await fetchPOOrders();
      
      toast({
        title: "Bulk Update Successful",
        description: `${ordersToUpdate.length} orders updated from "${fromStatus}" to "${toStatus}"`
      });

      return { count: ordersToUpdate.length };
    } catch (error) {
      console.error('Error bulk updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to bulk update order status",
        variant: "destructive"
      });
      return { count: 0 };
    }
  }, [fetchPOOrders, toast]);

  // Get model numbers from PO orders for Sunsky search - simplified without batching
  const getPOModelNumbers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get all active PO orders directly without batching
      const { data: allPOOrders, error } = await supabase
        .from('po_orders')
        .select('model_number, sku_code, title, po_number, status')
        .eq('user_id', user.id)
        .not('status', 'in', '("completed", "cancelled", "delivered")')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${allPOOrders?.length || 0} active PO orders`);

      // Extract model numbers
      const itemsWithModelNumbers = (allPOOrders || []).filter(item => 
        item.model_number && item.model_number.trim() !== ''
      );
      
      const allModelNumbers = itemsWithModelNumbers.map(item => item.model_number);
      const uniqueModelNumbers = [...new Set(allModelNumbers)];
      
      // Get existing SKUs
      const { data: existingSKUs, error: skusError } = await supabase
        .from('sunsky_skus')
        .select('sku_code')
        .eq('user_id', user.id);

      const existingSKUCodes = new Set((existingSKUs || []).map(sku => sku.sku_code));
      const uniqueModelNumbersToProcess = uniqueModelNumbers.filter(modelNumber => 
        !existingSKUCodes.has(modelNumber)
      );
      
      console.log(`📊 Found ${allModelNumbers.length} PO items with model numbers`);
      console.log(`🔍 ${uniqueModelNumbers.length} unique model numbers`);
      console.log(`⚡ ${uniqueModelNumbersToProcess.length} need processing`);
      
      return {
        totalCount: allModelNumbers.length,
        uniqueCount: uniqueModelNumbersToProcess.length,
        uniqueModels: uniqueModelNumbersToProcess,
        allModels: allModelNumbers,
        totalUniqueCount: uniqueModelNumbers.length,
        alreadyImportedCount: existingSKUCodes.size
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
    getPOModelNumbers,
    bulkUpdateOrderStatus
  };
};