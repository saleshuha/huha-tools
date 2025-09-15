import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductImages } from './useProductImages';
import { useCallback, useState } from 'react';
import { useToast } from './use-toast';

interface InventoryAsinItem {
  asin: string;
  title: string | null;
  quantity: number;
  status: string;
  hasImage: boolean;
  imageUrl?: string;
}

interface BulkImageUploadProgress {
  processed: number;
  total: number;
  currentAsin?: string;
}

export function useInventoryAsinImages() {
  const { toast } = useToast();
  const { productImages, addProductImage } = useProductImages();
  const [uploadProgress, setUploadProgress] = useState<BulkImageUploadProgress>({ processed: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch inventory ASINs
  const { 
    data: inventoryAsinItems = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['inventory-asin-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asin_inventory')
        .select('asin, title, quantity, status')
        .not('asin', 'is', null)
        .neq('asin', '');

      if (error) throw error;

      // Group by ASIN and aggregate
      const asinMap = new Map<string, InventoryAsinItem>();
      
      data.forEach(item => {
        if (asinMap.has(item.asin)) {
          const existing = asinMap.get(item.asin)!;
          existing.quantity += item.quantity;
        } else {
          asinMap.set(item.asin, {
            asin: item.asin,
            title: item.title,
            quantity: item.quantity,
            status: item.status,
            hasImage: false,
            imageUrl: undefined
          });
        }
      });

      return Array.from(asinMap.values());
    }
  });

  // Combine with product images
  const inventoryAsinItemsWithImages = inventoryAsinItems.map(item => {
    const productImage = productImages?.find(img => img.asin === item.asin);
    return {
      ...item,
      hasImage: !!productImage,
      imageUrl: productImage?.image_url
    };
  });

  // Filter items
  const missingAsinItems = inventoryAsinItemsWithImages.filter(item => !item.hasImage);
  const coveredAsinItems = inventoryAsinItemsWithImages.filter(item => item.hasImage);

  // Bulk upload functionality
  const bulkUploadImages = useCallback(async (asinImagePairs: Array<{ asin: string; imageUrl: string }>) => {
    if (!asinImagePairs.length) return;

    setIsProcessing(true);
    setUploadProgress({ processed: 0, total: asinImagePairs.length });

    let processed = 0;
    let errors = 0;

    for (const { asin, imageUrl } of asinImagePairs) {
      try {
        setUploadProgress({
          processed,
          total: asinImagePairs.length,
          currentAsin: asin
        });

        await addProductImage.mutateAsync({
          asin,
          imageUrl,
          imageName: `Image for ${asin}`
        });

        processed++;
      } catch (error) {
        errors++;
        console.error(`Failed to upload image for ASIN ${asin}:`, error);
      }

      setUploadProgress({
        processed: processed + errors,
        total: asinImagePairs.length,
        currentAsin: asin
      });
    }

    setIsProcessing(false);
    setUploadProgress({ processed: 0, total: 0 });

    toast({
      title: "Bulk Upload Complete",
      description: `Successfully uploaded ${processed} images. ${errors > 0 ? `${errors} failed.` : ''}`,
      variant: processed > 0 ? "default" : "destructive"
    });

    if (processed > 0) {
      refetch();
    }
  }, [addProductImage, toast, refetch]);

  // Export missing ASINs
  const exportMissingAsins = useCallback(() => {
    if (missingAsinItems.length === 0) {
      toast({
        title: "No Missing ASINs",
        description: "All inventory ASINs have images assigned.",
      });
      return;
    }

    const csvContent = [
      ['ASIN', 'Title', 'Quantity', 'Status', 'Image URL'],
      ...missingAsinItems.map(item => [
        item.asin,
        item.title || '',
        item.quantity.toString(),
        item.status,
        '' // Empty for user to fill
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-inventory-asins-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${missingAsinItems.length} ASINs with missing images.`,
    });
  }, [missingAsinItems, toast]);

  return {
    inventoryAsinItems: inventoryAsinItemsWithImages,
    missingAsinItems,
    coveredAsinItems,
    isLoading,
    error,
    refetch,
    bulkUploadImages,
    exportMissingAsins,
    uploadProgress,
    isProcessing
  };
}