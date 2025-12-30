import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StoredFBAInventory,
  FBAInventoryItem,
  loadFBAInventory,
  saveFBAInventory,
  clearFBAInventory,
} from '@/utils/fbaInventoryStorage';

export const useFBAInventory = () => {
  const [data, setData] = useState<StoredFBAInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadFBAInventory();
      setData(loaded);
    } catch (error) {
      console.error('Failed to load FBA inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (items: FBAInventoryItem[], fileName?: string) => {
    await saveFBAInventory(items, fileName);
    await reload();
  }, [reload]);

  const clear = useCallback(async () => {
    await clearFBAInventory();
    setData(null);
  }, []);

  // Create lookup map for O(1) access by ASIN
  const fbaQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.items) {
      for (const item of data.items) {
        const key = item.asin?.toUpperCase();
        if (key) {
          // Aggregate quantities for same ASIN
          map.set(key, (map.get(key) || 0) + item.quantity);
        }
      }
    }
    return map;
  }, [data?.items]);

  // Lookup function
  const getFBAQty = useCallback((asin: string | undefined | null): number => {
    if (!asin) return 0;
    return fbaQtyMap.get(asin.toUpperCase()) || 0;
  }, [fbaQtyMap]);

  // Load on mount
  useEffect(() => {
    reload();
  }, [reload]);

  return {
    fbaInventory: data?.items || [],
    totalItems: data?.totalItems || 0,
    totalQuantity: data?.totalQuantity || 0,
    lastModified: data?.lastModified,
    fileName: data?.fileName,
    isLoading,
    getFBAQty,
    fbaQtyMap,
    reload,
    save,
    clear,
  };
};
