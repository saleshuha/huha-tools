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
  printed_quantity?: number;
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
  is_printed?: boolean;
  sunsky_sku?: any;
}

export const usePOOrders = () => {
  const [poOrders, setPOOrders] = useState<POOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const { toast } = useToast();

  // Fetch PO orders using deduplicated function to avoid double counting
  const fetchPOOrders = useCallback(async (useRawData = false) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Fetching PO orders...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(30);
      
      console.log('🔄 Starting deduplicated PO orders fetch for user:', user.id);
      
       // Since PostgREST limits results to 1000, we need to fetch all pages manually
       let allOrders: any[] = [];
       let page = 0;
       const pageSize = 1000;
       let hasMore = true;

       console.log('🔄 Starting paginated fetch to get ALL PO orders...');

       while (hasMore) {
         const startRange = page * pageSize;
         const endRange = startRange + pageSize - 1;
         
         console.log(`📄 Fetching PO orders page ${page + 1} (rows ${startRange}-${endRange})...`);
         
         const { data: pageData, error } = await supabase
           .from('po_orders')
            .select(`
              id, user_id, po_number, sku_code, quantity, status,
              order_date, expected_delivery, notes, file_name, country,
              currency, unit_cost, total_cost, sku_user_id, 
              supplier_order_number, tracking_number, tracking_url,
              created_at, updated_at, ship_to_location, asin,
              model_number, title, external_id, external_id_type, is_printed, printed_quantity
            `)
           .eq('user_id', user.id)
           .range(startRange, endRange)
           .order('created_at', { ascending: false });

         if (error) {
           console.error('❌ Error fetching PO orders page:', error);
           throw error;
         }

         if (pageData && pageData.length > 0) {
           allOrders = [...allOrders, ...pageData];
           console.log(`✅ Page ${page + 1}: fetched ${pageData.length} records (total so far: ${allOrders.length})`);
           
           // Continue if this page was full
           hasMore = pageData.length === pageSize;
           page++;
         } else {
           hasMore = false;
         }

         // Safety limit
         if (page > 20) {
           console.warn(`⚠️ Reached safety limit of 20 pages (${allOrders.length} records)`);
           break;
         }
       }

       console.log(`📊 Total PO orders fetched via pagination: ${allOrders.length}`);
       
       // Debug specific PO
       const debugPO = '8RGH1C7S';
       const debugPOOrders = allOrders.filter(order => order.po_number === debugPO);
       console.log(`🔍 DEBUG: PO ${debugPO} has ${debugPOOrders.length} orders with total quantity:`, 
         debugPOOrders.reduce((sum, order) => sum + (order.quantity || 0), 0));

       setLoadingProgress(70);
       setLoadingStatus('Processing orders...');

       // Convert to POOrder format  
       const processedOrders: POOrder[] = allOrders.map(order => ({
         ...order,
         status: order.status as POOrder['status'],
       }));

      console.log(`✅ Processed ${processedOrders.length} deduplicated PO orders`);
      
      // Debug specific PO after processing
      const debugProcessedPOOrders = processedOrders.filter(order => order.po_number === debugPO);
      console.log(`🔍 DEBUG AFTER PROCESSING: PO ${debugPO} has ${debugProcessedPOOrders.length} orders with total quantity:`, 
        debugProcessedPOOrders.reduce((sum, order) => sum + (order.quantity || 0), 0));

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

  // Process PO files with identity-based duplicate detection
  const processPOFiles = useCallback(async (mappedData: any[], sunskySKUs: any[], selectedCountry: string = 'UAE') => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Processing PO files...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log(`🚀 STARTING PO PROCESSING: ${mappedData.length} rows from file`);

      setLoadingProgress(10);
      setLoadingStatus('Loading existing PO identities for duplicate detection...');

      // Fetch existing PO identities for duplicate detection
      const { data: existingOrders, error: fetchError } = await supabase
        .from('po_orders')
        .select('po_key, item_key, po_number, model_number, asin, sku_code')
        .eq('user_id', user.id);

      if (fetchError) {
        throw new Error(`Failed to fetch existing orders: ${fetchError.message}`);
      }

      console.log(`📊 EXISTING DATA: Found ${existingOrders?.length || 0} existing PO orders`);

      setLoadingProgress(20);
      setLoadingStatus('Building identity-based duplicate detection...');

      // Create identity-based duplicate detection
      const existingIdentities = new Set();
      
      (existingOrders || []).forEach(order => {
        if (order.po_key && order.item_key) {
          const identity = `${order.po_key}|${order.item_key}`;
          existingIdentities.add(identity);
          console.log(`🔎 DB Identity: "${identity}" from PO="${order.po_number}", Model="${order.model_number}", ASIN="${order.asin}", SKU="${order.sku_code}"`);
        }
      });

      console.log(`🔍 DUPLICATE DETECTION: Created ${existingIdentities.size} identity keys from existing data`);
      console.log(`📋 All existing identities:`, Array.from(existingIdentities).slice(0, 10));

      setLoadingProgress(30);
      setLoadingStatus('Processing and grouping incoming data by identity...');

      // Group items by identity and sum quantities within the file
      const itemGroups = new Map();
      const results = {
        processed: 0,
        inserted: 0,
        duplicates: 0,
        invalid: 0,
        errors: [] as string[],
        skipped: [] as string[]
      };

      // First pass: validate and group by identity
      for (let i = 0; i < mappedData.length; i++) {
        const item = mappedData[i];
        const rowNum = i + 1;
        
        setLoadingProgress(30 + (i / mappedData.length) * 30);
        setLoadingStatus(`Processing row ${rowNum}/${mappedData.length}...`);

        results.processed++;

        // === BASIC VALIDATION ===
        const po = item.po_number?.trim();
        const model = item.model_number?.trim();
        const asin = item.asin?.trim(); 
        const title = item.title?.trim() || 'Unknown Product';
        const qty = parseInt(item.quantity) || 0;
        const location = item.ship_to_location?.trim();

        // Validate required fields
        if (!po) {
          const error = `Row ${rowNum}: Missing PO number - "${title}"`;
          results.invalid++;
          results.errors.push(error);
          console.log(`❌ INVALID: ${error}`);
          continue;
        }

        if (qty <= 0) {
          const error = `Row ${rowNum}: Invalid quantity (${item.quantity}) - PO: ${po}, Product: "${title}"`;
          results.invalid++;
          results.errors.push(error);
          console.log(`❌ INVALID: ${error}`);
          continue;
        }

        if (!model && !asin) {
          const error = `Row ${rowNum}: Missing both Model Number and ASIN - PO: ${po}, Product: "${title}"`;
          results.invalid++;
          results.errors.push(error);
          console.log(`❌ INVALID: ${error}`);
          continue;
        }

        // === CREATE IDENTITY (must match SQL computed columns exactly) ===
        const poKey = po.toLowerCase().trim();
        
        // Match SQL: coalesce(nullif(model_number, ''), nullif(asin, ''), sku_code)
        let primarySku = '';
        if (model && model.trim() !== '') {
          primarySku = model.trim();
        } else if (asin && asin.trim() !== '') {
          primarySku = asin.trim();
        } else {
          primarySku = item.sku_code?.trim() || '';
        }
        const itemKey = primarySku.toLowerCase().trim();
        const identity = `${poKey}|${itemKey}`;

        console.log(`🔍 Row ${rowNum}: Identity="${identity}", Qty=${qty}, Title="${title.substring(0, 30)}...", PoKey="${poKey}", ItemKey="${itemKey}"`);

        // Check if already exists in database using the exact keys
        if (existingIdentities.has(identity)) {
          const skip = `Row ${rowNum}: Duplicate in database - "${title}" (Identity: ${identity})`;
          results.duplicates++;
          results.skipped.push(skip);
          console.log(`⚠️ DUPLICATE (DB): ${skip}`);
          continue;
        }

        // Group by identity within file
        if (itemGroups.has(identity)) {
          // Add to existing group
          const existingGroup = itemGroups.get(identity);
          existingGroup.quantity += qty;
          console.log(`📎 Row ${rowNum}: Added to existing group, new total qty: ${existingGroup.quantity}`);
        } else {
          // Create new group with selected country and currency
          const currency = selectedCountry === 'KSA' ? 'SAR' : 'AED';
          const newGroup = {
            po_number: po,
            ship_to_location: location || 'Not specified',
            asin: asin || null,
            model_number: model || null,
            title: title,
            quantity: qty,
            sku_code: primarySku,
            external_id: item.external_id?.trim() || null,
            external_id_type: item.external_id_type?.trim() || null,
            status: 'pending',
            file_name: item.file_name || 'uploaded-file.csv',
            unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
            country: selectedCountry,
            currency: currency,
            sku_user_id: user.id,
            user_id: user.id
          };
          itemGroups.set(identity, newGroup);
          console.log(`✨ Row ${rowNum}: Created new group with identity: ${identity}`);
        }
      }

      console.log(`\n📊 GROUPING SUMMARY:`);
      console.log(`📥 Rows processed: ${results.processed}`);
      console.log(`📦 Unique identities: ${itemGroups.size}`);
      console.log(`⚠️ DB duplicates skipped: ${results.duplicates}`);
      console.log(`❌ Invalid rows: ${results.invalid}`);

      // === BULK INSERT ===
      setLoadingProgress(70);
      setLoadingStatus(`Inserting ${itemGroups.size} unique items...`);

      const validOrdersToInsert = Array.from(itemGroups.values());

      if (validOrdersToInsert.length > 0) {
        console.log(`🚀 About to insert ${validOrdersToInsert.length} items. Sample data:`, validOrdersToInsert.slice(0, 2));
        
        const { error: insertError } = await supabase
          .from('po_orders')
          .upsert(validOrdersToInsert, {
            onConflict: 'user_id,po_key,item_key',
            ignoreDuplicates: true
          });

        if (insertError) {
          console.error('❌ Upsert error details:', insertError);
          throw new Error(`Bulk upsert failed: ${insertError.message}`);
        }

        results.inserted = validOrdersToInsert.length;
        console.log(`✅ Successfully upserted ${results.inserted} unique orders into database`);

        // Log first 5 inserted items for debugging
        const sampleItems = validOrdersToInsert.slice(0, 5).map(order => 
          `${order.po_number}/${order.model_number || order.asin || order.sku_code}`
        );
        console.log(`🔎 First 5 inserted items:`, sampleItems);
      }

      setLoadingProgress(95);
      setLoadingStatus('Refreshing PO data...');
      
      await fetchPOOrders();

      // === FINAL RESULTS ===
      console.log(`\n🏁 FINAL RESULTS:`);
      console.log(`📊 Total rows in file: ${mappedData.length}`);
      console.log(`✅ Successfully inserted: ${results.inserted} unique items`);
      console.log(`⚠️ Duplicates skipped: ${results.duplicates}`);
      console.log(`❌ Invalid/Errors: ${results.invalid}`);
      console.log(`🎯 Database enforces uniqueness on (user_id, po_key, item_key)`);

      // Show user-friendly results
      let message = `Processed ${results.processed} rows: `;
      let details = [];
      
      if (results.inserted > 0) details.push(`${results.inserted} unique items inserted`);
      if (results.duplicates > 0) details.push(`${results.duplicates} duplicates skipped`);
      if (results.invalid > 0) details.push(`${results.invalid} invalid`);
      
      message += details.join(', ');

      if (results.errors.length > 0) {
        console.log('🚨 First 5 processing errors:', results.errors.slice(0, 5));
      }

      toast({
        title: results.inserted > 0 ? "PO Upload Complete" : "Upload Issues Found",
        description: message,
        variant: results.inserted > 0 ? "default" : "destructive"
      });

    } catch (error) {
      console.error('❌ CRITICAL ERROR in processPOFiles:', error);
      toast({
        title: "Processing Error",
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

  // Get model numbers from PO orders for Sunsky search - process ALL model numbers
  const getPOModelNumbers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use client-side pagination to fetch ALL PO orders (bypass PostgREST limit)
      const pageSize = 1000;
      let allPOOrders: any[] = [];
      let page = 0;
      let hasMore = true;

      console.log(`🚀 Starting client-side pagination to fetch ALL PO orders...`);

      while (hasMore) {
        const startRange = page * pageSize;
        const endRange = startRange + pageSize - 1;
        
        console.log(`📄 Fetching page ${page + 1} (rows ${startRange}-${endRange})...`);
        
        const { data: pageData, error, count } = await supabase
          .from('po_orders')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .range(startRange, endRange)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (pageData && pageData.length > 0) {
          allPOOrders = [...allPOOrders, ...pageData];
          console.log(`✅ Page ${page + 1}: fetched ${pageData.length} records (total so far: ${allPOOrders.length})`);
          
          // Continue if this page was full
          hasMore = pageData.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }

        // Safety limit to prevent infinite loops
        if (page > 100) {
          console.warn(`⚠️ Reached safety limit of 100 pages (${allPOOrders.length} records)`);
          break;
        }
      }

      console.log(`📦 TOTAL PO orders fetched via pagination: ${allPOOrders.length}`);

      // Filter for active orders and extract model numbers
      const activePOOrders = (allPOOrders || []).filter(order => 
        !['completed', 'cancelled', 'delivered'].includes(order.status)
      );

      console.log(`🔍 ${activePOOrders.length} active PO orders after filtering`);
      console.log(`📋 Status breakdown:`, {
        total: allPOOrders?.length || 0,
        active: activePOOrders.length,
        statusCounts: (allPOOrders || []).reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });

      // Extract model numbers from full record structure
      const itemsWithModelNumbers = activePOOrders.filter(item => 
        item.model_number && item.model_number.trim() !== ''
      );
      
      console.log(`🔢 Model number analysis:`, {
        totalActive: activePOOrders.length,
        withModelNumbers: itemsWithModelNumbers.length,
        withoutModelNumbers: activePOOrders.length - itemsWithModelNumbers.length,
        sampleWithoutModel: activePOOrders.filter(item => !item.model_number || item.model_number.trim() === '').slice(0, 3).map(item => ({
          sku_code: item.sku_code,
          po_number: item.po_number,
          model_number: item.model_number
        }))
      });
      
      const allModelNumbers = itemsWithModelNumbers.map(item => item.model_number);
      const uniqueModelNumbers = [...new Set(allModelNumbers)];
      
      // Get existing SKUs for reference only (not for filtering)
      const { data: existingSKUs, error: skusError } = await supabase
        .from('sunsky_skus')
        .select('sku_code')
        .eq('user_id', user.id);

      const existingSKUCodes = new Set((existingSKUs || []).map(sku => sku.sku_code));
      const alreadyImportedCount = uniqueModelNumbers.filter(modelNumber => 
        existingSKUCodes.has(modelNumber)
      ).length;
      
      // Return ALL unique model numbers, not just unprocessed ones
      console.log(`📊 Found ${allModelNumbers.length} PO items with model numbers`);
      console.log(`🔍 ${uniqueModelNumbers.length} unique model numbers`);
      console.log(`✅ ${alreadyImportedCount} already imported (will be re-processed)`);
      console.log(`🚀 Processing ALL ${uniqueModelNumbers.length} unique model numbers`);
      
      return {
        totalCount: allModelNumbers.length,
        uniqueCount: uniqueModelNumbers.length, // Process ALL unique model numbers
        uniqueModels: uniqueModelNumbers, // All unique model numbers
        allModels: allModelNumbers,
        totalUniqueCount: uniqueModelNumbers.length,
        alreadyImportedCount: alreadyImportedCount
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

  // Delete PO orders
  const deletePOOrders = useCallback(async (orderIds?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase.from('po_orders').delete().eq('user_id', user.id);
      
      if (orderIds && orderIds.length > 0) {
        query = query.in('id', orderIds);
      }

      const { error } = await query;

      if (error) throw error;

      await fetchPOOrders();
      toast({
        title: "Success",
        description: orderIds ? `Deleted ${orderIds.length} PO orders` : "Deleted all PO orders"
      });
    } catch (error) {
      console.error('Error deleting PO orders:', error);
      toast({
        title: "Error",
        description: "Failed to delete PO orders",
        variant: "destructive"
      });
    }
  }, [fetchPOOrders, toast]);

  // Update print status
  const updatePrintStatus = useCallback(async (orderIds: string[], isPrinted: boolean) => {
    try {
      console.log('🖨️ Updating print status for orders:', orderIds, 'isPrinted:', isPrinted);
      
      // First, verify current status
      const { data: currentOrders, error: fetchError } = await supabase
        .from('po_orders')
        .select('id, is_printed')
        .in('id', orderIds);
      
      if (fetchError) {
        console.error('❌ Error fetching current orders:', fetchError);
      } else {
        console.log('📋 Current orders before update:', currentOrders);
      }
      
      const { error } = await supabase
        .from('po_orders')
        .update({ is_printed: isPrinted })
        .in('id', orderIds);

      if (error) {
        console.error('❌ Print status update error:', error);
        throw error;
      }

      console.log('✅ Print status updated successfully');
      
      // Verify the update worked
      const { data: updatedOrders, error: verifyError } = await supabase
        .from('po_orders')
        .select('id, is_printed')
        .in('id', orderIds);
      
      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError);
      } else {
        console.log('🔍 Orders after update:', updatedOrders);
      }
      
      // Force refresh of PO orders
      await fetchPOOrders();
      
      toast({
        title: "Success",
        description: `Print status updated for ${orderIds.length} item(s)`,
      });
      
    } catch (error) {
      console.error('Error updating print status:', error);
      toast({
        title: "Error",
        description: "Failed to update print status",
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
    updateTrackingInfo,
    getPOModelNumbers,
    deletePOOrders,
    updatePrintStatus
  };
};