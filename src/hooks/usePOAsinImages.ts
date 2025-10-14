import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProductImages } from './useProductImages';

export interface POAsinItem {
  id: string;
  asin: string;
  title: string;
  po_number: string;
  quantity: number;
  status: string;
  hasImage: boolean;
  imageUrl?: string;
}

export interface BulkImageUploadProgress {
  current: number;
  total: number;
  processing: boolean;
  currentAsin?: string;
}

export const usePOAsinImages = () => {
  const [uploadProgress, setUploadProgress] = useState<BulkImageUploadProgress>({
    current: 0,
    total: 0,
    processing: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { productImages, addProductImage } = useProductImages();

  // Fetch PO orders with ASINs
  const { data: poAsinItems = [], isLoading, refetch } = useQuery({
    queryKey: ['po-asin-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: poOrders, error } = await supabase
        .from('po_orders')
        .select('id, asin, title, po_number, quantity, status')
        .eq('user_id' as any, user.id as any)
        .not('asin', 'is', null)
        .neq('asin' as any, '' as any)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by ASIN to avoid duplicates
      const asinMap = new Map<string, POAsinItem>();
      
      (poOrders as any)?.forEach((order: any) => {
        const asin = order.asin!;
        if (asinMap.has(asin)) {
          const existing = asinMap.get(asin)!;
          existing.quantity += order.quantity;
        } else {
          asinMap.set(asin, {
            id: order.id,
            asin,
            title: order.title || `Product ${asin}`,
            po_number: order.po_number,
            quantity: order.quantity,
            status: order.status,
            hasImage: false,
            imageUrl: undefined
          });
        }
      });

      return Array.from(asinMap.values());
    }
  });

  // Combine PO ASINs with existing images
  const poAsinItemsWithImages = useMemo(() => {
    console.log('🔍 PO Images Debug:', {
      poAsinItemsCount: poAsinItems.length,
      productImagesCount: productImages.length,
      samplePOAsin: poAsinItems[0]?.asin,
      sampleImage: productImages[0]?.asin
    });
    
    return poAsinItems.map(item => {
      const existingImage = productImages.find(img => img.asin === item.asin);
      if (!existingImage && Math.random() < 0.1) { // Log 10% of missing matches
        console.log('🔍 No image match for PO ASIN:', item.asin);
      }
      return {
        ...item,
        hasImage: !!existingImage,
        imageUrl: existingImage?.image_url
      };
    });
  }, [poAsinItems, productImages]);

  // Get missing ASINs (those without images)
  const missingAsinItems = useMemo(() => {
    return poAsinItemsWithImages.filter(item => !item.hasImage);
  }, [poAsinItemsWithImages]);

  // Get covered ASINs (those with images)
  const coveredAsinItems = useMemo(() => {
    return poAsinItemsWithImages.filter(item => item.hasImage);
  }, [poAsinItemsWithImages]);

  // Bulk upload images for missing ASINs
  const bulkUploadImages = useCallback(async (asinImagePairs: Array<{ asin: string; imageUrl: string }>) => {
    if (asinImagePairs.length === 0) return;

    setIsProcessing(true);
    setUploadProgress({
      current: 0,
      total: asinImagePairs.length,
      processing: true
    });

    let successful = 0;
    let failed = 0;

    try {
      for (let i = 0; i < asinImagePairs.length; i++) {
        const { asin, imageUrl } = asinImagePairs[i];
        
        setUploadProgress(prev => ({
          ...prev,
          current: i + 1,
          currentAsin: asin
        }));

        try {
          // Validate URL
          new URL(imageUrl);
          
          const poItem = poAsinItemsWithImages.find(item => item.asin === asin);
          
          await addProductImage.mutateAsync({
            asin,
            imageUrl,
            imageName: poItem?.title || `Image for ${asin}`
          });
          
          successful++;
        } catch (error) {
          console.error(`Failed to upload image for ASIN ${asin}:`, error);
          failed++;
        }

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "Bulk Upload Complete",
        description: `Successfully uploaded ${successful} images${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: successful > 0 ? "default" : "destructive"
      });

    } catch (error) {
      toast({
        title: "Bulk Upload Error",
        description: "Failed to process bulk upload",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress({
        current: 0,
        total: 0,
        processing: false
      });
      refetch();
    }
  }, [poAsinItemsWithImages, addProductImage, toast, refetch]);

  // Export missing ASINs to CSV
  const exportMissingAsins = useCallback(() => {
    if (missingAsinItems.length === 0) {
      toast({
        title: "No Data",
        description: "No missing ASINs to export",
        variant: "destructive"
      });
      return;
    }

    const headers = ['ASIN', 'Title', 'PO Number', 'Quantity', 'Status', 'Image URL'];
    const csvContent = [
      headers.join(','),
      ...missingAsinItems.map(item => [
        item.asin,
        `"${item.title.replace(/"/g, '""')}"`,
        item.po_number,
        item.quantity,
        item.status,
        '' // Empty image URL column for user to fill
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `missing-asin-images-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${missingAsinItems.length} missing ASINs to CSV`
    });
  }, [missingAsinItems, toast]);

  return {
    poAsinItems: poAsinItemsWithImages,
    missingAsinItems,
    coveredAsinItems,
    isLoading,
    uploadProgress,
    isProcessing,
    bulkUploadImages,
    exportMissingAsins,
    refetch
  };
};