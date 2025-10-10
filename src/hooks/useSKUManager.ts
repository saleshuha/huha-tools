import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SunskySKU {
  id: string;
  user_id: string;
  sku_code: string;
  title?: string;
  cost?: number;
  weight?: number;
  currency?: string;
  country?: string;
  description?: string;
  product_data?: any;
  created_at: string;
  updated_at: string;
  images_downloaded?: boolean;
  images_download_date?: string | null;
  thumbnail_url?: string | null;
  image_count?: number;
}

const CACHE_KEY = 'sunsky_skus_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const useSKUManager = () => {
  const [sunskySKUs, setSunskySKUs] = useState<SunskySKU[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(1000); // Load 1000 SKUs at a time
  const { toast } = useToast();

  // Cache management
  const getCachedSKUs = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  }, []);

  const setCachedSKUs = useCallback((data: SunskySKU[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }, []);

  // Get SKU count only (for metrics display)
  const fetchSKUCount = useCallback(async () => {
    try {
      // Get current user to filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('sunsky_skus')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      setTotalCount(count || 0);
      console.log(`Total SKUs for user: ${count}`);
    } catch (error) {
      console.error('Error fetching SKU count:', error);
    }
  }, []);

  // Optimized SKU fetching with pagination and caching
  const fetchSKUs = useCallback(async (page: number = 1, useCache: boolean = true) => {
    // Try cache first for first page
    if (page === 1 && useCache) {
      const cached = getCachedSKUs();
      if (cached) {
        console.log('Using cached SKUs:', cached.length);
        setSunskySKUs(cached);
        setTotalCount(cached.length);
        return;
      }
    }

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus(`Loading SKUs (page ${page})...`);

    try {
      // Get current user first
      setLoadingProgress(10);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get total count for this user
      setLoadingProgress(20);
      const { count, error: countError } = await supabase
        .from('sunsky_skus')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) throw countError;
      setTotalCount(count || 0);

      setLoadingProgress(30);
      setLoadingStatus(`Found ${count} SKUs for user, loading batch ${page}...`);

      // Fetch SKUs in batches
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      setLoadingProgress(50);

      const { data, error } = await supabase
        .from('sunsky_skus')
        .select(`
          id,
          user_id,
          sku_code,
          title,
          cost,
          weight,
          currency,
          country,
          product_data,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setLoadingProgress(80);
      setLoadingStatus('Processing SKU data...');

      const skuData = data || [];
      
      if (page === 1) {
        setSunskySKUs(skuData);
        // Cache first page for faster subsequent loads
        setCachedSKUs(skuData);
      } else {
        setSunskySKUs(prev => [...prev, ...skuData]);
      }

      setLoadingProgress(100);
      setLoadingStatus(`Loaded ${skuData.length} SKUs`);

      console.log(`Successfully loaded ${skuData.length} SKUs (page ${page})`);

    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setLoadingStatus('Failed to load SKUs');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch SKUs",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
      }, 500);
    }
  }, [itemsPerPage, getCachedSKUs, setCachedSKUs, toast]);

  // Load more SKUs (pagination)
  const loadMoreSKUs = useCallback(async () => {
    const nextPage = Math.floor(sunskySKUs.length / itemsPerPage) + 1;
    await fetchSKUs(nextPage, false);
  }, [sunskySKUs.length, itemsPerPage, fetchSKUs]);

  // Add multiple SKUs with optimized batch processing
  const addSKUs = useCallback(async (skus: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('Preparing SKUs...');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setLoadingProgress(10);
      
      // Get user's country from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Failed to get user profile');

      setLoadingProgress(20);
      setLoadingStatus('Processing SKU data...');

      // Add user_id and country to each SKU
      const skusWithUserId = skus.map(sku => ({
        ...sku,
        user_id: user.id,
        country: profile.country
      }));

      console.log('Adding SKUs to database:', skusWithUserId.length);

      setLoadingProgress(40);
      setLoadingStatus(`Uploading ${skusWithUserId.length} SKUs...`);

      // Process in batches using user's configured batch size or optimal default
      const chunkSize = 1000; // Increased chunk size for better performance
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (let i = 0; i < skusWithUserId.length; i += chunkSize) {
        const chunk = skusWithUserId.slice(i, i + chunkSize);
        const progress = 40 + ((i / skusWithUserId.length) * 50);
        setLoadingProgress(progress);
        setLoadingStatus(`Processing batch ${Math.floor(i/chunkSize) + 1}/${Math.ceil(skusWithUserId.length/chunkSize)} (${chunk.length} SKUs)...`);
        
        try {
          // Use batch insert for better performance
          const { data: chunkData, error: chunkError } = await supabase
            .from('sunsky_skus')
            .insert(chunk)
            .select('id');
            
          if (chunkError) {
            // If batch insert fails due to duplicates, try upsert
            const { data: upsertData, error: upsertError } = await supabase
              .from('sunsky_skus')
              .upsert(chunk, { 
                onConflict: 'user_id,sku_code',
                ignoreDuplicates: false
              })
              .select('id');
              
            if (upsertError) throw upsertError;
            successCount += upsertData?.length || 0;
            duplicateCount += chunk.length - (upsertData?.length || 0);
          } else {
            successCount += chunkData?.length || 0;
          }
          
          console.log(`✅ Batch ${Math.floor(i/chunkSize) + 1} successful: ${chunk.length} SKUs processed`);
          
        } catch (chunkError: any) {
          console.error('❌ Batch failed:', chunkError);
          
          // Try smaller sub-batches first (100 SKUs)
          const subBatchSize = 100;
          let chunkSuccessCount = 0;
          
          for (let j = 0; j < chunk.length; j += subBatchSize) {
            const subBatch = chunk.slice(j, j + subBatchSize);
            
            try {
              const { data: subBatchData, error: subBatchError } = await supabase
                .from('sunsky_skus')
                .upsert(subBatch, { 
                  onConflict: 'user_id,sku_code',
                  ignoreDuplicates: false
                })
                .select('id');
                
              if (subBatchError) throw subBatchError;
              chunkSuccessCount += subBatchData?.length || 0;
              console.log(`✅ Sub-batch ${Math.floor(j/subBatchSize) + 1} successful: ${subBatch.length} SKUs`);
              
            } catch (subBatchError) {
              console.error('❌ Sub-batch failed, trying individual SKUs:', subBatchError);
              
              // Only fallback to individual processing for this small sub-batch
              for (const sku of subBatch) {
                try {
                  await supabase
                    .from('sunsky_skus')
                    .upsert([sku], { 
                      onConflict: 'user_id,sku_code',
                      ignoreDuplicates: false
                    });
                  chunkSuccessCount++;
                } catch (individualError) {
                  console.error('Individual SKU failed:', individualError);
                  errorCount++;
                }
              }
            }
          }
          
          successCount += chunkSuccessCount;
          errorCount += chunk.length - chunkSuccessCount;
        }
      }

      setLoadingProgress(90);
      setLoadingStatus('Refreshing data...');

      // Clear cache and refresh
      localStorage.removeItem(CACHE_KEY);
      await fetchSKUs(1, false);

      setLoadingProgress(100);
      
      toast({
        title: "Success",
        description: `Processed ${successCount} SKUs successfully. ${errorCount} failed.`
      });

    } catch (error) {
      console.error('Error adding SKUs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add SKUs",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStatus('');
      }, 1000);
    }
  }, [fetchSKUs, toast]);

  // Refresh SKUs (clear cache and reload)
  const refreshSKUs = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    setCurrentPage(1);
    await fetchSKUs(1, false);
  }, [fetchSKUs]);

  return {
    sunskySKUs,
    isLoading,
    loadingProgress,
    loadingStatus,
    totalCount,
    currentPage,
    itemsPerPage,
    hasMoreSKUs: sunskySKUs.length < totalCount,
    fetchSKUs,
    fetchSKUCount,
    loadMoreSKUs,
    addSKUs,
    refreshSKUs
  };
};