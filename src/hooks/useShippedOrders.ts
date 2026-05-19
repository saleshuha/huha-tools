import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StoredShippedOrders,
  ShippedOrder,
  loadShippedOrders,
  appendShippedOrders,
  clearShippedOrders,
  deleteShippedByFile,
} from '@/utils/shippedOrdersStorage';

export const useShippedOrders = () => {
  const [data, setData] = useState<StoredShippedOrders | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadShippedOrders();
      setData(loaded);
    } catch (error) {
      console.error('Failed to load shipped orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const append = useCallback(async (items: ShippedOrder[], fileName?: string) => {
    await appendShippedOrders(items, fileName);
    await reload();
  }, [reload]);

  const deleteFile = useCallback(async (fileName: string) => {
    await deleteShippedByFile(fileName);
    await reload();
  }, [reload]);

  const clear = useCallback(async () => {
    await clearShippedOrders();
    setData(null);
  }, []);

  const shippedQtyMap = useMemo(() => {
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

  const getShippedQty = useCallback((asin: string | undefined | null): number => {
    if (!asin) return 0;
    return shippedQtyMap.get(asin.toUpperCase()) || 0;
  }, [shippedQtyMap]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    shippedOrders: data?.items || [],
    files: data?.files || [],
    filesCount: data?.files.length || 0,
    totalItems: data?.totalItems || 0,
    totalQuantity: data?.totalQuantity || 0,
    lastModified: data?.lastModified,
    isLoading,
    getShippedQty,
    shippedQtyMap,
    reload,
    append,
    save: append, // backward-compat alias
    deleteFile,
    clear,
  };
};
