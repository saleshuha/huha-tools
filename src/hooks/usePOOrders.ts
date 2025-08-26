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
      
      // Use the deduplicated function to avoid double counting from multiple uploads
      const { data: ordersData, error: ordersError } = await supabase.rpc(
        'get_all_po_orders_deduplicated',
        { user_id_param: user.id }
      );

      if (ordersError) {
        console.error('❌ Error fetching deduplicated PO orders:', ordersError);
        throw ordersError;
      }

      console.log('📊 Fetched deduplicated PO orders:', ordersData?.length);

      setLoadingProgress(70);
      setLoadingStatus('Processing orders...');

      // Convert to POOrder format
      const processedOrders: POOrder[] = (ordersData || []).map(order => ({
        ...order,
        status: order.status as POOrder['status'],
      }));

      console.log(`✅ Processed ${processedOrders.length} deduplicated PO orders`);

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

  // Process PO files with mapped data - Enhanced comprehensive duplicate detection
  const processPOFiles = useCallback(async (mappedData: any[], sunskySKUs: any[]) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Processing PO files...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log(`🚀 STARTING PO PROCESSING: ${mappedData.length} rows from file`);

      setLoadingProgress(10);
      setLoadingStatus('Loading existing PO data for duplicate detection...');

      // Fetch ALL existing PO orders for comprehensive duplicate checking
      const { data: existingOrders, error: fetchError } = await supabase
        .from('po_orders')
        .select('po_number, sku_code, quantity, model_number, asin, title, ship_to_location')
        .eq('user_id', user.id);

      if (fetchError) {
        throw new Error(`Failed to fetch existing orders: ${fetchError.message}`);
      }

      console.log(`📊 EXISTING DATA: Found ${existingOrders?.length || 0} existing PO orders`);

      setLoadingProgress(20);
      setLoadingStatus('Building comprehensive duplicate detection system...');

      // Create comprehensive duplicate detection system
      const existingRecordsMap = new Map();
      
      (existingOrders || []).forEach(order => {
        // Create a comprehensive fingerprint for each existing record
        const fingerprint = {
          po: order.po_number?.trim()?.toLowerCase() || '',
          model: order.model_number?.trim()?.toLowerCase() || '',
          asin: order.asin?.trim()?.toLowerCase() || '',
          sku: order.sku_code?.trim()?.toLowerCase() || '',
          qty: Number(order.quantity) || 0,
          title: order.title?.trim()?.toLowerCase() || '',
          location: order.ship_to_location?.trim()?.toLowerCase() || ''
        };

        // Generate multiple duplicate detection keys for flexibility
        const keys = [
          `${fingerprint.po}|${fingerprint.model}|${fingerprint.qty}`, // Primary: PO + Model + Qty
          `${fingerprint.po}|${fingerprint.asin}|${fingerprint.qty}`,   // Secondary: PO + ASIN + Qty  
          `${fingerprint.po}|${fingerprint.sku}|${fingerprint.qty}`,    // Tertiary: PO + SKU + Qty
          `${fingerprint.po}|${fingerprint.title}|${fingerprint.qty}|${fingerprint.location}` // Quaternary: Full match
        ];

        keys.forEach(key => {
          if (key && !key.includes('||') && key.length > 5) { // Avoid empty/invalid keys
            existingRecordsMap.set(key, order);
          }
        });
      });

      console.log(`🔍 DUPLICATE DETECTION: Created ${existingRecordsMap.size} detection keys from existing data`);

      setLoadingProgress(30);
      setLoadingStatus('Processing and validating incoming data...');

      const results = {
        processed: 0,
        inserted: 0,
        duplicates: 0,
        invalid: 0,
        errors: [] as string[],
        skipped: [] as string[]
      };

      const validOrdersToInsert: any[] = [];
      const currentFileTracker = new Set(); // Track items within current file to prevent intra-file duplicates

      // Process each row with comprehensive validation
      for (let i = 0; i < mappedData.length; i++) {
        const item = mappedData[i];
        const rowNum = i + 1;
        
        setLoadingProgress(30 + (i / mappedData.length) * 40);
        setLoadingStatus(`Validating row ${rowNum}/${mappedData.length}...`);

        console.log(`\n🔍 ROW ${rowNum}/${mappedData.length}:`, {
          po: item.po_number,
          model: item.model_number,
          asin: item.asin,
          qty: item.quantity,
          title: item.title?.substring(0, 30) + '...'
        });

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

        // === DUPLICATE DETECTION ===
        const newFingerprint = {
          po: po.toLowerCase(),
          model: model?.toLowerCase() || '',
          asin: asin?.toLowerCase() || '',
          title: title.toLowerCase(),
          qty: qty,
          location: location?.toLowerCase() || ''
        };

        // Generate detection keys for new item
        const newKeys = [
          `${newFingerprint.po}|${newFingerprint.model}|${newFingerprint.qty}`,
          `${newFingerprint.po}|${newFingerprint.asin}|${newFingerprint.qty}`,
          `${newFingerprint.po}|${newFingerprint.title}|${newFingerprint.qty}|${newFingerprint.location}`
        ].filter(key => key && !key.includes('||') && key.length > 5);

        // Check against existing database records
        let foundExistingDuplicate = false;
        let duplicateKey = '';
        
        for (const key of newKeys) {
          if (existingRecordsMap.has(key)) {
            foundExistingDuplicate = true;
            duplicateKey = key;
            break;
          }
        }

        if (foundExistingDuplicate) {
          const skip = `Row ${rowNum}: Duplicate in database - "${title}" (Key: ${duplicateKey})`;
          results.duplicates++;
          results.skipped.push(skip);
          console.log(`⚠️ DUPLICATE (DB): ${skip}`);
          continue;
        }

        // Check against current file (prevent intra-file duplicates)
        let foundIntraFileDuplicate = false;
        for (const key of newKeys) {
          if (currentFileTracker.has(key)) {
            foundIntraFileDuplicate = true;
            duplicateKey = key;
            break;
          }
        }

        if (foundIntraFileDuplicate) {
          const skip = `Row ${rowNum}: Duplicate within file - "${title}" (Key: ${duplicateKey})`;
          results.duplicates++;
          results.skipped.push(skip);
          console.log(`⚠️ DUPLICATE (FILE): ${skip}`);
          continue;
        }

        // Add to current file tracker
        newKeys.forEach(key => currentFileTracker.add(key));

        // === PREPARE FOR INSERT ===
        const validOrder = {
          po_number: po,
          ship_to_location: location || 'Not specified',
          asin: asin || null,
          model_number: model || null,
          title: title,
          quantity: qty,
          sku_code: model || asin || null,
          external_id: item.external_id?.trim() || null,
          external_id_type: item.external_id_type?.trim() || null,
          status: 'pending',
          file_name: item.file_name || 'uploaded-file.csv',
          unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
          sku_user_id: user.id,
          user_id: user.id
        };

        validOrdersToInsert.push(validOrder);
        console.log(`✅ Row ${rowNum}: Valid - prepared for insert`);
      }

      console.log(`\n📊 PROCESSING SUMMARY:`);
      console.log(`📥 Rows processed: ${results.processed}`);
      console.log(`✅ Valid for insert: ${validOrdersToInsert.length}`);
      console.log(`⚠️ Duplicates skipped: ${results.duplicates}`);
      console.log(`❌ Invalid rows: ${results.invalid}`);

      // === BULK INSERT ===
      setLoadingProgress(80);
      setLoadingStatus(`Inserting ${validOrdersToInsert.length} valid orders...`);

      if (validOrdersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('po_orders')
          .insert(validOrdersToInsert);

        if (insertError) {
          throw new Error(`Bulk insert failed: ${insertError.message}`);
        }

        results.inserted = validOrdersToInsert.length;
        console.log(`✅ Successfully inserted ${results.inserted} orders into database`);
      }

      setLoadingProgress(95);
      setLoadingStatus('Refreshing PO data...');
      
      await fetchPOOrders();

      // === FINAL RESULTS ===
      console.log(`\n🏁 FINAL RESULTS:`);
      console.log(`📊 Total rows in file: ${mappedData.length}`);
      console.log(`✅ Successfully inserted: ${results.inserted}`);
      console.log(`⚠️ Duplicates skipped: ${results.duplicates}`);
      console.log(`❌ Invalid/Errors: ${results.invalid}`);
      console.log(`🎯 Database now contains these new records`);

      // Show user-friendly results
      let message = `Processed ${results.processed} rows: `;
      let details = [];
      
      if (results.inserted > 0) details.push(`${results.inserted} inserted`);
      if (results.duplicates > 0) details.push(`${results.duplicates} duplicates skipped`);
      if (results.invalid > 0) details.push(`${results.invalid} invalid`);
      
      message += details.join(', ');

      if (results.errors.length > 0) {
        console.log('🚨 Processing errors:', results.errors.slice(0, 5));
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