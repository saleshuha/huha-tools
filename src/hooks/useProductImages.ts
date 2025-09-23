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

  // Fetch all product images for the user (limited to 1000 for performance)
  const { data: productImages, isLoading, error } = useQuery({
    queryKey: ['product-images'],
    queryFn: async () => {
      console.log('🖼️ Fetching product images...');
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000); // Increased limit to get more images
      
      if (error) {
        console.error('🖼️ Error fetching product images:', error);
        throw error;
      }
      console.log('🖼️ Product images fetched:', data?.length);
      return data as ProductImage[];
    }
  });

  // Get image by ASIN
  const getImageByAsin = (asin: string): ProductImage | undefined => {
    return productImages?.find(img => img.asin === asin);
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

  return {
    productImages: productImages || [],
    isLoading,
    error,
    getImageByAsin,
    addProductImage,
    updateProductImage,
    deleteProductImage
  };
};