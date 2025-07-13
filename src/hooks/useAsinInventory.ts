import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AsinInventoryItem {
  id: string;
  asin: string;
  serialNumber: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged';
  dateAdded: string;
  dateSold?: string;
  notes?: string;
}

export function useAsinInventory() {
  const [inventory, setInventory] = useState<AsinInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load inventory from Supabase
  const loadInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asin_inventory')
        .select('*')
        .order('date_added', { ascending: false });

      if (error) throw error;

      const formattedData: AsinInventoryItem[] = data.map(item => ({
        id: item.id,
        asin: item.asin,
        serialNumber: item.serial_number,
        status: item.status,
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        notes: item.notes || undefined,
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
  const addItem = async (item: Omit<AsinInventoryItem, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('asin_inventory')
        .insert({
          user_id: user.id,
          asin: item.asin,
          serial_number: item.serialNumber,
          status: item.status,
          date_added: item.dateAdded,
          date_sold: item.dateSold || null,
          notes: item.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: AsinInventoryItem = {
        id: data.id,
        asin: data.asin,
        serialNumber: data.serial_number,
        status: data.status,
        dateAdded: data.date_added,
        dateSold: data.date_sold || undefined,
        notes: data.notes || undefined,
      };

      setInventory(prev => [newItem, ...prev]);
      toast({
        title: "Item added successfully",
        description: `ASIN ${item.asin} has been added to inventory.`,
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
  const updateItemStatus = async (id: string, status: AsinInventoryItem['status']) => {
    try {
      const updateData: any = { status };
      if (status === 'sold') {
        updateData.date_sold = new Date().toISOString();
      }

      const { error } = await supabase
        .from('asin_inventory')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id 
          ? { ...item, status, ...(status === 'sold' && { dateSold: new Date().toISOString() }) }
          : item
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
        .from('asin_inventory')
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

  // Bulk add items
  const bulkAdd = async (items: Omit<AsinInventoryItem, 'id'>[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const insertData = items.map(item => ({
        user_id: user.id,
        asin: item.asin,
        serial_number: item.serialNumber,
        status: item.status,
        date_added: item.dateAdded,
        date_sold: item.dateSold || null,
        notes: item.notes || null,
      }));

      const { data, error } = await supabase
        .from('asin_inventory')
        .insert(insertData)
        .select();

      if (error) throw error;

      const newItems: AsinInventoryItem[] = data.map(item => ({
        id: item.id,
        asin: item.asin,
        serialNumber: item.serial_number,
        status: item.status,
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        notes: item.notes || undefined,
      }));

      setInventory(prev => [...newItems, ...prev]);
      toast({
        title: "Items added successfully",
        description: `${items.length} items have been added to inventory.`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding items",
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
    bulkAdd,
    refetch: loadInventory,
  };
}