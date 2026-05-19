import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StoredFBAInventory,
  FBAInventoryItem,
  loadFBAInventory,
  appendFBAInventory,
  clearFBAInventory,
  deleteFBAByFile,
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

  const append = useCallback(async (items: FBAInventoryItem[], fileName?: string) => {
    await appendFBAInventory(items, fileName);
    await reload();
  }, [reload]);

  const deleteFile = useCallback(async (fileName: string) => {
    await deleteFBAByFile(fileName);
    await reload();
  }, [reload]);

  const clear = useCallback(async () => {
    await clearFBAInventory();
    setData(null);
  }, []);

  const fbaQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.items) {
      for (const item of data.items) {
        const key = item.asin?.toUpperCase();
        if (key) {
          map.set(key, (map.get(key) || 0) + item.quantity);
        }
      }
    }
    return map;
  }, [data?.items]);

  const getFBAQty = useCallback((asin: string | undefined | null): number => {
    if (!asin) return 0;
    return fbaQtyMap.get(asin.toUpperCase()) || 0;
  }, [fbaQtyMap]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    fbaInventory: data?.items || [],
    files: data?.files || [],
    filesCount: data?.files.length || 0,
    totalItems: data?.totalItems || 0,
    totalQuantity: data?.totalQuantity || 0,
    lastModified: data?.lastModified,
    isLoading,
    getFBAQty,
    fbaQtyMap,
    reload,
    append,
    save: append, // backward-compat alias
    deleteFile,
    clear,
  };
};
