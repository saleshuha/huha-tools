import React from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ParallelPOProcessorProps {
  profile: any;
  callSunskyAPI: (action: string, data: any, apiId?: string) => Promise<any>;
  setPOSearchStats: (stats: any) => void;
  setPOSearchProgress: (progress: number) => void;
  fetchSKUs: (page: number, useCache: boolean) => Promise<void>;
  fetchJobs: () => Promise<void>;
}

export const useParallelPOProcessor = ({
  profile,
  callSunskyAPI,
  setPOSearchStats,
  setPOSearchProgress,
  fetchSKUs,
  fetchJobs
}: ParallelPOProcessorProps) => {
  const { toast } = useToast();

  const processModelNumbersInParallel = async (modelData: any) => {
    // Get all active API keys
    const { data: activeKeys, error: keysError } = await supabase
      .from('sunsky_credentials')
      .select('id, api_key')
      .eq('user_id', profile?.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as any;

    if (keysError || !activeKeys || activeKeys.length === 0) {
      throw new Error("No active API keys found. Please activate at least one API key.");
    }

    console.log(`Found ${activeKeys.length} active API keys for parallel processing`);

    const uniqueModelNumbers = modelData.uniqueModels;

    // Create import job
    const { data: importJob } = await supabase
      .from('sunsky_import_jobs')
      .insert({
        user_id: profile?.id,
        type: 'po_search',
        criteria: { 
          source: 'po_model_numbers', 
          total_models: modelData.totalCount,
          unique_models: modelData.uniqueCount,
          api_keys_used: activeKeys.length
        },
        status: 'processing',
        total_items: modelData.uniqueCount,
        processed_items: 0,
        success_count: 0,
        error_count: 0,
        started_at: new Date().toISOString()
      } as any)
      .select()
      .maybeSingle();

    // Initialize stats
    setPOSearchStats({
      totalItems: modelData.uniqueCount,
      totalPOItems: modelData.totalCount,
      totalUniqueItems: modelData.totalUniqueCount,
      alreadyImportedCount: modelData.alreadyImportedCount,
      searchedItems: 0,
      skippedItems: 0,
      matchedItems: 0,
      errorItems: 0,
      currentItem: `Processing with ${activeKeys.length} API keys...`
    });
    setPOSearchProgress(5);

    // Chunk model numbers across API keys
    const chunkSize = Math.ceil(uniqueModelNumbers.length / activeKeys.length);
    const chunks = [];
    
    for (let i = 0; i < activeKeys.length; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, uniqueModelNumbers.length);
      if (start < uniqueModelNumbers.length) {
        chunks.push({
          apiKey: activeKeys[i],
          modelNumbers: uniqueModelNumbers.slice(start, end),
          chunkIndex: i
        });
      }
    }

    // Process chunks in parallel
    let totalProcessed = 0;
    const processChunk = async (chunk: any) => {
      const { apiKey, modelNumbers, chunkIndex } = chunk;
      let chunkSuccess = 0;
      let chunkErrors = 0;
      let chunkSkipped = 0;

      for (const modelNumber of modelNumbers) {
        try {
          let productToImport = null;

          // Try direct lookup first
          if (modelNumber.match(/^[A-Z0-9]{6,}$/i)) {
            try {
              const detailResults = await callSunskyAPI('getProductDetails', {
                itemNo: modelNumber,
                apiId: apiKey.id
              });
              
              if (detailResults?.result === 'success' && detailResults.data) {
                productToImport = detailResults.data;
              }
            } catch (error) {
              // Ignore "not found" errors, try search instead
            }
          }

          // Try search if no direct match
          if (!productToImport) {
            try {
              const searchResults = await callSunskyAPI('searchProducts', {
                keyword: modelNumber,
                page: 1,
                pageSize: 10,
                apiId: apiKey.id
              });

              if (searchResults?.result === 'success' && searchResults.data?.products?.length > 0) {
                const normalizedSearch = modelNumber.trim().toLowerCase().replace(/[-_\s]/g, '');
                
                for (const product of searchResults.data.products) {
                  const normalizedItem = (product.itemNo || '').trim().toLowerCase().replace(/[-_\s]/g, '');
                  const normalizedName = (product.name || '').trim().toLowerCase().replace(/[-_\s]/g, '');
                  
                  if (normalizedItem === normalizedSearch || 
                      normalizedName.includes(normalizedSearch) ||
                      normalizedSearch.includes(normalizedItem)) {
                    
                    const detailResults = await callSunskyAPI('getProductDetails', {
                      itemNo: product.itemNo,
                      apiId: apiKey.id
                    });

                    if (detailResults?.result === 'success' && detailResults.data) {
                      productToImport = detailResults.data;
                      break;
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`Search failed for ${modelNumber}:`, error);
            }
          }
          
          if (productToImport) {
            // Import SKU
            const { error } = await supabase
              .from('sunsky_skus')
              .upsert({
                user_id: profile?.id,
                sku_code: productToImport.itemNo,
                title: productToImport.name || '',
                cost: productToImport.convertedPrice || parseFloat(productToImport.price || '0') || 0,
                weight: productToImport.unitWeight ? parseFloat(productToImport.unitWeight) : 0,
                currency: productToImport.convertedCurrency || 'USD',
                country: profile?.country || 'UAE',
                product_data: productToImport
              } as any, {
                onConflict: 'user_id,sku_code',
                ignoreDuplicates: false
              });

            if (!error) {
              chunkSuccess++;
              
              // Update PO orders
              await (supabase
                .from('po_orders')
                .update({
                  sku_code: productToImport.itemNo,
                  title: productToImport.name || '',
                  unit_cost: productToImport.convertedPrice || parseFloat(productToImport.price || '0') || 0,
                  external_id: productToImport.itemNo,
                  external_id_type: 'sunsky'
                })
                .eq('user_id', profile?.id)
                .eq('model_number', modelNumber) as any);
            } else {
              chunkErrors++;
            }
          } else {
            chunkSkipped++;
          }

          totalProcessed++;
          
          // Update UI periodically
          if (totalProcessed % 5 === 0) {
            setPOSearchStats(prev => ({
              ...prev,
              searchedItems: totalProcessed,
              currentItem: `Worker ${chunkIndex + 1}: ${modelNumber}`
            }));

            const progress = 5 + Math.floor((totalProcessed / modelData.uniqueCount) * 90);
            setPOSearchProgress(progress);
          }

        } catch (error) {
          console.error(`Error processing ${modelNumber}:`, error);
          chunkErrors++;
          totalProcessed++;
        }
      }

      return { chunkSuccess, chunkErrors, chunkSkipped };
    };

    // Run all chunks in parallel
    const results = await Promise.all(chunks.map(processChunk));
    
    // Calculate final totals
    const finalSuccess = results.reduce((sum, r) => sum + r.chunkSuccess, 0);
    const finalErrors = results.reduce((sum, r) => sum + r.chunkErrors, 0);
    const finalSkipped = results.reduce((sum, r) => sum + r.chunkSkipped, 0);

    // Update final stats
    setPOSearchStats({
      totalItems: modelData.uniqueCount,
      totalPOItems: modelData.totalCount,
      totalUniqueItems: modelData.totalUniqueCount,
      alreadyImportedCount: modelData.alreadyImportedCount,
      searchedItems: uniqueModelNumbers.length,
      matchedItems: finalSuccess,
      errorItems: finalErrors,
      skippedItems: finalSkipped,
      currentItem: 'Completed!'
    });

    // Complete the import job
    if (importJob) {
      await (supabase
        .from('sunsky_import_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          success_count: finalSuccess,
          error_count: finalErrors
        })
        .eq('id', (importJob as any).id) as any);
    }
    
    // Refresh data
    await fetchSKUs(1, false);
    await fetchJobs();
    
    setPOSearchProgress(100);

    toast({
      title: "PO Model Number Search Complete",
      description: `Parallel processing with ${activeKeys.length} API keys completed! Found and imported ${finalSuccess} items from ${uniqueModelNumbers.length} unique model numbers. ${finalSkipped} items not found, ${finalErrors} errors.`,
    });

    return { finalSuccess, finalErrors, finalSkipped };
  };

  return { processModelNumbersInParallel };
};