import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NoonStore {
  id: string;
  user_id: string;
  name: string;
  partner_id: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NoonStoresState {
  stores: NoonStore[];
  loading: boolean;
  error: string | null;
}

export function useNoonStores() {
  const [state, setState] = useState<NoonStoresState>({
    stores: [],
    loading: false,
    error: null,
  });
  
  const { toast } = useToast();

  const fetchStores = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase
        .from('noon_stores_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        stores: data || [],
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching noon stores:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch stores',
        loading: false,
      }));
    }
  };

  const addStore = async (storeData: { name: string; partner_id: string; country: string }) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('noon_stores_config')
        .insert([{
          ...storeData,
          user_id: user.id,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        stores: [data, ...prev.stores],
      }));

      toast({
        title: "Success",
        description: `Store "${storeData.name}" added successfully`,
      });

      return data;
    } catch (error) {
      console.error('Error adding store:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add store';
      
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const updateStore = async (storeId: string, updates: Partial<NoonStore>) => {
    try {
      const { error } = await supabase
        .from('noon_stores_config')
        .update(updates)
        .eq('id', storeId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        stores: prev.stores.map(store =>
          store.id === storeId ? { ...store, ...updates } : store
        ),
      }));

      toast({
        title: "Success",
        description: "Store updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating store:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update store',
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('noon_stores_config')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        stores: prev.stores.filter(store => store.id !== storeId),
      }));

      toast({
        title: "Success",
        description: "Store deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting store:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete store',
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  return {
    stores: state.stores,
    loading: state.loading,
    error: state.error,
    addStore,
    updateStore,
    deleteStore,
    refreshStores: fetchStores,
  };
}