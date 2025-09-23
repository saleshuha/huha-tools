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

  // Fetch all product images for the user with proper authentication
  const { data: productImages, isLoading, error, refetch } = useQuery({
    queryKey: ['product-images'],
    queryFn: async () => {
      console.log('🖼️ Fetching product images with user authentication...');
      
      // Get current user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('🖼️ Authentication error:', authError);
        throw new Error('Authentication failed');
      }
      
      if (!user) {
        console.error('🖼️ No authenticated user found');
        throw new Error('User not authenticated');
      }
      
      // Query with explicit user_id filter
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('🖼️ Error fetching product images:', error);
        throw error;
      }
      
      console.log('🖼️ Product images fetched for user:', data?.length || 0);
      return data as ProductImage[];
    },
    staleTime: 0, // Force fresh fetch every time
    gcTime: 0, // Don't cache the data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: true, // Query enabled by default, authentication check is inside queryFn
  });

  // Get image by ASIN - strict exact matching only
  const getImageByAsin = (asin: string): ProductImage | undefined => {
    if (!productImages || productImages.length === 0 || !asin) {
      console.log('🔍 getImageByAsin: No images or ASIN', { 
        hasImages: !!productImages, 
        imageCount: productImages?.length || 0, 
        asin 
      });
      return undefined;
    }
    
    // Only exact match to ensure correct product images
    const foundImage = productImages.find(img => img.asin?.trim() === asin.trim());
    
    // Enhanced debug logging for troubleshooting
    if (!foundImage) {
      console.log('🔍 getImageByAsin: No match found', {
        searchAsin: asin,
        availableAsins: productImages.slice(0, 5).map(img => img.asin), // Show first 5 ASINs
        totalImages: productImages.length
      });
    } else {
      console.log('🔍 getImageByAsin: Match found', {
        searchAsin: asin,
        foundAsin: foundImage.asin,
        imageUrl: foundImage.image_url
      });
    }
    
    return foundImage;
  };

  // Add new product image with duplicate checking
  const addProductImage = useMutation({
    mutationFn: async ({ asin, imageUrl, imageName }: { asin: string; imageUrl: string; imageName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First check if image already exists for this user and ASIN
      const { data: existingImage } = await supabase
        .from('product_images')
        .select('*')
        .eq('user_id', user.id)
        .eq('asin', asin.trim())
        .maybeSingle();

      if (existingImage) {
        // Image already exists, return existing data with a flag
        console.log(`🖼️ Image already exists for ASIN ${asin}, skipping insertion`);
        return { ...existingImage, wasExisting: true };
      }

      // Insert new image since it doesn't exist
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
      
      if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === '23505' && error.message.includes('unique_user_asin')) {
          console.log(`🖼️ Duplicate detected during insert for ASIN ${asin}, fetching existing image`);
          // Fetch the existing image that caused the conflict
          const { data: conflictImage } = await supabase
            .from('product_images')
            .select('*')
            .eq('user_id', user.id)
            .eq('asin', asin.trim())
            .single();
          return { ...conflictImage, wasExisting: true };
        }
        throw error;
      }
      return { ...data, wasExisting: false };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      // Show appropriate toast based on whether image was new or existing
      if (data.wasExisting) {
        toast({
          title: "Image already exists",
          description: `Image for ${variables.asin} was already in the database`,
          variant: "default"
        });
      } else {
        toast({
          title: "Image added successfully",
          description: `Product image saved for ${variables.asin}`,
        });
      }
    },
    onError: (error: any, variables) => {
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

  // Delete ALL product images for the current user
  const deleteAllProductImages = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error, count } = await supabase
        .from('product_images')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      toast({
        title: "All images deleted",
        description: `Successfully removed ${count || 'all'} product images from the database.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete images",
        description: error.message || "An error occurred while deleting all images.",
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
    deleteAllProductImages,
    refreshImages
  };
};