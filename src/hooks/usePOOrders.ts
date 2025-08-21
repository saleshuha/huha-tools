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
    setLoadingStatus('Fetching PO orders...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(30);
      
      // Use raw data function to get all orders without batching
      const { data: ordersData, error } = await supabase.rpc(
        'get_all_po_orders_raw',
        { user_id_param: user.id }
      );

      if (error) throw error;

      setLoadingProgress(70);
      setLoadingStatus('Processing orders...');

      // Convert to POOrder format
      const processedOrders: POOrder[] = (ordersData || []).map(order => ({
        ...order,
        status: order.status as POOrder['status'],
      }));

      // Log PO 8RGH1C7S details for debugging
      const po8RGH1C7S = processedOrders.filter(o => o.po_number === '8RGH1C7S');
      if (po8RGH1C7S.length > 0) {
        const totalQty8RGH1C7S = po8RGH1C7S.reduce((sum, order) => sum + (order.quantity || 0), 0);
        console.log(`🔍 PO 8RGH1C7S from DB: ${po8RGH1C7S.length} orders, ${totalQty8RGH1C7S} total qty`);
      }

      setPOOrders(processedOrders);
      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${processedOrders.length} orders`);

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

  // Process PO files with mapped data - Enhanced with job tracking
  const processPOFiles = useCallback(async (mappedData: any[], sunskySKUs: any[] = [], jobId?: string) => {
    console.log('Processing PO Files - Starting with', mappedData.length, 'items');
    
    if (mappedData.length === 0) {
      toast({
        title: "Error",
        description: "No data to process",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus("Initializing...");

    let insertedCount = 0;
    let skippedDuplicates = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update job status to processing if jobId provided
      if (jobId) {
        await supabase
          .from('po_upload_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            progress_percentage: 0
          })
          .eq('id', jobId);
      }

      const totalItems = mappedData.length;
      const batchSize = 10; // Process in smaller batches for better progress tracking

      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = mappedData.slice(i, i + batchSize);
        setLoadingStatus(`Processing items ${i + 1} to ${Math.min(i + batchSize, totalItems)} of ${totalItems}...`);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (item, batchIndex) => {
            try {
              // Check for duplicates
              const { data: existing, error: checkError } = await supabase
                .from('po_orders')
                .select('id')
                .eq('user_id', user.id)
                .eq('po_number', item.po_number)
                .eq('sku_code', item.model_number)
                .eq('quantity', item.quantity);

              if (checkError) throw checkError;

              if (existing && existing.length > 0) {
                skippedDuplicates++;
                return { status: 'skipped', message: `Duplicate: ${item.model_number}` };
              }

              // Insert new PO order
              const { error: insertError } = await supabase
                .from('po_orders')
                .insert({
                  user_id: user.id,
                  po_number: item.po_number,
                  sku_code: item.model_number,
                  quantity: item.quantity,
                  ship_to_location: item.ship_to_location,
                  asin: item.asin,
                  model_number: item.model_number,
                  title: item.title,
                  external_id: item.external_id,
                  external_id_type: item.external_id_type,
                  file_name: item.file_name,
                  status: 'pending',
                  job_id: jobId || null,
                  sku_user_id: user.id
                });

              if (insertError) throw insertError;

              insertedCount++;
              return { status: 'success', message: `Inserted: ${item.model_number}` };
            } catch (error) {
              errorCount++;
              const errorMsg = `Row ${i + batchIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              
              // Log error to job errors table if jobId provided
              if (jobId) {
                try {
                  await supabase
                    .from('po_upload_job_errors')
                    .insert({
                      job_id: jobId,
                      row_number: i + batchIndex + 1,
                      error_type: 'processing_error',
                      error_message: errorMsg,
                      row_data: item
                    });
                } catch (logError) {
                  console.error('Failed to log error:', logError);
                }
              }
              
              return { status: 'error', message: errorMsg };
            }
          })
        );

        // Update progress
        const processedSoFar = Math.min(i + batchSize, totalItems);
        const progressPercent = Math.round((processedSoFar / totalItems) * 100);
        setLoadingProgress(progressPercent);

        // Update job progress if jobId provided
        if (jobId) {
          await supabase
            .from('po_upload_jobs')
            .update({
              processed_rows: processedSoFar,
              success_rows: insertedCount,
              error_rows: errorCount,
              progress_percentage: progressPercent
            })
            .eq('id', jobId);
        }

        // Small delay to prevent overwhelming the database
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Final status update
      setLoadingStatus("Finalizing...");
      
      // Update job completion status
      if (jobId) {
        await supabase
          .from('po_upload_jobs')
          .update({
            status: errorCount === totalItems ? 'failed' : 'completed',
            completed_at: new Date().toISOString(),
            progress_percentage: 100,
            error_message: errorCount > 0 ? `${errorCount} items failed processing` : null
          })
          .eq('id', jobId);
      }

      // Refresh data
      await fetchPOOrders(true);

      // Show success message
      const successMessage = errorCount > 0
        ? `Processing completed with issues: ${insertedCount} inserted, ${skippedDuplicates} duplicates skipped, ${errorCount} errors`
        : `Successfully processed ${insertedCount} PO orders${skippedDuplicates > 0 ? ` (${skippedDuplicates} duplicates skipped)` : ''}`;

      toast({
        title: errorCount > 0 ? "Processing Completed with Issues" : "Success",
        description: successMessage,
        variant: errorCount > 0 ? "default" : "default",
      });

    } catch (error) {
      console.error('Fatal error during PO processing:', error);
      
      // Update job to failed status
      if (jobId) {
        await supabase
          .from('po_upload_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Fatal processing error'
          })
          .eq('id', jobId);
      }

      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred during processing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
      setLoadingStatus("");
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
    getPOModelNumbers
  };
};