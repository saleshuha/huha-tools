import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SkuInventoryItem {
  id: string;
  skuNumber: string;
  binSerialNumber: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged';
  dateAdded: string;
}

export function useSkuInventory() {
  const [inventory, setInventory] = useState<SkuInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load inventory from Supabase
  const loadInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sku_inventory')
        .select('*')
        .order('date_added', { ascending: false });

      if (error) throw error;

      const formattedData: SkuInventoryItem[] = data.map(item => ({
        id: item.id,
        skuNumber: item.sku_number,
        binSerialNumber: item.bin_serial_number,
        status: item.status,
        dateAdded: item.date_added,
      }));

      setInventory(formattedData);
    } catch (error: any) {
      toast({
        title: "Error loading inventory",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new item
  const addItem = async (item: Omit<SkuInventoryItem, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sku_inventory')
        .insert({
          user_id: user.id,
          sku_number: item.skuNumber,
          bin_serial_number: item.binSerialNumber,
          status: item.status,
          date_added: item.dateAdded,
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: SkuInventoryItem = {
        id: data.id,
        skuNumber: data.sku_number,
        binSerialNumber: data.bin_serial_number,
        status: data.status,
        dateAdded: data.date_added,
      };

      setInventory(prev => [newItem, ...prev]);
      toast({
        title: "Item added successfully",
        description: `SKU ${item.skuNumber} has been added to inventory.`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update item status
  const updateItemStatus = async (id: string, status: SkuInventoryItem['status']) => {
    try {
      const { error } = await supabase
        .from('sku_inventory')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id ? { ...item, status } : item
      ));
    } catch (error: any) {
      toast({
        title: "Error updating item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sku_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Item deleted",
        description: "Item has been removed from inventory.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  return {
    inventory,
    loading,
    addItem,
    updateItemStatus,
    deleteItem,
    refetch: loadInventory,
  };
}