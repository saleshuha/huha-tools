import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductImage {
  id: string;
  item_no: string;
  image_url: string;
  image_order: number;
  image_type: string;
  storage_path: string | null;
  download_status: 'pending' | 'downloading' | 'completed' | 'failed';
  download_error: string | null;
  created_at: string;
}

export interface DownloadOptions {
  size?: number;
  watermark?: string;
  apiId?: string;
}

export interface UseSunskyImages {
  downloadImages: (itemNos: string[], options?: DownloadOptions) => Promise<void>;
  downloadSingleImage: (itemNo: string, options?: DownloadOptions) => Promise<void>;
  getProductImages: (itemNo: string) => Promise<ProductImage[]>;
  deleteImages: (itemNo: string) => Promise<void>;
  isDownloading: boolean;
  downloadProgress: Map<string, number>;
  downloadErrors: Map<string, string>;
}

export const useSunskyImages = (): UseSunskyImages => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());

  const downloadImages = useCallback(async (itemNos: string[], options?: DownloadOptions) => {
    if (itemNos.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to download images.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    const newProgress = new Map<string, number>();
    const newErrors = new Map<string, string>();

    try {
      // Mark all items as pending
      itemNos.forEach(itemNo => {
        newProgress.set(itemNo, 0);
      });
      setDownloadProgress(new Map(newProgress));

      // Call edge function
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'download_images',
          itemNos,
          size: options?.size || 800,
          watermark: options?.watermark,
          apiId: options?.apiId
        }
      });

      if (error) throw error;

      if (data.result === 'error') {
        throw new Error(data.message || 'Failed to download images');
      }

      // Update progress based on results
      data.data.results.forEach((result: any) => {
        if (result.status === 'success') {
          newProgress.set(result.itemNo, 100);
        } else {
          newProgress.set(result.itemNo, 0);
          newErrors.set(result.itemNo, result.error);
        }
      });

      setDownloadProgress(new Map(newProgress));
      setDownloadErrors(new Map(newErrors));

      toast({
        title: "Download Complete",
        description: `Successfully downloaded images for ${data.data.success} out of ${data.data.total} items.`,
      });

    } catch (error: any) {
      console.error('Error downloading images:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download images",
        variant: "destructive",
      });

      // Mark all as errors
      itemNos.forEach(itemNo => {
        newErrors.set(itemNo, error.message || 'Unknown error');
      });
      setDownloadErrors(new Map(newErrors));
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  const downloadSingleImage = useCallback(async (itemNo: string, options?: DownloadOptions) => {
    await downloadImages([itemNo], options);
  }, [downloadImages]);

  const getProductImages = useCallback(async (itemNo: string): Promise<ProductImage[]> => {
    try {
      const { data, error } = await supabase
        .from('sunsky_product_images')
        .select('*')
        .eq('item_no', itemNo)
        .order('image_order', { ascending: true });

      if (error) throw error;

      return (data || []) as ProductImage[];
    } catch (error: any) {
      console.error('Error fetching product images:', error);
      toast({
        title: "Failed to fetch images",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const deleteImages = useCallback(async (itemNo: string) => {
    try {
      // Get all images for this item
      const { data: images, error: fetchError } = await supabase
        .from('sunsky_product_images')
        .select('storage_path')
        .eq('item_no', itemNo);

      if (fetchError) throw fetchError;

      // Delete from storage
      if (images && images.length > 0) {
        const paths = images
          .map(img => img.storage_path)
          .filter(path => path !== null) as string[];
        
        if (paths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('sunsky-images')
            .remove(paths);

          if (storageError) {
            console.error('Storage deletion error:', storageError);
          }
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('sunsky_product_images')
        .delete()
        .eq('item_no', itemNo);

      if (deleteError) throw deleteError;

      // Update SKU
      await supabase
        .from('sunsky_skus')
        .update({
          images_downloaded: false,
          images_download_date: null,
          thumbnail_url: null,
          image_count: 0
        })
        .eq('sku_code', itemNo);

      toast({
        title: "Images Deleted",
        description: `Successfully deleted images for ${itemNo}`,
      });

    } catch (error: any) {
      console.error('Error deleting images:', error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    downloadImages,
    downloadSingleImage,
    getProductImages,
    deleteImages,
    isDownloading,
    downloadProgress,
    downloadErrors,
  };
};
