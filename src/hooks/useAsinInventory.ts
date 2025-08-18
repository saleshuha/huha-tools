import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';

export interface AsinInventoryItem {
  id: string;
  asin: string;
  serialNumber: string;
  sku?: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged' | 'ordered';
  dateAdded: string;
  dateSold?: string;
  notes?: string;
  quantity: number;
  restockDate?: string;
  restockQuantity?: number;
  lastRestockDate?: string;
}

export function useAsinInventory() {
  const [inventory, setInventory] = useState<AsinInventoryItem[]>([]);
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
        .from('asin_inventory')
        .select('*')
        .eq('country', selectedCountry)
        .order('date_added', { ascending: false });

      if (error) throw error;

      const formattedData: AsinInventoryItem[] = data.map(item => ({
        id: item.id,
        asin: item.asin,
        serialNumber: item.serial_number,
        sku: item.sku || undefined,
        status: item.status,
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        notes: item.notes || undefined,
        quantity: item.quantity ?? 1,
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
  const addItem = async (item: Omit<AsinInventoryItem, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedCountry) throw new Error('User not authenticated or no country');

      // Check for duplicate serial numbers across all ASINs
      const { data: existingItems, error: checkError } = await supabase
        .from('asin_inventory')
        .select('serial_number, asin')
        .eq('user_id', user.id)
        .eq('serial_number', item.serialNumber);

      if (checkError) throw checkError;

      if (existingItems && existingItems.length > 0) {
        const existingAsin = existingItems[0].asin;
        throw new Error(`Serial number "${item.serialNumber}" is already used by ASIN "${existingAsin}". Each serial number must be unique across all ASINs.`);
      }

      const { data, error } = await supabase
        .from('asin_inventory')
        .insert({
          user_id: user.id,
          asin: item.asin,
          serial_number: item.serialNumber,
          sku: item.sku || null,
          status: item.status,
          date_added: item.dateAdded,
          date_sold: item.dateSold || null,
          notes: item.notes || null,
          quantity: item.quantity || 1,
          restock_date: item.restockDate || null,
          restock_quantity: item.restockQuantity || null,
          last_restock_date: item.lastRestockDate || null,
          country: selectedCountry,
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: AsinInventoryItem = {
        id: data.id,
        asin: data.asin,
        serialNumber: data.serial_number,
        sku: data.sku,
        status: data.status,
        dateAdded: data.date_added,
        dateSold: data.date_sold || undefined,
        notes: data.notes || undefined,
        quantity: data.quantity ?? 1,
        restockDate: data.restock_date || undefined,
        restockQuantity: data.restock_quantity || undefined,
        lastRestockDate: data.last_restock_date || undefined,
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
      if (!user || !selectedCountry) throw new Error('User not authenticated or no country');

      const insertData = items.map(item => ({
        user_id: user.id,
        asin: item.asin,
        serial_number: item.serialNumber,
        sku: item.sku || null,
        status: item.status,
        date_added: item.dateAdded,
        date_sold: item.dateSold || null,
        notes: item.notes || null,
        quantity: item.quantity ?? 1,
        restock_date: item.restockDate || null,
        restock_quantity: item.restockQuantity || null,
        last_restock_date: item.lastRestockDate || null,
        country: selectedCountry,
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
        sku: item.sku || undefined,
        status: item.status,
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        notes: item.notes || undefined,
        quantity: item.quantity ?? 1,
        restockDate: item.restock_date || undefined,
        restockQuantity: item.restock_quantity || undefined,
        lastRestockDate: item.last_restock_date || undefined,
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
    if (selectedCountry) {
      loadInventory();
    }
  }, [selectedCountry]);

  // Restock item
  const restockItem = async (id: string, quantity: number) => {
    try {
      const item = inventory.find(item => item.id === id);
      const updateData: any = { 
        quantity,
        last_restock_date: new Date().toISOString(),
        restock_quantity: quantity
      };

      // If item was marked as ordered, change status back to in-stock
      if (item?.status === 'ordered') {
        updateData.status = 'in-stock';
      }

      const { error } = await supabase
        .from('asin_inventory')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id 
          ? { 
              ...item, 
              quantity,
              lastRestockDate: new Date().toISOString(),
              restockQuantity: quantity,
              ...(item.status === 'ordered' && { status: 'in-stock' as const })
            }
          : item
      ));

      toast({
        title: "Item restocked",
        description: `Item quantity updated to ${quantity}${item?.status === 'ordered' ? ' and status updated to in-stock' : ''}`,
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

      // Update the inventory quantity (triggers will handle status automatically)
      const { error: updateError } = await supabase
        .from('asin_inventory')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (updateError) throw updateError;

      // Record the stock change
      const { data: { user } } = await supabase.auth.getUser();
      const { error: changeError } = await supabase
        .from('stock_changes')
        .insert({
          user_id: user?.id,
          inventory_type: 'asin',
          inventory_id: id,
          asin: item.asin,
          serial_number: item.serialNumber,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          change_amount: changeAmount,
          change_reason: reason || (changeAmount > 0 ? 'Stock increase' : 'Stock decrease')
        });

      if (changeError) throw changeError;

      // Refresh inventory to get updated status from triggers
      await loadInventory();

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

  const updateBin = async (id: string, binLocation: string) => {
    try {
      const { error } = await supabase
        .from('asin_inventory')
        .update({ notes: binLocation })
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id ? { ...item, notes: binLocation } : item
      ));

      toast({
        title: "Bin location updated",
        description: "Bin location has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error updating bin location",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update SKU for an item
  const updateSku = async (id: string, newSku: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('asin_inventory')
        .update({ sku: newSku.trim() || null })
        .eq('id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id ? { ...item, sku: newSku.trim() || undefined } : item
      ));

      toast({
        title: "SKU Updated",
        description: `SKU has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating SKU:', error);
      toast({
        title: "Error",
        description: "Failed to update SKU",
        variant: "destructive",
      });
    }
  };

  // Bulk update SKUs for multiple items by ASIN
  const bulkUpdateSkus = async (asinSkuPairs: { asin: string; sku: string }[]) => {
    if (!profile) return;

    try {
      const updates = [];
      
      for (const pair of asinSkuPairs) {
        const { error } = await supabase
          .from('asin_inventory')
          .update({ sku: pair.sku.trim() || null })
          .eq('asin', pair.asin)
          .eq('user_id', profile.id);

        if (error) throw error;
        updates.push(pair);
      }

      // Update local state
      setInventory(prev => prev.map(item => {
        const update = asinSkuPairs.find(pair => pair.asin === item.asin);
        return update ? { ...item, sku: update.sku.trim() || undefined } : item;
      }));

      toast({
        title: "SKUs Updated",
        description: `Successfully updated ${updates.length} inventory items`,
      });
    } catch (error) {
      console.error('Error bulk updating SKUs:', error);
      toast({
        title: "Error",
        description: "Failed to update SKUs",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    inventory,
    loading,
    addItem,
    updateItemStatus,
    deleteItem,
    bulkAdd,
    restockItem,
    updateQuantity,
    updateBin,
    updateSku,
    bulkUpdateSkus,
    refetch: loadInventory,
  };
}