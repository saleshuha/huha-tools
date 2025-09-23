import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductImage {
  id: string;
  user_id: string;
  asin: string;
  image_url: string;
  image_name?: string;
  created_at: string;
  updated_at: string;
}

export const useProductImages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all product images for the user (unlimited for now to solve the issue)
  const { data: productImages, isLoading, error, refetch } = useQuery({
    queryKey: ['product-images'],
    queryFn: async () => {
      console.log('🖼️ Fetching product images... (forcing fresh fetch)');
      // Force a completely fresh fetch by adding a timestamp
      const timestamp = Date.now();
      console.log('🖼️ Fresh fetch timestamp:', timestamp);
      
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .order('created_at', { ascending: false });
        // Removed limit completely to ensure we get all images
      
      console.log('🖼️ Raw fetched images count:', data?.length || 0);
      if (data) {
        const testAsin = data.find(img => img.asin === 'B0FPBNTD3P');
        console.log('🖼️ Test ASIN B0FPBNTD3P found in fetch:', !!testAsin, testAsin);
      }
      
      if (error) {
        console.error('🖼️ Error fetching product images:', error);
        throw error;
      }
      console.log('🖼️ Product images fetched:', data?.length);
      return data as ProductImage[];
    },
    staleTime: 0, // Force fresh fetch every time
    gcTime: 0, // Don't cache the data (renamed from cacheTime)
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Get image by ASIN with comprehensive debugging
  const getImageByAsin = (asin: string): ProductImage | undefined => {
    if (!productImages || productImages.length === 0) {
      return undefined;
    }
    
    const foundImage = productImages.find(img => img.asin === asin);
    
    // Enhanced debug for specific ASIN to identify the root cause
    if (asin === 'B0FPBNTD3P') {
      console.log('🖼️ COMPREHENSIVE DEBUG for B0FPBNTD3P:', {
        searchingFor: asin,
        searchingForType: typeof asin,
        searchingForLength: asin.length,
        foundImage: !!foundImage,
        totalImages: productImages.length,
        
        // Check if ANY image contains this string
        containsMatch: productImages.find(img => img.asin?.includes('B0FPBNTD3P')),
        
        // Sample of actual ASINs in the data
        sampleAsins: productImages.slice(0, 5).map(img => ({
          asin: img.asin,
          type: typeof img.asin,
          length: img.asin?.length
        })),
        
        // Look specifically for B0FPBNTD3P variations
        exactMatches: productImages.filter(img => 
          img.asin === 'B0FPBNTD3P' || 
          img.asin?.includes('B0FPBNTD3P') ||
          img.asin?.toLowerCase() === 'b0fpbntd3p'
        ),
        
        // Check entire dataset for this ASIN
        allMatches: productImages.filter(img => img.asin?.includes('FPBNTD3P'))
      });
    }
    
    return foundImage;
  };

  // Add new product image
  const addProductImage = useMutation({
    mutationFn: async ({ asin, imageUrl, imageName }: { asin: string; imageUrl: string; imageName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('product_images')
        .insert({
          user_id: user.id,
          asin: asin.trim(),
          image_url: imageUrl.trim(),
          image_name: imageName?.trim()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      toast({
        title: "Image added successfully",
        description: "Product image has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add image",
        description: error.message || "An error occurred while adding the image.",
        variant: "destructive"
      });
    }
  });

  // Update product image
  const updateProductImage = useMutation({
    mutationFn: async ({ id, asin, imageUrl, imageName }: { id: string; asin: string; imageUrl: string; imageName?: string }) => {
      const { data, error } = await supabase
        .from('product_images')
        .update({
          asin: asin.trim(),
          image_url: imageUrl.trim(),
          image_name: imageName?.trim()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      toast({
        title: "Image updated successfully",
        description: "Product image has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update image",
        description: error.message || "An error occurred while updating the image.",
        variant: "destructive"
      });
    }
  });

  // Delete product image
  const deleteProductImage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      toast({
        title: "Image deleted successfully",
        description: "Product image has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete image",
        description: error.message || "An error occurred while deleting the image.",
        variant: "destructive"
      });
    }
  });

  // Manual refresh function to force cache invalidation
  const refreshImages = async () => {
    console.log('🖼️ Manually refreshing product images...');
    // Clear all related caches
    await queryClient.resetQueries({ queryKey: ['product-images'] });
    await queryClient.invalidateQueries({ queryKey: ['product-images'] });
    // Force immediate refetch
    await refetch();
    console.log('🖼️ Manual refresh completed');
  };

  return {
    productImages: productImages || [],
    isLoading,
    error,
    getImageByAsin,
    addProductImage,
    updateProductImage,
    deleteProductImage,
    refreshImages
  };
};