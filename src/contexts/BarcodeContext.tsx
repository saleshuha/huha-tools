import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  userId?: string;
}

interface BarcodeContextType {
  loading: boolean;
  barcodes: ProductBarcode[];
  fetchBarcodesForProduct: (params: { asin?: string; skuCode?: string; poOrderId?: string }) => Promise<ProductBarcode[]>;
  searchByBarcode: (barcode: string) => Promise<ProductBarcode | null>;
  linkBarcode: (params: LinkBarcodeParams) => Promise<ProductBarcode | null>;
  unlinkBarcode: (barcodeId: string) => Promise<boolean>;
  fetchAllBarcodes: () => Promise<ProductBarcode[]>;
}

const BarcodeContext = createContext<BarcodeContextType | null>(null);

export function useBarcodeContext() {
  const context = useContext(BarcodeContext);
  if (!context) {
    throw new Error('useBarcodeContext must be used within a BarcodeProvider');
  }
  return context;
}

// Optional hook that returns null if not in provider (for components that may or may not be in provider)
export function useBarcodeContextOptional() {
  return useContext(BarcodeContext);
}

interface BarcodeProviderProps {
  children: ReactNode;
}

export function BarcodeProvider({ children }: BarcodeProviderProps) {
  const [loading, setLoading] = useState(false);
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Subscribe to real-time changes for product_barcodes - SINGLE global subscription
  useEffect(() => {
    const channel = supabase
      .channel('global_product_barcodes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_barcodes',
        },
        (payload) => {
          console.log('📦 [BarcodeContext] Real-time update:', payload.eventType, payload);
          
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            console.log('📦 [BarcodeContext] Removing barcode:', deletedId);
            setBarcodes(prev => prev.filter(b => b.id !== deletedId));
          } else if (payload.eventType === 'INSERT') {
            const newBarcode = payload.new as ProductBarcode;
            console.log('📦 [BarcodeContext] Adding barcode:', newBarcode.id, newBarcode.barcode);
            setBarcodes(prev => {
              // Avoid duplicates
              if (prev.some(b => b.id === newBarcode.id)) return prev;
              return [newBarcode, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedBarcode = payload.new as ProductBarcode;
            console.log('📦 [BarcodeContext] Updating barcode:', updatedBarcode.id);
            setBarcodes(prev => prev.map(b => 
              b.id === updatedBarcode.id ? updatedBarcode : b
            ));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📦 [BarcodeContext] Subscribed to global real-time updates');
        }
      });

    return () => {
      console.log('📦 [BarcodeContext] Unsubscribing from global real-time updates');
      supabase.removeChannel(channel);
    };
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
      setIsInitialized(true);
      return data as ProductBarcode[];
    } catch (error) {
      console.error('Error fetching all barcodes:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch barcodes for a specific product
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

  return (
    <BarcodeContext.Provider value={{
      loading,
      barcodes,
      fetchBarcodesForProduct,
      searchByBarcode,
      linkBarcode,
      unlinkBarcode,
      fetchAllBarcodes,
    }}>
      {children}
    </BarcodeContext.Provider>
  );
}
