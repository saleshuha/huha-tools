import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductBarcode {
  id: string;
  barcode: string;
  barcode_type: string | null;
  asin: string | null;
  sku_code: string | null;
  model_number: string | null;
  title: string | null;
  po_order_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface LinkBarcodeParams {
  barcode: string;
  barcodeType?: string;
  asin?: string;
  skuCode?: string;
  modelNumber?: string;
  title?: string;
  poOrderId?: string;
  userId?: string; // Optional: for token-based access where user is not authenticated
}

export function useProductBarcodes() {
  const [loading, setLoading] = useState(false);
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Subscribe to real-time changes for product_barcodes
  useEffect(() => {
    if (isSubscribed) return;
    
    const channel = supabase
      .channel('product_barcodes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_barcodes',
        },
        (payload) => {
          console.log('📦 Barcode real-time update:', payload.eventType);
          
          if (payload.eventType === 'DELETE') {
            // Remove deleted barcode from state
            setBarcodes(prev => prev.filter(b => b.id !== (payload.old as any).id));
          } else if (payload.eventType === 'INSERT') {
            // Add new barcode to state
            setBarcodes(prev => [payload.new as ProductBarcode, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing barcode
            setBarcodes(prev => prev.map(b => 
              b.id === (payload.new as ProductBarcode).id ? (payload.new as ProductBarcode) : b
            ));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📦 Subscribed to product_barcodes real-time updates');
          setIsSubscribed(true);
        }
      });

    return () => {
      console.log('📦 Unsubscribing from product_barcodes real-time updates');
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [isSubscribed]);

  // Fetch barcodes for a specific product (by ASIN, SKU, or PO order ID)
  const fetchBarcodesForProduct = useCallback(async (params: {
    asin?: string;
    skuCode?: string;
    poOrderId?: string;
  }) => {
    try {
      let query = supabase
        .from('product_barcodes')
        .select('*');

      if (params.poOrderId) {
        query = query.eq('po_order_id', params.poOrderId);
      } else if (params.asin) {
        query = query.eq('asin', params.asin);
      } else if (params.skuCode) {
        query = query.eq('sku_code', params.skuCode);
      } else {
        return [];
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductBarcode[];
    } catch (error) {
      console.error('Error fetching barcodes:', error);
      return [];
    }
  }, []);

  // Search for a product by barcode
  const searchByBarcode = useCallback(async (barcode: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_barcodes')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) throw error;
      return data as ProductBarcode | null;
    } catch (error) {
      console.error('Error searching by barcode:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Link a barcode to a product
  const linkBarcode = useCallback(async (params: LinkBarcodeParams) => {
    try {
      setLoading(true);
      
      // Use provided userId (from token) or get from auth session
      let userId = params.userId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      
      if (!userId) {
        toast.error('Unable to link barcode - user not identified');
        return null;
      }

      const { data, error } = await supabase
        .from('product_barcodes')
        .upsert({
          barcode: params.barcode,
          barcode_type: params.barcodeType || null,
          asin: params.asin || null,
          sku_code: params.skuCode || null,
          model_number: params.modelNumber || null,
          title: params.title || null,
          po_order_id: params.poOrderId || null,
          user_id: userId,
        }, {
          onConflict: 'barcode,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Barcode linked successfully');
      return data as ProductBarcode;
    } catch (error: any) {
      console.error('Error linking barcode:', error);
      toast.error(error.message || 'Failed to link barcode');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unlink a barcode
  const unlinkBarcode = useCallback(async (barcodeId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('product_barcodes')
        .delete()
        .eq('id', barcodeId);

      if (error) throw error;
      
      toast.success('Barcode unlinked');
      return true;
    } catch (error: any) {
      console.error('Error unlinking barcode:', error);
      toast.error(error.message || 'Failed to unlink barcode');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all barcodes for user
  const fetchAllBarcodes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_barcodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBarcodes(data as ProductBarcode[]);
      return data as ProductBarcode[];
    } catch (error) {
      console.error('Error fetching all barcodes:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    barcodes,
    fetchBarcodesForProduct,
    searchByBarcode,
    linkBarcode,
    unlinkBarcode,
    fetchAllBarcodes,
  };
}
