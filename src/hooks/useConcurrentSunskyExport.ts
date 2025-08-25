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
        body: { action, params, apiKeyId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sunsky API call failed:', error);
      throw error;
    }
  };

  const distributePages = (totalPages: number, apiKeys: Array<{ id: string; name: string }>) => {
    const distribution: { [apiKeyId: string]: number[] } = {};
    
    // Initialize distribution for each API key
    apiKeys.forEach(api => {
      distribution[api.id] = [];
    });

    // Distribute pages in round-robin fashion
    for (let page = 1; page <= totalPages; page++) {
      const apiIndex = (page - 1) % apiKeys.length;
      const apiKey = apiKeys[apiIndex];
      distribution[apiKey.id].push(page);
    }

    return distribution;
  };

  const processAPIKeyPages = async (
    apiKey: { id: string; name: string },
    pages: number[],
    config: ExportConfig,
    exportId: string,
    onProgress: (progress: ConcurrentExportProgress) => void
  ): Promise<any[]> => {
    const results: any[] = [];
    let currentPageIndex = 0;

    const updateProgress = (status: ConcurrentExportProgress['status'], error?: string) => {
      const progress: ConcurrentExportProgress = {
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        currentPage: currentPageIndex < pages.length ? pages[currentPageIndex] : pages[pages.length - 1] || 0,
        totalPages: pages.length,
        processedItems: results.length,
        status,
        error,
        lastUpdate: new Date()
      };
      onProgress(progress);
    };

    updateProgress('processing');

    try {
      while (currentPageIndex < pages.length && !cancellationRef.current[exportId]) {
        const page = pages[currentPageIndex];
        
        const searchParams: any = {
          page,
          pageSize: config.pageSize,
          status: config.status,
          lang: 'en'
        };

        if (config.categoryId) {
          searchParams.categoryId = config.categoryId;
        }

        try {
          const response = await callSunskyAPI('searchProducts', searchParams, apiKey.id);
          
          if (response?.result === 'success' && response?.data?.products) {
            const pageProducts = response.data.products;
            results.push(...pageProducts);
            
            updateProgress('processing');
            
            // Stop if we got fewer results than expected (end of data)
            if (pageProducts.length < config.pageSize) {
              break;
            }
          } else {
            console.warn(`API ${apiKey.name} page ${page} returned no data or error`);
          }
        } catch (pageError) {
          console.error(`API ${apiKey.name} page ${page} failed:`, pageError);
          updateProgress('error', pageError.message);
          // Continue with next page instead of failing completely
        }

        currentPageIndex++;
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 250));
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
      let totalPages = config.maxPages;
      
      if (estimateResponse?.result === 'success' && estimateResponse?.data) {
        if (estimateResponse.data.totalResults) {
          estimatedTotal = estimateResponse.data.totalResults;
          totalPages = Math.min(Math.ceil(estimatedTotal / config.pageSize), config.maxPages);
        } else if (estimateResponse.data.products?.length > 0) {
          // Conservative estimate if no total is provided
          estimatedTotal = estimateResponse.data.products.length * Math.min(totalPages, 50);
        }
      }

      setExportStatus(`Distributing ${totalPages} pages across ${config.apiKeys.length} API keys...`);
      setOverallProgress(10);

      // Distribute pages among API keys
      const pageDistribution = distributePages(totalPages, config.apiKeys);
      
      // Update initial progress with page counts
      const updatedProgress = initialProgress.map(progress => ({
        ...progress,
        totalPages: pageDistribution[progress.apiKeyId]?.length || 0,
        status: 'processing' as const
      }));
      setExportProgress(updatedProgress);

      // Track progress updates
      const progressTracker = new Map<string, ConcurrentExportProgress>();
      
      const onApiProgress = (progress: ConcurrentExportProgress) => {
        progressTracker.set(progress.apiKeyId, progress);
        
        // Update the progress array
        setExportProgress(prev => 
          prev.map(p => p.apiKeyId === progress.apiKeyId ? progress : p)
        );
        
        // Calculate overall progress
        const totalProcessed = Array.from(progressTracker.values())
          .reduce((sum, p) => sum + p.processedItems, 0);
        const totalExpected = totalPages * config.pageSize;
        const overallPercent = Math.min(95, (totalProcessed / totalExpected) * 100);
        
        setOverallProgress(overallPercent);
        setExportStatus(`Processing: ${totalProcessed} products found so far...`);
      };

      // Start concurrent processing for each API key
      setExportStatus('Starting concurrent API processing...');
      setOverallProgress(15);

      const apiPromises = config.apiKeys.map(apiKey => 
        processAPIKeyPages(
          apiKey,
          pageDistribution[apiKey.id] || [],
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