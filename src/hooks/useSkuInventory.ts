import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';

export interface SkuInventoryItem {
  id: string;
  skuNumber: string;
  binSerialNumber: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged';
  dateAdded: string;
  dateSold?: string;
  quantity: number;
  restockDate?: string;
  restockQuantity?: number;
  lastRestockDate?: string;
}

export function useSkuInventory() {
  const [inventory, setInventory] = useState<SkuInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();

  // Load inventory from Supabase
  const loadInventory = async () => {
    if (!selectedCountry) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sku_inventory')
        .select('*')
        .eq('country', selectedCountry)
        .order('date_added', { ascending: false });

      if (error) throw error;

      const formattedData: SkuInventoryItem[] = data.map(item => ({
        id: item.id,
        skuNumber: item.sku_number,
        binSerialNumber: item.bin_serial_number,
        status: item.status,
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        quantity: item.quantity || 1,
        restockDate: item.restock_date || undefined,
        restockQuantity: item.restock_quantity || undefined,
        lastRestockDate: item.last_restock_date || undefined,
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
          date_sold: item.dateSold || null,
          quantity: item.quantity || 1,
          restock_date: item.restockDate || null,
          restock_quantity: item.restockQuantity || null,
          last_restock_date: item.lastRestockDate || null,
          country: selectedCountry,
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
        dateSold: data.date_sold || undefined,
        quantity: data.quantity || 1,
        restockDate: data.restock_date || undefined,
        restockQuantity: data.restock_quantity || undefined,
        lastRestockDate: data.last_restock_date || undefined,
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
      const updateData: any = { status };
      if (status === 'sold') {
        updateData.date_sold = new Date().toISOString();
      }

      const { error } = await supabase
        .from('sku_inventory')
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
    if (selectedCountry) {
      loadInventory();
    }
  }, [selectedCountry]);

  // Restock item
  const restockItem = async (id: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('sku_inventory')
        .update({ 
          quantity,
          last_restock_date: new Date().toISOString(),
          restock_quantity: quantity
        })
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id 
          ? { 
              ...item, 
              quantity,
              lastRestockDate: new Date().toISOString(),
              restockQuantity: quantity
            }
          : item
      ));

      toast({
        title: "Item restocked",
        description: `Item quantity updated to ${quantity}`,
      });
    } catch (error: any) {
      toast({
        title: "Error restocking item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (id: string, newQuantity: number, reason?: string) => {
    try {
      const item = inventory.find(item => item.id === id);
      if (!item) {
        toast({
          title: "Item not found",
          variant: "destructive"
        });
        return;
      }

      const previousQuantity = item.quantity;
      const changeAmount = newQuantity - previousQuantity;

      // Update the inventory quantity and status if needed
      const updateData: any = { quantity: newQuantity };
      if (newQuantity === 0) {
        updateData.status = 'sold';
        updateData.date_sold = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('sku_inventory')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Record the stock change
      const { data: { user } } = await supabase.auth.getUser();
      const { error: changeError } = await supabase
        .from('stock_changes')
        .insert({
          user_id: user?.id,
          inventory_type: 'sku',
          inventory_id: id,
          sku_number: item.skuNumber,
          serial_number: item.binSerialNumber,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          change_amount: changeAmount,
          change_reason: reason || (changeAmount > 0 ? 'Stock increase' : 'Stock decrease')
        });

      if (changeError) throw changeError;

      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === id 
          ? { 
              ...item, 
              quantity: newQuantity,
              ...(newQuantity === 0 && { 
                status: 'sold' as const, 
                dateSold: new Date().toISOString() 
              })
            } 
          : item
      ));

      toast({
        title: "Quantity updated",
        description: `Updated from ${previousQuantity} to ${newQuantity}`,
      });
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error updating quantity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Bulk add items
  const bulkAdd = async (items: Omit<SkuInventoryItem, 'id'>[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const insertData = items.map(item => ({
        user_id: user.id,
        sku_number: item.skuNumber,
        bin_serial_number: item.binSerialNumber,
        status: item.status,
        date_added: item.dateAdded,
        date_sold: item.dateSold || null,
        quantity: item.quantity || 1,
        restock_date: item.restockDate || null,
        restock_quantity: item.restockQuantity || null,
        last_restock_date: item.lastRestockDate || null,
        country: selectedCountry,
      }));

      const { data, error } = await supabase
        .from('sku_inventory')
        .insert(insertData)
        .select();

      if (error) throw error;

      const newItems: SkuInventoryItem[] = data.map(item => ({
        id: item.id,
        skuNumber: item.sku_number,
        binSerialNumber: item.bin_serial_number,
        status: item.status,
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        quantity: item.quantity || 1,
        restockDate: item.restock_date || undefined,
        restockQuantity: item.restock_quantity || undefined,
        lastRestockDate: item.last_restock_date || undefined,
      }));

      setInventory(prev => [...newItems, ...prev]);
      toast({
        title: "Bulk add successful",
        description: `Added ${items.length} items to inventory.`,
      });
    } catch (error: any) {
      toast({
        title: "Error bulk adding items",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    inventory,
    loading,
    addItem,
    bulkAdd,
    updateItemStatus,
    deleteItem,
    restockItem,
    updateQuantity,
    refetch: loadInventory,
  };
}