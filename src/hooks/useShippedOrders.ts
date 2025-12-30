import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StoredShippedOrders,
  ShippedOrder,
  loadShippedOrders,
  saveShippedOrders,
  clearShippedOrders,
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

  const save = useCallback(async (items: ShippedOrder[], fileName?: string) => {
    await saveShippedOrders(items, fileName);
    await reload();
  }, [reload]);

  const clear = useCallback(async () => {
    await clearShippedOrders();
    setData(null);
  }, []);

  // Create lookup map for O(1) access by ASIN
  const shippedQtyMap = useMemo(() => {
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
  const getShippedQty = useCallback((asin: string | undefined | null): number => {
    if (!asin) return 0;
    return shippedQtyMap.get(asin.toUpperCase()) || 0;
  }, [shippedQtyMap]);

  // Load on mount
  useEffect(() => {
    reload();
  }, [reload]);

  return {
    shippedOrders: data?.items || [],
    totalItems: data?.totalItems || 0,
    totalQuantity: data?.totalQuantity || 0,
    lastModified: data?.lastModified,
    fileName: data?.fileName,
    isLoading,
    getShippedQty,
    shippedQtyMap,
    reload,
    save,
    clear,
  };
};
