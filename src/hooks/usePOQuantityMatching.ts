import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductImages } from './useProductImages';
import { useCountry } from '@/contexts/CountryContext';

export interface MatchedItem {
  id: string;
  sku_code: string | null;
  model_number: string | null;
  asin: string | null;
  title: string | null;
  po_numbers: string[];
  requested_qty: number;
  ordered_qty: number;
  pending_qty: number;
  status: 'fulfilled' | 'partial' | 'not_ordered';
  image_url: string | null;
  sunsky_thumbnail: string | null;
}

export interface QuantityMatchingSummary {
  total_requested: number;
  total_ordered: number;
  total_pending: number;
  match_rate: number;
  items_count: number;
  fulfilled_count: number;
  partial_count: number;
  not_ordered_count: number;
}

export interface UploadedOrderItem {
  sku: string;
  quantity: number;
}

interface UsePOQuantityMatchingOptions {
  selectedPOs?: string[];
  statusFilter?: 'all' | 'pending' | 'partial' | 'fulfilled' | 'not_ordered';
  searchQuery?: string;
  uploadedOrders?: UploadedOrderItem[];
}

export const usePOQuantityMatching = (options: UsePOQuantityMatchingOptions = {}) => {
  const { selectedPOs = [], statusFilter = 'all', searchQuery = '', uploadedOrders = [] } = options;
  const { selectedCountry } = useCountry();
  const { getImageByAsin, isLoading: imagesLoading } = useProductImages();

  // Fetch PO demands (what's requested in POs)
  const { data: poDemandsData, isLoading: poDemandsLoading, refetch: refetchPO } = useQuery({
    queryKey: ['po-quantity-demands', selectedCountry],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('po_orders')
        .select('id, po_number, sku_code, model_number, asin, title, quantity, status')
        .eq('user_id', session.session.user.id)
        .eq('country', selectedCountry)
        .not('status', 'in', '("cancelled","closed")');

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch Sunsky SKU thumbnails for fallback images
  const { data: sunskySkusData } = useQuery({
    queryKey: ['sunsky-skus-thumbnails'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sunsky_skus')
        .select('sku_code, model_number, thumbnail_url')
        .eq('user_id', session.session.user.id)
        .not('thumbnail_url', 'is', null);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Create SKU thumbnail map
  const skuThumbnailMap = useMemo(() => {
    const map = new Map<string, string>();
    sunskySkusData?.forEach(sku => {
      if (sku.sku_code && sku.thumbnail_url) {
        map.set(sku.sku_code.toLowerCase(), sku.thumbnail_url);
      }
      if (sku.model_number && sku.thumbnail_url) {
        map.set(sku.model_number.toLowerCase(), sku.thumbnail_url);
      }
    });
    return map;
  }, [sunskySkusData]);

  // Build supplier order quantity map from uploaded data
  const supplierMap = useMemo(() => {
    const map = new Map<string, number>();
    uploadedOrders.forEach(order => {
      const key = order.sku.toLowerCase().trim();
      if (key) {
        map.set(key, (map.get(key) || 0) + order.quantity);
      }
    });
    return map;
  }, [uploadedOrders]);

  // Compute matched items
  const matchedItems = useMemo((): MatchedItem[] => {
    if (!poDemandsData || uploadedOrders.length === 0) return [];

    // Filter by selected POs if any
    const filteredPO = selectedPOs.length > 0
      ? poDemandsData.filter(po => selectedPOs.includes(po.po_number))
      : poDemandsData;

    // Group PO demands by SKU/Model
    const demandMap = new Map<string, {
      sku_code: string | null;
      model_number: string | null;
      asin: string | null;
      title: string | null;
      po_numbers: Set<string>;
      requested_qty: number;
    }>();

    filteredPO.forEach(po => {
      // Create a key based on SKU or model number
      const key = (po.sku_code || po.model_number || po.asin || po.id).toLowerCase();
      
      if (demandMap.has(key)) {
        const existing = demandMap.get(key)!;
        existing.po_numbers.add(po.po_number);
        existing.requested_qty += po.quantity || 0;
      } else {
        demandMap.set(key, {
          sku_code: po.sku_code,
          model_number: po.model_number,
          asin: po.asin,
          title: po.title,
          po_numbers: new Set([po.po_number]),
          requested_qty: po.quantity || 0,
        });
      }
    });

    // Match demands with uploaded supplier orders
    const items: MatchedItem[] = [];
    let idCounter = 0;

    demandMap.forEach((demand, key) => {
      // Try to find ordered quantity by SKU code first, then model number
      let ordered_qty = 0;
      
      if (demand.sku_code && supplierMap.has(demand.sku_code.toLowerCase())) {
        ordered_qty = supplierMap.get(demand.sku_code.toLowerCase()) || 0;
      } else if (demand.model_number && supplierMap.has(demand.model_number.toLowerCase())) {
        ordered_qty = supplierMap.get(demand.model_number.toLowerCase()) || 0;
      } else if (supplierMap.has(key)) {
        ordered_qty = supplierMap.get(key) || 0;
      }

      const pending_qty = Math.max(0, demand.requested_qty - ordered_qty);
      
      // Determine status
      let status: 'fulfilled' | 'partial' | 'not_ordered';
      if (ordered_qty >= demand.requested_qty && ordered_qty > 0) {
        status = 'fulfilled';
      } else if (ordered_qty > 0) {
        status = 'partial';
      } else {
        status = 'not_ordered';
      }

      // Get image - try product images first, then Sunsky thumbnail
      let image_url: string | null = null;
      let sunsky_thumbnail: string | null = null;

      if (demand.asin) {
        const productImage = getImageByAsin(demand.asin);
        if (productImage) {
          image_url = productImage.image_url;
        }
      }

      // Fallback to Sunsky thumbnail
      if (!image_url) {
        if (demand.sku_code) {
          sunsky_thumbnail = skuThumbnailMap.get(demand.sku_code.toLowerCase()) || null;
        }
        if (!sunsky_thumbnail && demand.model_number) {
          sunsky_thumbnail = skuThumbnailMap.get(demand.model_number.toLowerCase()) || null;
        }
      }

      items.push({
        id: `match-${idCounter++}`,
        sku_code: demand.sku_code,
        model_number: demand.model_number,
        asin: demand.asin,
        title: demand.title,
        po_numbers: Array.from(demand.po_numbers),
        requested_qty: demand.requested_qty,
        ordered_qty,
        pending_qty,
        status,
        image_url,
        sunsky_thumbnail,
      });
    });

    return items;
  }, [poDemandsData, uploadedOrders, selectedPOs, getImageByAsin, skuThumbnailMap, supplierMap]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let items = matchedItems;

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        items = items.filter(i => i.pending_qty > 0);
      } else {
        items = items.filter(i => i.status === statusFilter);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        i.sku_code?.toLowerCase().includes(query) ||
        i.model_number?.toLowerCase().includes(query) ||
        i.asin?.toLowerCase().includes(query) ||
        i.title?.toLowerCase().includes(query) ||
        i.po_numbers.some(po => po.toLowerCase().includes(query))
      );
    }

    return items;
  }, [matchedItems, statusFilter, searchQuery]);

  // Calculate summary
  const summary = useMemo((): QuantityMatchingSummary => {
    const total_requested = matchedItems.reduce((sum, i) => sum + i.requested_qty, 0);
    const total_ordered = matchedItems.reduce((sum, i) => sum + i.ordered_qty, 0);
    const total_pending = matchedItems.reduce((sum, i) => sum + i.pending_qty, 0);
    const match_rate = total_requested > 0 ? Math.round((total_ordered / total_requested) * 100) : 0;

    return {
      total_requested,
      total_ordered,
      total_pending,
      match_rate,
      items_count: matchedItems.length,
      fulfilled_count: matchedItems.filter(i => i.status === 'fulfilled').length,
      partial_count: matchedItems.filter(i => i.status === 'partial').length,
      not_ordered_count: matchedItems.filter(i => i.status === 'not_ordered').length,
    };
  }, [matchedItems]);

  // Get unique PO numbers for selection
  const availablePOs = useMemo(() => {
    const poSet = new Set<string>();
    poDemandsData?.forEach(po => poSet.add(po.po_number));
    return Array.from(poSet).sort();
  }, [poDemandsData]);

  const refetch = useCallback(async () => {
    await refetchPO();
  }, [refetchPO]);

  return {
    matchedItems: filteredItems,
    allItems: matchedItems,
    summary,
    availablePOs,
    isLoading: poDemandsLoading || imagesLoading,
    hasUploadedData: uploadedOrders.length > 0,
    refetch,
  };
};
