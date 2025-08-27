import { useState, useRef, useCallback } from 'react';
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
    
    // Use a reasonable maximum or the estimated pages, whichever is smaller
    const effectiveMaxPages = Math.min(estimatedPages, 1000); // Cap at 1000 pages for safety
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

    const updateProgress = (status: ConcurrentExportProgress['status'], error?: string) => {
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
            const pageProducts = response.data.products ?? response.data.result ?? [];
            results.push(...pageProducts);
            
            updateProgress('processing');
            
            // Stop if we got fewer results than expected (end of data)
            if (pageProducts.length < config.pageSize) {
              console.log(`API ${apiKey.name} reached end of data at page ${currentPage}`);
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
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
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

  const startConcurrentExport = async (config: ExportConfig): Promise<string> => {
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setIsExporting(true);
    setExportResults(null);
    setOverallProgress(0);
    setExportStatus('Initializing concurrent export...');
    
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
        const total = estimateResponse.data.total ?? estimateResponse.data.totalResults;
        if (total) {
          estimatedTotal = total;
          estimatedPages = Math.ceil(estimatedTotal / config.pageSize);
        } else if (estimateResponse.data.products?.length > 0) {
          // Conservative estimate if no total is provided
          const firstPageCount = estimateResponse.data.products.length;
          if (firstPageCount === config.pageSize) {
            estimatedPages = 100; // Conservative estimate for full first page
          } else {
            estimatedPages = 1; // Partial page suggests this might be all data
          }
          estimatedTotal = firstPageCount * estimatedPages;
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
      
      // Calculate overall progress more frequently
      const onApiProgress = (progress: ConcurrentExportProgress) => {
        progressTracker.set(progress.apiKeyId, progress);
        
        // Update the progress array
        setExportProgress(prev => 
          prev.map(p => p.apiKeyId === progress.apiKeyId ? progress : p)
        );
        
        // Calculate overall progress based on completed pages across all APIs
        const totalPagesProcessed = Array.from(progressTracker.values())
          .reduce((sum, p) => sum + (p as ConcurrentExportProgress).currentPage, 0);
        const totalPagesExpected = config.apiKeys.reduce((sum, api) => 
          sum + (pageDistribution[api.id]?.maxPages || 0), 0);
        const overallPercent = totalPagesExpected > 0 ? 
          Math.min(95, (totalPagesProcessed / totalPagesExpected) * 100) : 0;
        
        const totalProcessed = Array.from(progressTracker.values())
          .reduce((sum, p) => sum + (p as ConcurrentExportProgress).processedItems, 0);
        
        setOverallProgress(overallPercent);
        setExportStatus(`Processing: ${totalProcessed} products found, ${totalPagesProcessed}/${totalPagesExpected} pages...`);
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
      setExportStatus(`Export completed! Found ${allProducts.length} products using ${config.apiKeys.length} API keys concurrently.`);

      toast({
        title: "Concurrent Export Complete",
        description: `Successfully exported ${allProducts.length} products using ${config.apiKeys.length} API keys simultaneously.`
      });

      return exportId;

    } catch (error) {
      console.error('Concurrent export error:', error);
      setExportStatus('Export failed');
      setOverallProgress(0);
      
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export products",
        variant: "destructive"
      });
      
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