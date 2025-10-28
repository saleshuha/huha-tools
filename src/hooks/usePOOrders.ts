import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
  serial_number?: string;
  status: 'pending' | 'placed' | 'received' | 'cancelled' | 'closed';
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
  batch_id?: string;
}

export interface POUploadStats {
  totalRows: number;
  processed: number;
  inserted: number;
  updated: number;
  unchanged: number;
  invalid: number;
}

export interface POProgressItem {
  poNumber: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  itemsProcessed: number;
  totalItems: number;
}

export const usePOOrders = () => {
  const [poOrders, setPOOrders] = useState<POOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [currentPO, setCurrentPO] = useState<string>('');
  const [currentItem, setCurrentItem] = useState<string>('');
  const [uploadStats, setUploadStats] = useState<POUploadStats>({
    totalRows: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    invalid: 0
  });
  const [poProgress, setPOProgress] = useState<POProgressItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // NEW: Fetch PO orders for a specific PO number only (optimized for details page)
  const fetchSinglePOOrders = useCallback(async (poNumber: string) => {
    console.log('📥 fetchSinglePOOrders called for PO:', poNumber);
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Loading PO details...');

    try {
      const startTime = performance.now();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw new Error(`Authentication failed: ${authError.message}`);
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(20);
      setLoadingStatus('Fetching PO orders...');

      // Fetch ONLY orders for this specific PO number
      const { data: poOrdersData, error: poError } = await supabase
        .from('po_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('po_number', poNumber)
        .order('created_at', { ascending: false });

      if (poError) throw poError;

      setLoadingProgress(50);
      setLoadingStatus('Fetching Sunsky SKUs...');

      // Fetch Sunsky SKUs
      const { data: sunskySKUs, error: skuError } = await supabase
        .from('sunsky_skus')
        .select('*')
        .eq('user_id', user.id);

      if (skuError) throw skuError;

      setLoadingProgress(80);
      setLoadingStatus('Joining data...');

      // Create SKU map and join
      const skuMap = new Map();
      (sunskySKUs || []).forEach((sku: any) => {
        skuMap.set(sku.sku_code, sku);
      });

      const ordersWithSkus = (poOrdersData || []).map((order: any) => {
        const matchedSku = skuMap.get(order.sku_code) || 
                          (order.model_number ? skuMap.get(order.model_number) : null);
        return {
          ...order,
          sunsky_sku: matchedSku || null
        };
      });

      const typedData: POOrder[] = ordersWithSkus.map((order: any) => ({
        ...order,
        status: order.status as POOrder['status']
      }));

      const endTime = performance.now();
      const loadTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log('✅ Loaded', typedData.length, 'orders for PO', poNumber, 'in', loadTime, 's');
      setPOOrders(typedData);
      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${typedData.length} orders in ${loadTime}s`);

      toast({
        title: "Success",
        description: `Loaded ${typedData.length} orders in ${loadTime}s`,
      });

    } catch (error) {
      console.error('❌ Error in fetchSinglePOOrders:', error);
      setLoadingStatus('Failed to load PO orders');
      setPOOrders([]);
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

  // Fetch PO orders - restored working version with progressive loading
  const fetchPOOrders = useCallback(async (loadAllOrders = false) => {
    console.log('📥 fetchPOOrders called, loadAllOrders:', loadAllOrders);
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Authenticating...');

    try {
      const startTime = performance.now();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      if (!user) {
        console.error('❌ No authenticated user found');
        throw new Error('User not authenticated');
      }

      console.log('✅ Authenticated user:', user.id);
      setLoadingProgress(10);
      setLoadingStatus('Fetching Sunsky SKUs...');

      // Fetch ALL Sunsky SKUs first (they're typically fewer)
      const { data: sunskySKUs, error: skuError } = await supabase
        .from('sunsky_skus')
        .select('*')
        .eq('user_id', user.id);

      if (skuError) {
        console.error('❌ Error fetching Sunsky SKUs:', skuError);
        throw skuError;
      }

      console.log(`✅ Loaded ${sunskySKUs?.length || 0} Sunsky SKUs`);
      setLoadingProgress(30);
      setLoadingStatus('Fetching PO orders...');

      // Create SKU map for faster lookups
      const skuMap = new Map();
      (sunskySKUs || []).forEach((sku: any) => {
        skuMap.set(sku.sku_code, sku);
      });

      // Fetch PO orders - Use paginated fetching to bypass 1000-row Supabase limit
      console.log('📦 Loading ALL PO orders with pagination...');
      
      let allPOOrders: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;
      let totalCount = 0;

      // First, get the total count
      const { count: totalCountResult } = await supabase
        .from('po_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      totalCount = totalCountResult || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      console.log(`📊 Total PO orders: ${totalCount}, Pages: ${totalPages}`);

      while (hasMore) {
        const start = page * pageSize;
        const end = start + pageSize - 1;
        
        setLoadingProgress(30 + (page / totalPages) * 40);
        setLoadingStatus(`Fetching page ${page + 1} of ${totalPages}...`);
        
        const { data: pageData, error: poError } = await supabase
          .from('po_orders')
          .select('*')
          .eq('user_id', user.id)
          .range(start, end)
          .order('created_at', { ascending: false });

        if (poError) {
          console.error('❌ Error fetching PO orders page:', poError);
          throw poError;
        }

        if (pageData && pageData.length > 0) {
          allPOOrders = [...allPOOrders, ...pageData];
          console.log(`✅ Loaded page ${page + 1}/${totalPages}: ${pageData.length} orders (Total so far: ${allPOOrders.length})`);
          page++;
          
          // Stop if we got less than a full page
          if (pageData.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const poOrdersData = allPOOrders;
      console.log(`✅ Loaded ALL ${poOrdersData.length} PO orders in ${page} pages`);
      setLoadingProgress(70);
      setLoadingStatus('Joining data...');

      // Join PO orders with Sunsky SKUs on client side
      const ordersWithSkus = (poOrdersData || []).map((order: any) => {
        const matchedSku = skuMap.get(order.sku_code) || 
                          (order.model_number ? skuMap.get(order.model_number) : null);
        return {
          ...order,
          sunsky_sku: matchedSku || null
        };
      });

      console.log(`📊 Data stats:`, {
        total: ordersWithSkus.length,
        withSunskySku: ordersWithSkus.filter((o: any) => o.sunsky_sku).length,
        countries: [...new Set(ordersWithSkus.map((o: any) => o.country))],
        statuses: [...new Set(ordersWithSkus.map((o: any) => o.status))]
      });

      setLoadingProgress(90);
      
      // Type the final data
      const typedData: POOrder[] = ordersWithSkus.map((order: any) => ({
        ...order,
        status: order.status as POOrder['status']
      }));

      const endTime = performance.now();
      const loadTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log('🎯 Setting poOrders state with', typedData.length, 'orders');
      setPOOrders(typedData);
      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${typedData.length} orders in ${loadTime}s`);

      // Invalidate related queries to refresh metrics with optimized caching
      queryClient.invalidateQueries({ 
        queryKey: ['po-group-metrics'],
        refetchType: 'none' // Don't refetch immediately, let components decide
      });
      queryClient.invalidateQueries({ 
        queryKey: ['po-comprehensive-metrics'],
        refetchType: 'none'
      });

      // Show success message
      if (typedData.length > 0) {
        toast({
          title: "Success",
          description: `Loaded ${typedData.length} orders in ${loadTime}s`,
        });
      }

    } catch (error) {
      console.error('❌ Error in fetchPOOrders:', error);
      setLoadingStatus('Failed to load PO orders');
      setPOOrders([]); // Clear orders on error
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
  }, [toast, queryClient]);

  // Process PO files with smart duplicate detection
  const processPOFiles = useCallback(async (mappedData: any[], sunskySKUs: any[], selectedCountry: string = 'UAE') => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Processing PO files...');
    setCurrentPO('');
    setCurrentItem('');
    
    // Generate unique batch ID for this import session
    const batchId = crypto.randomUUID();
    
    // Initialize stats
    setUploadStats({
      totalRows: mappedData.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      invalid: 0
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log(`🚀 STARTING PO PROCESSING: ${mappedData.length} rows from file`);
      console.log(`🆔 BATCH ID: ${batchId} - This import session`);

      setLoadingProgress(5);
      setLoadingStatus('Loading existing PO data for update comparison...');

      // Fetch ALL existing PO data for comparison and updates
      const { data: existingOrders, error: fetchError } = await ((supabase as any)
        .from('po_orders')
        .select('*')
        .eq('user_id', user.id));

      if (fetchError) {
        throw new Error(`Failed to fetch existing orders: ${fetchError.message}`);
      }

      console.log(`📊 EXISTING DATA: Found ${existingOrders?.length || 0} existing PO orders`);

      setLoadingProgress(10);
      setLoadingStatus('Building identity-based change detection...');

      // Create map of existing orders by identity for quick lookup and comparison
      const existingOrdersMap = new Map();
      
      (existingOrders || []).forEach((order: any) => {
        if (order.po_key && order.item_key) {
          const identity = `${order.po_key}|${order.item_key}`;
          existingOrdersMap.set(identity, order);
        }
      });

      console.log(`🔍 CHANGE DETECTION: Created map of ${existingOrdersMap.size} existing orders`);

      // Group by PO number first to track per-PO progress
      const poGroups = new Map<string, any[]>();
      mappedData.forEach(item => {
        const po = item.po_number?.trim();
        if (po) {
          if (!poGroups.has(po)) {
            poGroups.set(po, []);
          }
          poGroups.get(po)!.push(item);
        }
      });

      // Initialize PO progress tracking
      const initialPOProgress: POProgressItem[] = Array.from(poGroups.keys()).map(poNumber => ({
        poNumber,
        status: 'pending' as const,
        itemsProcessed: 0,
        totalItems: poGroups.get(poNumber)?.length || 0
      }));
      setPOProgress(initialPOProgress);

      setLoadingProgress(15);
      setLoadingStatus(`Processing ${poGroups.size} unique POs with ${mappedData.length} items...`);

      // Group items by identity and detect changes
      const itemGroups = new Map();
      const results = {
        processed: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        invalid: 0,
        errors: [] as string[],
        changes: [] as string[]
      };

      let currentPOIndex = 0;
      const totalPOs = poGroups.size;

      // Process each PO group
      for (const [poNumber, items] of poGroups.entries()) {
        currentPOIndex++;
        setCurrentPO(poNumber);
        
        // Update PO status to processing
        setPOProgress(prev => prev.map(po => 
          po.poNumber === poNumber ? { ...po, status: 'processing' as const } : po
        ));

        setLoadingStatus(`Processing PO ${currentPOIndex}/${totalPOs}: ${poNumber} (${items.length} items)`);
        
        // Process each item in this PO
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const rowNum = results.processed + 1;
          
          // Update progress
          const overallProgress = 15 + ((results.processed / mappedData.length) * 70);
          setLoadingProgress(overallProgress);
          
          results.processed++;

          // Update stats in real-time
          setUploadStats(prev => ({
            ...prev,
            processed: results.processed
          }));

          // Update PO item progress
          setPOProgress(prev => prev.map(po => 
            po.poNumber === poNumber 
              ? { ...po, itemsProcessed: i + 1 } 
              : po
          ));

          // === BASIC VALIDATION ===
          const po = item.po_number?.trim();
          const model = item.model_number?.trim();
          const asin = item.asin?.trim(); 
          const title = item.title?.trim() || 'Unknown Product';
          const qty = parseInt(item.quantity) || 0;
          const location = item.ship_to_location?.trim();

          setCurrentItem(`${title.substring(0, 40)}... (${model || asin || 'N/A'})`);

          // Validate required fields
          if (!po) {
            const error = `Row ${rowNum}: Missing PO number - "${title}"`;
            results.invalid++;
            results.errors.push(error);
            setUploadStats(prev => ({ ...prev, invalid: results.invalid }));
            console.log(`❌ INVALID: ${error}`);
            continue;
          }

          if (qty <= 0) {
            const error = `Row ${rowNum}: Invalid quantity (${item.quantity}) - PO: ${po}, Product: "${title}"`;
            results.invalid++;
            results.errors.push(error);
            setUploadStats(prev => ({ ...prev, invalid: results.invalid }));
            console.log(`❌ INVALID: ${error}`);
            continue;
          }

          if (!model && !asin) {
            const error = `Row ${rowNum}: Missing both Model Number and ASIN - PO: ${po}, Product: "${title}"`;
            results.invalid++;
            results.errors.push(error);
            setUploadStats(prev => ({ ...prev, invalid: results.invalid }));
            console.log(`❌ INVALID: ${error}`);
            continue;
          }

          // === SIMPLIFIED IDENTITY: po_number + primary_sku ===
          const poKey = po.toLowerCase().trim();
          
          // Determine primary SKU (prefer model_number, fallback to asin)
          let primarySku = '';
          if (model && model.trim() !== '') {
            primarySku = model.trim();
          } else if (asin && asin.trim() !== '') {
            primarySku = asin.trim();
          } else {
            primarySku = item.sku_code?.trim() || '';
          }
          const itemKey = primarySku.toLowerCase().trim();
          
          // Simple identity for duplicate detection
          const identity = `${poKey}|${itemKey}`;

          // Validate identity keys are set
          if (!poKey || !itemKey) {
            const error = `Row ${rowNum}: Failed to generate identity keys - PO: ${po}, SKU: ${primarySku}`;
            results.invalid++;
            results.errors.push(error);
            setUploadStats(prev => ({ ...prev, invalid: results.invalid }));
            console.error(`❌ ${error}`);
            continue;
          }

          console.log(`📝 Row ${rowNum}: PO=${po} (key=${poKey}), SKU=${primarySku} (key=${itemKey}), Qty=${qty}`);

          // Create new order data
          const currency = selectedCountry === 'KSA' ? 'SAR' : 'AED';
          const newOrderData = {
            po_number: po,
            po_key: poKey,           // CRITICAL: Required for unique constraint
            item_key: itemKey,       // CRITICAL: Required for unique constraint
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
            user_id: user.id,
            batch_id: batchId
          };

          // Check for existing order with same identity
          const existingOrder = existingOrdersMap.get(identity);
          
          if (existingOrder) {
            // Debug log
            console.log(`🔍 Duplicate check: ${identity}`, {
              existingBatch: existingOrder.batch_id,
              currentBatch: batchId,
              sameBatch: existingOrder.batch_id === batchId
            });
            
            // Same batch = duplicate within this upload = skip
            if (existingOrder.batch_id && existingOrder.batch_id === batchId) {
              console.log(`⚠️ DUPLICATE in same batch: ${identity}`);
              results.unchanged++;
              setUploadStats(prev => ({ ...prev, unchanged: results.unchanged }));
              continue;
            }
            
            // Different batch OR no batch_id = check quantity change
            const hasQuantityChange = existingOrder.quantity !== qty;
            
            if (hasQuantityChange) {
              console.log(`🔄 UPDATE: ${identity} - Qty ${existingOrder.quantity}→${qty}`);
              itemGroups.set(identity, {
                ...newOrderData,
                id: existingOrder.id,
                created_at: existingOrder.created_at,
                status: existingOrder.status
              });
              results.updated++;
              setUploadStats(prev => ({ ...prev, updated: results.updated }));
            } else {
              console.log(`✓ UNCHANGED: ${identity} (same qty: ${qty})`);
              results.unchanged++;
              setUploadStats(prev => ({ ...prev, unchanged: results.unchanged }));
            }
          } else {
            // New order - add to insert list
            console.log(`✨ NEW: ${identity}`);
            itemGroups.set(identity, newOrderData);
            results.inserted++;
            setUploadStats(prev => ({ ...prev, inserted: results.inserted }));
          }
        }

        // Mark PO as completed
        setPOProgress(prev => prev.map(po => 
          po.poNumber === poNumber ? { ...po, status: 'completed' as const } : po
        ));
      }

      console.log(`\n📊 PROCESSING SUMMARY:`);
      console.log(`📥 Total rows: ${mappedData.length}`);
      console.log(`✅ Processed: ${results.processed}`);
      console.log(`✨ Inserted: ${results.inserted}`);
      console.log(`🔄 Updated: ${results.updated}`);
      console.log(`✓ Unchanged: ${results.unchanged}`);
      console.log(`❌ Invalid: ${results.invalid}`);
      
      // Verify row accounting
      const totalAccounted = results.inserted + results.updated + results.unchanged + results.invalid;
      console.log(`🔢 Accounted: ${totalAccounted}/${mappedData.length}`);
      
      if (totalAccounted !== mappedData.length) {
        console.error(`🚨 ROW ACCOUNTING ERROR: ${Math.abs(mappedData.length - totalAccounted)} rows unaccounted!`);
      }

      // === BULK UPSERT (INSERT + UPDATE) ===
      setLoadingProgress(85);
      const totalToProcess = itemGroups.size;
      setLoadingStatus(`Saving ${totalToProcess} items to database...`);
      setCurrentPO('');
      setCurrentItem('Saving to database...');

      const ordersToUpsert = Array.from(itemGroups.values());

      if (ordersToUpsert.length > 0) {
        console.log(`🚀 Batch ${batchId}: Processing ${ordersToUpsert.length} items (${ordersToUpsert.filter(o => o.id).length} updates, ${ordersToUpsert.filter(o => !o.id).length} inserts)`);
        
        // Separate new inserts from updates
        const itemsToInsert = ordersToUpsert.filter(o => !o.id);
        const itemsToUpdate = ordersToUpsert.filter(o => o.id);
        
        // Insert new items
        if (itemsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('po_orders')
            .insert(itemsToInsert);
          
          if (insertError) {
            console.error('❌ Insert error:', insertError);
            
            // Check if it's a duplicate key violation
            if (insertError.message.includes('idx_po_orders_unique_item')) {
              toast({
                title: "Duplicate Data Detected",
                description: "Some orders already exist in the database. Only new orders were added.",
                variant: "default"
              });
            } else {
              throw new Error(`Bulk insert failed: ${insertError.message}`);
            }
          }
          console.log(`✅ Inserted ${itemsToInsert.length} new orders`);
        }
        
        // Update existing items
        if (itemsToUpdate.length > 0) {
          for (const item of itemsToUpdate) {
            const { error: updateError } = await supabase
              .from('po_orders')
              .update(item)
              .eq('id', item.id);
            
            if (updateError) {
              console.error(`❌ Update error for ${item.id}:`, updateError);
            }
          }
          console.log(`✅ Updated ${itemsToUpdate.length} existing orders`);
        }

        console.log(`✅ Batch ${batchId}: Successfully processed ${ordersToUpsert.length} orders (${itemsToInsert.length} new, ${itemsToUpdate.length} updated)`);

        // Log sample changes
        if (results.changes.length > 0) {
          console.log(`🔎 Sample changes:`, results.changes.slice(0, 5));
        }
      }

      setLoadingProgress(95);
      setLoadingStatus('Refreshing PO data...');
      setCurrentItem('');
      
      // Invalidate ALL PO-related queries (not just active ones)
      await queryClient.invalidateQueries({ 
        queryKey: ['po-group-metrics'],
        refetchType: 'all'  // Force ALL queries to refetch
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['po-orders'],
        refetchType: 'all'  // Force ALL queries to refetch
      });
      
      // Wait 500ms for DB to finish writes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force fetch with loadAllOrders = true
      await fetchPOOrders(true);

      // Trigger state update to force component re-render
      setPOOrders(prev => [...prev]);

      setLoadingProgress(100);
      setLoadingStatus('Upload complete!');

      // === FINAL RESULTS ===
      console.log(`\n🏁 UPLOAD COMPLETE:`);
      console.log(`📊 ${results.inserted} new, ${results.updated} updated, ${results.unchanged} unchanged, ${results.invalid} invalid`);
      console.log(`✅ All ${totalAccounted} rows accounted for`);

      // Build user message
      const details = [];
      if (results.inserted > 0) details.push(`${results.inserted} new`);
      if (results.updated > 0) details.push(`${results.updated} updated`);
      if (results.unchanged > 0) details.push(`${results.unchanged} unchanged`);
      if (results.invalid > 0) details.push(`${results.invalid} skipped`);

      toast({
        title: "Upload Complete",
        description: `Processed ${mappedData.length} rows: ${details.join(', ')}`,
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
        setCurrentPO('');
        setCurrentItem('');
      }, 2000);
    }
  }, [fetchPOOrders, toast]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, status: POOrder['status']) => {
    try {
      const { error } = await ((supabase as any)
        .from('po_orders')
        .update({ 
          status,
          order_date: status === 'placed' ? new Date().toISOString() : undefined
        })
        .eq('id', orderId));

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
      const { error } = await ((supabase as any)
        .from('po_orders')
        .update(trackingData)
        .eq('id', orderId));

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
        
        const { data: pageData, error, count } = await ((supabase as any)
          .from('po_orders')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .range(startRange, endRange)
          .order('created_at', { ascending: false }));

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
      const { data: existingSKUs, error: skusError } = await ((supabase as any)
        .from('sunsky_skus')
        .select('sku_code')
        .eq('user_id', user.id));

      const existingSKUCodes = new Set(((existingSKUs || []) as any).map((sku: any) => sku.sku_code));
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

  // Delete PO orders with batching support for large datasets
  const deletePOOrders = useCallback(async (orderIds?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🗑️ deletePOOrders called:', {
        userId: user.id,
        orderIdsProvided: orderIds?.length || 0,
        orderIds: orderIds?.slice(0, 5)
      });

      if (orderIds && orderIds.length > 0) {
        // Batch delete in chunks of 100 to avoid URL length issues
        const BATCH_SIZE = 100;
        const totalBatches = Math.ceil(orderIds.length / BATCH_SIZE);
        
        console.log(`🗑️ Deleting ${orderIds.length} orders in ${totalBatches} batches...`);
        
        for (let i = 0; i < totalBatches; i++) {
          const start = i * BATCH_SIZE;
          const end = Math.min(start + BATCH_SIZE, orderIds.length);
          const batch = orderIds.slice(start, end);
          
          console.log(`🗑️ Batch ${i + 1}/${totalBatches}: Deleting ${batch.length} orders...`);
          
          const { error } = await ((supabase as any)
            .from('po_orders')
            .delete()
            .eq('user_id', user.id)
            .in('id', batch));

          if (error) {
            console.error(`❌ Delete error in batch ${i + 1}:`, error);
            throw error;
          }
          
          console.log(`✅ Batch ${i + 1}/${totalBatches} deleted successfully`);
        }
        
        console.log('✅ All batches deleted successfully, refreshing data...');
      } else {
        // Delete all orders for user (no ID filter)
        const { error } = await ((supabase as any)
          .from('po_orders')
          .delete()
          .eq('user_id', user.id));

        if (error) {
          console.error('❌ Delete error:', error);
          throw error;
        }
      }

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
      const { data: currentOrders, error: fetchError } = await ((supabase as any)
        .from('po_orders')
        .select('id, is_printed')
          .in('id', orderIds));
      
      if (fetchError) {
        console.error('❌ Error fetching current orders:', fetchError);
      } else {
        console.log('📋 Current orders before update:', currentOrders);
      }
      
      const { error } = await ((supabase as any)
        .from('po_orders')
        .update({ is_printed: isPrinted })
        .in('id', orderIds));

      if (error) {
        console.error('❌ Print status update error:', error);
        throw error;
      }

      console.log('✅ Print status updated successfully');
      
      // Verify the update worked
      const { data: updatedOrders, error: verifyError } = await ((supabase as any)
        .from('po_orders')
        .select('id, is_printed')
        .in('id', orderIds));
      
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
    currentPO,
    currentItem,
    uploadStats,
    poProgress,
    fetchPOOrders,
    fetchSinglePOOrders,
    processPOFiles,
    updateOrderStatus,
    updateTrackingInfo,
    getPOModelNumbers,
    deletePOOrders,
    updatePrintStatus
  };
};