import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location?: string;
  is_active: boolean;
  is_default: boolean;
}

export function useWarehouseManager() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load warehouses from database
  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active' as any, true as any)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setWarehouses((data || []) as any);
      
      // Set default warehouse as selected
      const defaultWarehouse = (data as any)?.find((w: any) => w.is_default) || (data as any)?.[0];
      if (defaultWarehouse) {
        setSelectedWarehouse(defaultWarehouse);
      }
    } catch (error: any) {
      console.error('Error loading warehouses:', error);
      toast({
        title: "Error loading warehouses",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new warehouse
  const addWarehouse = async (warehouse: Omit<Warehouse, 'id' | 'is_active'>) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('warehouses')
        .insert({
          user_id: user.id,
          code: warehouse.code,
          name: warehouse.name,
          location: warehouse.location,
          is_default: warehouse.is_default
        } as any)
        .select()
        .single();

      if (error) throw error;

      // If this is set as default, unset other defaults
      if (warehouse.is_default) {
        await supabase
          .from('warehouses')
          .update({ is_default: false } as any)
          .neq('id' as any, (data as any).id as any);
      }

      await loadWarehouses();
      
      toast({
        title: "Warehouse Added",
        description: `${warehouse.name} has been added successfully`
      });

      return data;
    } catch (error: any) {
      console.error('Error adding warehouse:', error);
      toast({
        title: "Error adding warehouse",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update warehouse
  const updateWarehouse = async (id: string, updates: Partial<Omit<Warehouse, 'id'>>) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .update(updates as any)
        .eq('id' as any, id as any);

      if (error) throw error;

      // If this is set as default, unset other defaults
      if (updates.is_default) {
        await supabase
          .from('warehouses')
          .update({ is_default: false } as any)
          .neq('id' as any, id as any);
      }

      await loadWarehouses();
      
      toast({
        title: "Warehouse Updated",
        description: "Warehouse has been updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      toast({
        title: "Error updating warehouse",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Delete warehouse
  const deleteWarehouse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .update({ is_active: false } as any)
        .eq('id' as any, id as any);

      if (error) throw error;

      await loadWarehouses();
      
      toast({
        title: "Warehouse Deleted",
        description: "Warehouse has been removed"
      });
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      toast({
        title: "Error deleting warehouse",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  return {
    warehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    loading,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    refreshWarehouses: loadWarehouses
  };
}