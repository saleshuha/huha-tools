import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ConcurrentExportProgress {
  apiKeyId: string;
  apiKeyName: string;
  currentPage: number;
  totalPages: number;
  processedItems: number;
  status: 'waiting' | 'processing' | 'completed' | 'error' | 'cancelled';
  error?: string;
  lastUpdate: Date;
}

export interface ExportConfig {
  status: number;
  categoryId?: number;
  pageSize: number;
  maxPages: number;
  columns: string[];
  apiKeys: Array<{ id: string; name: string; }>;
}

export interface ExportResult {
  products: any[];
  totalFound: number;
  categoriesMap: Map<number, { name: string; products: any[] }>;
  apiProgress: ConcurrentExportProgress[];
  exportId: string;
}

export const useConcurrentSunskyExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ConcurrentExportProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportResults, setExportResults] = useState<ExportResult | null>(null);
  const { toast } = useToast();
  
  const cancellationRef = useRef<{ [exportId: string]: boolean }>({});
  const apiCallQueue = useRef<{ [apiKeyId: string]: Array<() => Promise<any>> }>({});

  const callSunskyAPI = async (action: string, params: any, apiKeyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action, apiId: apiKeyId, filters: params }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sunsky API call failed:', error);
      throw error;
    }
  };

  const distributePages = (estimatedPages: number, apiKeys: Array<{ id: string; name: string }>) => {
    console.log('distributePages called with:', { estimatedPages, apiKeysCount: apiKeys.length });
    
    const distribution: { [apiKeyId: string]: { startPage: number; maxPages: number } } = {};
    
    // For unlimited exports, use the actual estimated pages without artificial caps
    const effectiveMaxPages = estimatedPages; // Remove the 1000 page limit for true unlimited exports
    const pagesPerAPI = Math.ceil(effectiveMaxPages / apiKeys.length);
    
    console.log('Calculated:', { effectiveMaxPages, pagesPerAPI });
    
    // Distribute page ranges among API keys instead of individual pages
    apiKeys.forEach((api, index) => {
      const startPage = (index * pagesPerAPI) + 1;
      distribution[api.id] = {
        startPage: startPage,
        maxPages: pagesPerAPI
      };
      console.log(`API ${api.name}: startPage=${startPage}, maxPages=${pagesPerAPI}`);
    });

    return distribution;
  };

  const processAPIKeyPages = async (
    apiKey: { id: string; name: string },
    pageRange: { startPage: number; maxPages: number },
    config: ExportConfig,
    exportId: string,
    onProgress: (progress: ConcurrentExportProgress) => void
  ): Promise<any[]> => {
    const results: any[] = [];
    let currentPage = pageRange.startPage;
    let pagesProcessed = 0;
    let emptyPagesCount = 0;

    const updateProgress = (status: ConcurrentExportProgress['status'], error?: string, isEmpty: boolean = false) => {
      if (isEmpty) {
        emptyPagesCount++;
      } else {
        emptyPagesCount = 0; // Reset if we find products
      }
      
      const progress: ConcurrentExportProgress = {
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        currentPage: pagesProcessed + 1,
        totalPages: pageRange.maxPages,
        processedItems: results.length,
        status,
        error,
        lastUpdate: new Date()
      };
      onProgress(progress);
    };

    updateProgress('processing');

    try {
      while (pagesProcessed < pageRange.maxPages && !cancellationRef.current[exportId]) {
        const searchParams: any = {
          page: currentPage,
          pageSize: config.pageSize,
          status: config.status,
          lang: 'en'
        };

        if (config.categoryId) {
          searchParams.categoryId = config.categoryId;
        }

        try {
          updateProgress('processing');
          const response = await callSunskyAPI('searchProducts', searchParams, apiKey.id);
          
          if ((response?.success === true || response?.result === 'success') && response?.data) {
            const pageProducts = response.data.products?.result ?? response.data.result ?? [];
            
            // Stop immediately if we get no products (end of data)
            if (!pageProducts || pageProducts.length === 0) {
              console.log(`API ${apiKey.name} reached end of data at page ${currentPage} (no products)`);
              break;
            }
            
            results.push(...pageProducts);
            updateProgress('processing');
            
            // Stop if we got fewer results than expected (end of data)
            if (pageProducts.length < config.pageSize) {
              console.log(`API ${apiKey.name} reached end of data at page ${currentPage} (partial page: ${pageProducts.length})`);
              break;
            }
          } else {
            console.warn(`API ${apiKey.name} page ${currentPage} returned no data or error`);
            // If we get no data, we might have reached the end
            break;
          }
        } catch (pageError) {
          console.error(`API ${apiKey.name} page ${currentPage} failed:`, pageError);
          updateProgress('error', pageError.message);
          // Break on API errors to avoid infinite loops
          break;
        }

        currentPage++;
        pagesProcessed++;
        
        // Rate limiting delay - reduce for unlimited exports
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms
      }

      if (cancellationRef.current[exportId]) {
        updateProgress('cancelled');
      } else {
        updateProgress('completed');
      }

    } catch (error) {
      console.error(`API ${apiKey.name} processing failed:`, error);
      updateProgress('error', error.message);
    }

    return results;
  };

  const startConcurrentExport = async (config: ExportConfig, backgroundTaskId?: string): Promise<string> => {
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setIsExporting(true);
    setExportResults(null);
    setOverallProgress(0);
    setExportStatus('Initializing concurrent export...');
    
    console.log('🚀 Starting concurrent export:', { exportId, backgroundTaskId });
    
    // Initialize cancellation flag
    cancellationRef.current[exportId] = false;
    
    // Initialize progress tracking for each API key
    const initialProgress: ConcurrentExportProgress[] = config.apiKeys.map(api => ({
      apiKeyId: api.id,
      apiKeyName: api.name,
      currentPage: 0,
      totalPages: 0,
      processedItems: 0,
      status: 'waiting',
      lastUpdate: new Date()
    }));
    
    setExportProgress(initialProgress);

    try {
      // Get estimated total by making a quick call with the first API
      setExportStatus('Estimating total products...');
      setOverallProgress(5);
      
      const estimateParams: any = {
        page: 1,
        pageSize: config.pageSize,
        status: config.status,
        lang: 'en'
      };

      if (config.categoryId) {
        estimateParams.categoryId = config.categoryId;
      }

      const estimateResponse = await callSunskyAPI('searchProducts', estimateParams, config.apiKeys[0].id);
      
      let estimatedTotal = 0;
      let estimatedPages = 50; // Default conservative estimate
      
      if ((estimateResponse?.success === true || estimateResponse?.result === 'success') && estimateResponse?.data) {
        const total = estimateResponse.data.products?.total ?? estimateResponse.data.total ?? estimateResponse.data.totalResults;
        if (total && total > 0) {
          estimatedTotal = total;
          estimatedPages = Math.ceil(estimatedTotal / config.pageSize);
          console.log(`📊 Found ${estimatedTotal} products, need ${estimatedPages} pages`);
        } else {
          // Fallback if no total - use conservative estimate
          estimatedPages = 1000; // Start with 1000 pages, let API discovery handle rest
        }
      }

      setExportStatus(`Distributing work across ${config.apiKeys.length} API keys (estimated ${estimatedPages} pages)...`);
      setOverallProgress(10);

      // Distribute page ranges among API keys
      const pageDistribution = distributePages(estimatedPages, config.apiKeys);
      
      // Update initial progress with page counts
      const updatedProgress = initialProgress.map(progress => ({
        ...progress,
        totalPages: pageDistribution[progress.apiKeyId]?.maxPages || 0,
        status: 'processing' as const
      }));
      setExportProgress(updatedProgress);

      // Track progress updates
      const progressTracker = new Map<string, ConcurrentExportProgress>();
      let emptyPagesCount = 0;
      
      // Calculate overall progress more frequently with dynamic recalculation
      const onApiProgress = async (progress: ConcurrentExportProgress) => {
        progressTracker.set(progress.apiKeyId, progress);
        
        // Update the progress array
        setExportProgress(prev => 
          prev.map(p => p.apiKeyId === progress.apiKeyId ? progress : p)
        );
        
        // Track empty pages across all APIs
        const totalProcessed = Array.from(progressTracker.values())
          .reduce((sum, p) => sum + (p as ConcurrentExportProgress).processedItems, 0);
        
        // Calculate overall progress based on completed pages across all APIs
        const totalPagesProcessed = Array.from(progressTracker.values())
          .reduce((sum, p) => sum + (p as ConcurrentExportProgress).currentPage, 0);
        const totalPagesExpected = config.apiKeys.reduce((sum, api) => 
          sum + (pageDistribution[api.id]?.maxPages || 0), 0);
        
        // Check if we're hitting empty pages consecutively
        const completedAPIs = Array.from(progressTracker.values())
          .filter(p => p.status === 'completed');
        const emptyAPIs = completedAPIs.filter(p => p.processedItems === 0);
        
        let overallPercent;
        if (emptyAPIs.length >= 2 && totalProcessed > 0) {
          // Multiple APIs hitting empty pages, we're near the end
          overallPercent = 95;
        } else if (completedAPIs.length === config.apiKeys.length) {
          // All APIs completed
          overallPercent = 100;
        } else {
          // Normal calculation but cap at 90% until we know we're truly done
          overallPercent = totalPagesExpected > 0 ? 
            Math.min(90, (totalPagesProcessed / totalPagesExpected) * 100) : 0;
        }
        
        setOverallProgress(overallPercent);
        const statusText = `Processing: ${totalProcessed} products found, ${totalPagesProcessed}/${totalPagesExpected} pages...`;
        setExportStatus(statusText);
        
        // Update background task if provided
        if (backgroundTaskId) {
          try {
            await ((supabase as any)
              .from('background_tasks')
              .update({ 
                progress: Math.round(overallPercent),
                total_items: totalProcessed,
                status: 'processing',
                metadata: {
                  currentStatus: statusText,
                  totalProcessed,
                  totalPagesProcessed,
                  totalPagesExpected,
                  lastUpdate: new Date().toISOString()
                }
              })
              .eq('id', backgroundTaskId));
              
            console.log('📊 Background task updated:', {
              taskId: backgroundTaskId,
              progress: Math.round(overallPercent),
              totalProcessed
            });
          } catch (error) {
            console.error('Failed to update background task:', error);
          }
        }
      };

      // Start concurrent processing for each API key
      setExportStatus('Starting concurrent API processing...');
      setOverallProgress(15);

      const apiPromises = config.apiKeys.map(apiKey => 
        processAPIKeyPages(
          apiKey,
          pageDistribution[apiKey.id] || { startPage: 1, maxPages: 0 },
          config,
          exportId,
          onApiProgress
        )
      );

      // Wait for all API keys to complete
      const apiResults = await Promise.all(apiPromises);
      
      if (cancellationRef.current[exportId]) {
        setExportStatus('Export cancelled by user');
        setIsExporting(false);
        return exportId;
      }

      // Combine all results
      const allProducts = apiResults.flat();
      
      // Check if we actually found any products
      if (allProducts.length === 0) {
        const getStatusLabel = (status: number) => {
          const labels: Record<number, string> = {
            1: 'Valid',
            2: 'Deleted',
            3: 'Out of Stock',
            4: 'Hidden (too old)'
          };
          return labels[status] || `Status ${status}`;
        };

        const filterDetails = [
          `Status: ${getStatusLabel(config.status)}`,
          config.categoryId ? `Category ID: ${config.categoryId}` : 'All Categories',
          `Page Size: ${config.pageSize}`
        ];
        
        // Smart filter suggestions - check alternatives
        const suggestions = [];
        
        // Try status 1 if they selected something else
        if (config.status !== 1) {
          try {
            const altParams = { ...estimateParams, status: 1 };
            const altResponse = await callSunskyAPI('searchProducts', altParams, config.apiKeys[0].id);
            const altTotal = altResponse?.data?.products?.total ?? altResponse?.data?.total ?? 0;
            if (altTotal > 0 || altResponse?.data?.products?.result?.length > 0) {
              const count = altTotal || altResponse.data.products?.result?.length || 0;
              suggestions.push(`✓ Try Status "Valid" - found ${count.toLocaleString()} products`);
            }
          } catch (e) {
            console.warn('Could not check Status 1 alternative:', e);
          }
        }
        
        // Try all categories if they have a filter
        if (config.categoryId) {
          try {
            const altParams = { ...estimateParams };
            delete altParams.categoryId;
            const altResponse = await callSunskyAPI('searchProducts', altParams, config.apiKeys[0].id);
            const altTotal = altResponse?.data?.products?.total ?? altResponse?.data?.total ?? 0;
            if (altTotal > 0) {
              suggestions.push(`✓ Try "All Categories" - found ${altTotal.toLocaleString()} products`);
            }
          } catch (e) {
            console.warn('Could not check All Categories alternative:', e);
          }
        }
        
        // Add general suggestions
        if (suggestions.length === 0) {
          if (config.status !== 1) {
            suggestions.push('• Try Status: Valid (status 1)');
          }
          if (config.categoryId) {
            suggestions.push('• Try All Categories');
          }
          if ([2, 4].includes(config.status)) {
            suggestions.push('• Status "Deleted" and "Hidden" often have no products');
          }
        }

        const errorMessage = `No products found with these filters:\n\n${filterDetails.join('\n')}${suggestions.length > 0 ? '\n\nSuggested alternatives:\n' + suggestions.join('\n') : ''}`;
        
        setExportStatus('No products found - check filters');
        setOverallProgress(0);
        setIsExporting(false);
        
        toast({
          title: "No Data Found",
          description: errorMessage,
          variant: "destructive",
          duration: 12000
        });
        
        // Mark background task as failed if provided
        if (backgroundTaskId) {
          try {
            await supabase
              .from('background_tasks')
              .update({ 
                status: 'failed',
                completed_at: new Date().toISOString(),
                metadata: {
                  error: 'No products found matching criteria',
                  filters: {
                    status: config.status,
                    statusLabel: getStatusLabel(config.status),
                    categoryId: config.categoryId,
                    pageSize: config.pageSize
                  },
                  suggestions,
                  totalProcessed: 0,
                  lastUpdate: new Date().toISOString()
                }
              } as any)
              .eq('id', backgroundTaskId);
          } catch (error) {
            console.error('Failed to update background task:', error);
          }
        }
        
        return exportId;
      }
      
      const categoriesMap = new Map<number, { name: string; products: any[] }>();
      
      // Organize products by category
      allProducts.forEach(product => {
        const categoryId = product.categoryId || 0;
        if (!categoriesMap.has(categoryId)) {
          categoriesMap.set(categoryId, { 
            name: product.categoryName || 'Uncategorized', 
            products: [] 
          });
        }
        categoriesMap.get(categoryId)?.products.push(product);
      });

      const finalResults: ExportResult = {
        products: allProducts,
        totalFound: allProducts.length,
        categoriesMap,
        apiProgress: Array.from(progressTracker.values()),
        exportId
      };

      setExportResults(finalResults);
      setOverallProgress(100);
      const completionMessage = `Export completed! Found ${allProducts.length} products using ${config.apiKeys.length} API keys concurrently.`;
      setExportStatus(completionMessage);

      // Create export history entry and file for background task (only if we have products)
      if (backgroundTaskId && allProducts.length > 0) {
        try {
          // Generate Excel file content
          console.log('📊 Generating Excel file for background export...');
          const XLSX = (await import('xlsx')).default;
          
          // Create workbook
          const workbook = XLSX.utils.book_new();
          
          // Create main products sheet
          const productsData = allProducts.map(product => {
            const row: any = {};
            config.columns.forEach(column => {
              switch (column) {
                case 'itemNo':
                  row['Item Number'] = product.itemNo || product.sku || '';
                  break;
                case 'name':
                  row['Product Name'] = product.name || product.title || '';
                  break;
                case 'brandName':
                  row['Brand'] = product.brandName || '';
                  break;
                case 'price':
                  row['Price'] = product.price || '';
                  break;
                case 'stock':
                  row['Stock'] = product.stock || '';
                  break;
                case 'status':
                  row['Status'] = product.status || '';
                  break;
                case 'leadTime':
                  row['Lead Time'] = product.leadTime || '';
                  break;
                case 'warehouse':
                  row['Warehouse'] = product.warehouse || '';
                  break;
                case 'moq':
                  row['MOQ'] = product.moq || '';
                  break;
                default:
                  row[column] = product[column] || '';
              }
            });
            return row;
          });

          const productsSheet = XLSX.utils.json_to_sheet(productsData);
          XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');

          // Create summary sheet
          const summaryData = [
            ['Export Summary', ''],
            ['Total Products', allProducts.length],
            ['Categories', categoriesMap.size],
            ['Export Date', new Date().toISOString()],
            ['API Keys Used', config.apiKeys.length],
            ['', ''],
            ['Category Breakdown', ''],
            ...Array.from(categoriesMap.entries()).map(([id, cat]) => [cat.name, cat.products.length])
          ];
          const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

          // Convert to buffer
          const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
          const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          
          // Create file name
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `sunsky-export-${timestamp}.xlsx`;
          
          // Create export history entry
          console.log('📝 Creating export history entry...');
          
          // Get user ID
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error('Unable to get user for export history');
          }
          
          const { data: historyEntry, error: historyError } = await supabase
            .from('export_history')
            .insert({
              user_id: user.id,
              export_type: 'status_export',
              filters: {
                status: config.status,
                categoryId: config.categoryId,
                categoryName: categoriesMap.has(config.categoryId || 0) ? categoriesMap.get(config.categoryId || 0)?.name : 'All Categories',
                apiKeys: config.apiKeys,
                columns: config.columns,
                maxPages: config.maxPages,
                pageSize: config.pageSize
              },
              total_items: allProducts.length,
              status: 'completed',
              file_path: fileName,
              file_size: blob.size,
              metadata: {
                background: true,
                categories: categoriesMap.size,
                concurrent: true,
                apiKeys: config.apiKeys.length
              }
            } as any)
            .select()
            .single();

          if (historyError) {
            console.error('Failed to create export history:', historyError);
          } else {
            console.log('✅ Export history entry created:', historyEntry);
          }

          // Update background task with completion and file info
          await supabase
            .from('background_tasks')
            .update({ 
              progress: 100,
              status: 'completed',
              completed_at: new Date().toISOString(),
              metadata: {
                fileName,
                totalProducts: allProducts.length,
                fileSize: blob.size,
                completedAt: new Date().toISOString(),
                downloadableResults: true
              }
            } as any)
            .eq('id', backgroundTaskId);

          console.log('✅ Background export completed successfully:', {
            taskId: backgroundTaskId,
            totalProducts: allProducts.length,
            fileName,
            fileSize: blob.size
          });

          // Generate download link via edge function
          try {
            const { data: downloadData, error: downloadError } = await supabase.functions.invoke(
              'generate-export-download', 
              { body: { taskId: backgroundTaskId } }
            );
            
            if (downloadError) {
              console.error('Download generation failed:', downloadError);
            } else {
              console.log('✅ Download generation triggered successfully');
            }
          } catch (downloadErr) {
            console.error('Failed to trigger download generation:', downloadErr);
          }
          
        } catch (error) {
          console.error('Failed to complete background task with file:', error);
          // Still mark as completed even if file generation fails
          await ((supabase as any)
            .from('background_tasks')
            .update({ 
              progress: 100,
              total_items: allProducts.length,
              status: 'completed',
              metadata: {
                currentStatus: completionMessage,
                totalProcessed: allProducts.length,
                completedAt: new Date().toISOString(),
                error: `File generation failed: ${error.message}`
              }
            })
            .eq('id', backgroundTaskId));
        }
      } else {
        toast({
          title: "Concurrent Export Complete",
          description: `Successfully exported ${allProducts.length} products using ${config.apiKeys.length} API keys simultaneously.`
        });
      }

      return exportId;

    } catch (error) {
      console.error('Concurrent export error:', error);
      setExportStatus('Export failed');
      setOverallProgress(0);
      
      // Update background task failure if provided
      if (backgroundTaskId) {
        try {
          await ((supabase as any)
            .from('background_tasks')
            .update({ 
              status: 'failed',
              metadata: {
                error: error.message || 'Export failed',
                failedAt: new Date().toISOString()
              }
            })
            .eq('id', backgroundTaskId));
          console.log('❌ Background task marked as failed:', backgroundTaskId);
        } catch (updateError) {
          console.error('Failed to update background task failure:', updateError);
        }
      } else {
        toast({
          title: "Export Failed",
          description: error.message || "Failed to export products",
          variant: "destructive"
        });
      }
      
      throw error;
    } finally {
      setIsExporting(false);
      delete cancellationRef.current[exportId];
    }
  };

  const cancelExport = useCallback((exportId: string) => {
    cancellationRef.current[exportId] = true;
    setExportStatus('Cancelling export...');
    
    toast({
      title: "Export Cancelled",
      description: "Export cancellation requested",
      variant: "destructive"
    });
  }, [toast]);

  // Reconnect to active background tasks on page load
  useEffect(() => {
    const reconnectToActiveTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find active export tasks
        const { data: activeTasks, error } = await ((supabase as any)
          .from('background_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'concurrent_export')
          .eq('status', 'processing')
          .order('created_at', { ascending: false })
          .limit(1));

        if (error) {
          console.error('Failed to check for active tasks:', error);
          return;
        }

        if (activeTasks && activeTasks.length > 0) {
          const activeTask = activeTasks[0];
          console.log('🔄 Reconnecting to active export task:', (activeTask as any).id);
          
          // Update state to show we're reconnecting to an active export
          setIsExporting(true);
          setOverallProgress((activeTask as any).progress || 0);
          
          const metadata = (activeTask as any).metadata as any || {};
          setExportStatus(metadata.currentStatus || 'Reconnecting to active export...');
          
          // Show progress if available
          if (metadata.totalProcessed && metadata.totalPagesProcessed && metadata.totalPagesExpected) {
            // Create a simple progress indicator
            const mockProgress: ConcurrentExportProgress[] = [{
              apiKeyId: 'reconnecting',
              apiKeyName: 'Reconnecting...',
              currentPage: metadata.totalPagesProcessed || 0,
              totalPages: metadata.totalPagesExpected || 0,
              processedItems: metadata.totalProcessed || 0,
              status: 'processing',
              lastUpdate: new Date()
            }];
            setExportProgress(mockProgress);
          }

          toast({
            title: "Reconnected to Export",
            description: "Found an ongoing background export. Progress will continue updating.",
          });
        }
      } catch (error) {
        console.error('Failed to reconnect to active tasks:', error);
      }
    };

    reconnectToActiveTasks();
  }, [toast]);

  // Listen for background task updates
  useEffect(() => {
    const subscription = supabase
      .channel('background_task_updates')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'background_tasks',
          filter: 'type=eq.concurrent_export'
        },
        (payload) => {
          const task = payload.new;
          const metadata = task.metadata as any || {};
          
          console.log('📊 Background task update received:', task.id);
          
          // Update progress if this task matches our current export
          if (task.status === 'processing') {
            setOverallProgress(task.progress || 0);
            setExportStatus(metadata.currentStatus || 'Processing...');
            
            if (metadata.totalProcessed && metadata.totalPagesProcessed && metadata.totalPagesExpected) {
              const mockProgress: ConcurrentExportProgress[] = [{
                apiKeyId: 'background',
                apiKeyName: 'Background Export',
                currentPage: metadata.totalPagesProcessed || 0,
                totalPages: metadata.totalPagesExpected || 0,
                processedItems: metadata.totalProcessed || 0,
                status: 'processing',
                lastUpdate: new Date()
              }];
              setExportProgress(mockProgress);
            }
          } else if (task.status === 'completed') {
            setIsExporting(false);
            setOverallProgress(100);
            setExportStatus(metadata.currentStatus || 'Export completed!');
            
            if (metadata.downloadableResults) {
              const results: ExportResult = {
                products: metadata.downloadableResults.products || [],
                totalFound: metadata.downloadableResults.totalFound || 0,
                categoriesMap: new Map(),
                apiProgress: [],
                exportId: task.id
              };
              setExportResults(results);
            }

            toast({
              title: "Background Export Completed",
              description: `Export finished with ${metadata.totalProcessed || 0} products`,
            });
          } else if (task.status === 'failed') {
            setIsExporting(false);
            setExportStatus('Export failed');
            setOverallProgress(0);
            setExportProgress([]);
            
            toast({
              title: "Background Export Failed",
              description: metadata.error || 'Export failed',
              variant: "destructive"
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  return {
    isExporting,
    exportProgress,
    overallProgress,
    exportStatus,
    exportResults,
    startConcurrentExport,
    cancelExport
  };
};