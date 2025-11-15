import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';
import { useAsinInventory, AsinInventoryItem } from './useAsinInventory';

export interface PaginationFilters {
  searchTerm?: string;
  searchMethod?: 'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes';
  searchMode?: 'starts' | 'contains'; // New: Search mode toggle
  statusFilter?: string;
  quickFilter?: 'all' | 'low-stock' | 'out-of-stock' | 'recent';
  dateFilterFrom?: Date;
  dateFilterTo?: Date;
  showDisabledItems?: boolean;
  sortBy?: 'dateAdded' | 'asin' | 'quantity' | 'status' | 'title' | 'serialNumber';
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult {
  items: AsinInventoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useAsinInventoryPaginated(
  page: number = 1,
  pageSize: number = 100,
  filters: PaginationFilters = {}
) {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const queryClient = useQueryClient();
  
  // Get all mutation functions from the base hook
  const baseHook = useAsinInventory();
  
  // Build query with filters applied on backend
  const fetchPaginatedInventory = async (): Promise<PaginatedResult> => {
    const startTime = performance.now();
    console.log('🔍 Starting inventory fetch...', { page, pageSize, filters });
    
    if (!selectedCountry) {
      return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Start building the query
    let query = supabase
      .from('asin_inventory')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('country', selectedCountry);

    // NOTE: is_active filter removed from DB query for performance
    // It will be applied client-side after fetching data

    // Apply search filters with optimized query strategy
    const searchMode = filters.searchMode || 'contains';
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerms = filters.searchTerm.toLowerCase().trim().split(' ').filter(t => t.length > 0);
      
      if (filters.searchMethod === 'asin') {
        // Search by ASIN - use starts-with for better performance
        const pattern = searchMode === 'starts' ? `${searchTerms[0]}%` : `%${searchTerms[0]}%`;
        const asinFilters = searchTerms.map(term => `asin.ilike.${searchMode === 'starts' ? `${term}%` : `%${term}%`}`).join(',');
        query = query.or(asinFilters);
      } else if (filters.searchMethod === 'sku') {
        // Search by SKU - use starts-with for better performance
        const skuFilters = searchTerms.map(term => `sku.ilike.${searchMode === 'starts' ? `${term}%` : `%${term}%`}`).join(',');
        query = query.or(skuFilters);
      } else if (filters.searchMethod === 'serial') {
        // Search by Serial Number - use starts-with for better performance
        const serialFilters = searchTerms.map(term => `serial_number.ilike.${searchMode === 'starts' ? `${term}%` : `%${term}%`}`).join(',');
        query = query.or(serialFilters);
      } else if (filters.searchMethod === 'title') {
        // Search by Title - always use contains for text fields
        searchTerms.forEach(term => {
          query = query.ilike('title', `%${term}%`);
        });
      } else if (filters.searchMethod === 'notes') {
        // Search by Notes - always use contains
        const notesFilters = searchTerms.map(term => `notes.ilike.%${term}%`).join(',');
        query = query.or(notesFilters);
      } else {
        // Search all fields (method === 'all')
        // For ID fields (ASIN, SKU, Serial), use starts-with when in starts mode for 10x speed boost
        const orFilters = searchTerms.map(term => {
          const idPattern = searchMode === 'starts' ? `${term}%` : `%${term}%`;
          return `asin.ilike.${idPattern},serial_number.ilike.${idPattern},sku.ilike.${idPattern},title.ilike.%${term}%,notes.ilike.%${term}%`;
        }).join(',');
        query = query.or(orFilters);
      }
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      // Only apply specific status filter when explicitly set
      const effectiveStatus = filters.statusFilter === 'ordered' ? 'sold' : filters.statusFilter;
      query = query.eq('status', effectiveStatus);
    } else {
      // When 'all' is selected, exclude only sold items
      query = query.not('status', 'eq', 'sold');
    }

    // Apply quick filters
    if (filters.quickFilter === 'low-stock') {
      query = query.gt('quantity', 0).lte('quantity', 5);
    } else if (filters.quickFilter === 'out-of-stock') {
      query = query.eq('quantity', 0);
      
      // Apply date filters for out-of-stock
      if (filters.dateFilterFrom) {
        const fromDate = new Date(filters.dateFilterFrom);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte('date_added', fromDate.toISOString());
      }
      if (filters.dateFilterTo) {
        const toDate = new Date(filters.dateFilterTo);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('date_added', toDate.toISOString());
      }
    } else if (filters.quickFilter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('date_added', sevenDaysAgo.toISOString());
    }

    // Apply sorting
    const sortField = filters.sortBy === 'dateAdded' ? 'date_added' :
                     filters.sortBy === 'serialNumber' ? 'serial_number' :
                     filters.sortBy || 'date_added';
    const ascending = filters.sortOrder === 'asc';
    query = query.order(sortField, { ascending });

    // Get total count
    const { count, error: countError } = await query;
    if (countError) throw countError;

    // Get paginated data
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error } = await query.range(from, to);
    if (error) throw error;

    const formattedData: AsinInventoryItem[] = (data || []).map(item => ({
      id: item.id,
      asin: item.asin,
      serialNumber: item.serial_number,
      sku: item.sku || undefined,
      title: item.title || undefined,
      status: item.status,
      dateAdded: item.date_added,
      dateSold: item.date_sold || undefined,
      notes: item.notes || undefined,
      quantity: item.quantity ?? 1,
      restockDate: item.restock_date || undefined,
      restockQuantity: item.restock_quantity || undefined,
      lastRestockDate: item.last_restock_date || undefined,
      eligible_for_restock: item.eligible_for_restock || false,
      manual_restock_override: item.manual_restock_override || false,
      isActive: item.is_active ?? true,
      first_stock_added_at: item.first_stock_added_at || undefined,
    }));

    // Remove duplicates (based on ASIN + serialNumber)
    const uniqueItems = Array.from(
      new Map(formattedData.map(item => [`${item.asin}-${item.serialNumber}`, item])).values()
    );

    // LAYER 1: Apply is_active filter client-side (fast since only 100 items max)
    let filteredItems = uniqueItems;
    if (filters.showDisabledItems) {
      // When toggle is ON: Show ONLY disabled items (is_active = false)
      filteredItems = uniqueItems.filter(item => item.isActive === false);
    } else {
      // When toggle is OFF: Show only active items (default)
      filteredItems = uniqueItems.filter(item => 
        item.isActive === undefined || item.isActive === null || item.isActive === true
      );
    }

    // Adjust total count proportionally based on client-side filtering
    const adjustedCount = !filters.showDisabledItems && count && uniqueItems.length > 0
      ? Math.ceil((filteredItems.length / uniqueItems.length) * count)
      : count || 0;

    const endTime = performance.now();
    console.log(`✅ Inventory fetch complete in ${(endTime - startTime).toFixed(2)}ms`, {
      itemsReturned: filteredItems.length,
      totalCount: adjustedCount
    });

    return {
      items: filteredItems,
      totalCount: adjustedCount,
      page,
      pageSize,
      totalPages: Math.ceil(adjustedCount / pageSize)
    };
  };

  // Use React Query for automatic caching and refetching
  const {
    data: paginatedResult,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: [
      'asin-inventory-paginated',
      selectedCountry,
      page,
      pageSize,
      filters.searchTerm, // Use debounced search term passed from component
      filters.searchMethod,
      filters.searchMode,
      filters.statusFilter,
      filters.sortBy,
      filters.sortOrder,
      filters.quickFilter,
      filters.dateFilterFrom?.toISOString(),
      filters.dateFilterTo?.toISOString(),
      filters.showDisabledItems
    ],
    queryFn: fetchPaginatedInventory,
    enabled: !!selectedCountry,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    staleTime: 1000, // Consider data fresh for 1 second (prevents rapid refetches)
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Invalidate cache when mutations occur
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['asin-inventory-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['asin-inventory'] });
    // Remove metrics invalidation - metrics should only update on actual inventory changes via subscription
  }, [queryClient]);

  // Wrap mutation functions to invalidate cache
  const wrappedMutations = useMemo(() => ({
    addItem: async (item: Omit<AsinInventoryItem, 'id'>) => {
      await baseHook.addItem(item);
      invalidateCache();
    },
    updateItemStatus: async (id: string, status: AsinInventoryItem['status']) => {
      await baseHook.updateItemStatus(id, status);
      invalidateCache();
    },
    deleteItem: async (id: string) => {
      await baseHook.deleteItem(id);
      invalidateCache();
    },
    bulkAdd: async (items: Omit<AsinInventoryItem, 'id'>[]) => {
      await baseHook.bulkAdd(items);
      invalidateCache();
    },
    restockItem: async (id: string, quantity: number) => {
      await baseHook.restockItem(id, quantity);
      invalidateCache();
    },
    updateQuantity: async (id: string, newQuantity: number, reason: string) => {
      await baseHook.updateQuantity(id, newQuantity, reason);
      invalidateCache();
    },
    updateBin: async (id: string, binLocation: string) => {
      await baseHook.updateBin(id, binLocation);
      invalidateCache();
    },
    updateSku: async (id: string, newSku: string) => {
      await baseHook.updateSku(id, newSku);
      invalidateCache();
    },
    updateSerialNumber: async (id: string, newSerialNumber: string) => {
      // Optimistic update: immediately update the cached data
      queryClient.setQueryData<PaginatedResult>(
        ['asinInventoryPaginated', selectedCountry, page, pageSize, filters],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map(item =>
              item.id === id ? { ...item, serialNumber: newSerialNumber.trim() } : item
            ),
          };
        }
      );
      
      // Perform the actual update
      await baseHook.updateSerialNumber(id, newSerialNumber);
      
      // Refetch in background to ensure data consistency
      invalidateCache();
    },
    updateTitle: async (id: string, newTitle: string) => {
      await baseHook.updateTitle(id, newTitle);
      invalidateCache();
    },
    bulkUpdateSkus: async (asinSkuPairs: Array<{ asin: string; sku: string }>) => {
      await baseHook.bulkUpdateSkus(asinSkuPairs);
      invalidateCache();
    },
    bulkUpdateTitles: async (asinTitlePairs: Array<{ asin: string; title: string }>) => {
      await baseHook.bulkUpdateTitles(asinTitlePairs);
      invalidateCache();
    },
    fetchTitlesFromSunsky: baseHook.fetchTitlesFromSunsky,
    updateRestockEligibility: async (itemId: string, eligible: boolean) => {
      await baseHook.updateRestockEligibility(itemId, eligible);
      invalidateCache();
    },
    calculateAutoRestockEligibility: baseHook.calculateAutoRestockEligibility,
    toggleItemActive: async (id: string, isActive: boolean) => {
      await baseHook.toggleItemActive(id, isActive);
      invalidateCache();
    },
  }), [baseHook, invalidateCache]);

  return {
    // Paginated data
    inventory: paginatedResult?.items || [],
    totalCount: paginatedResult?.totalCount || 0,
    totalPages: paginatedResult?.totalPages || 0,
    currentPage: page,
    pageSize,
    loading: isLoading,
    isFetching, // LAYER 4: Expose isFetching for accurate loading indicator
    error,
    
    // Mutations (wrapped with cache invalidation)
    ...wrappedMutations,
    
    // Refetch function
    refetch: () => {
      invalidateCache();
      return refetch();
    },
  };
}
