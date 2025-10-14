import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';

export interface SkuInventoryItem {
  id: string;
  skuNumber: string;
  binSerialNumber: string;
  asin?: string;
  title?: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged' | 'ordered';
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
      const { data, error } = await ((supabase as any)
        .from('sku_inventory')
        .select('*')
        .eq('country', selectedCountry)
        .order('date_added', { ascending: false }));

      if (error) throw error;

      const formattedData: SkuInventoryItem[] = ((data as any) || []).map((item: any) => ({
        id: item.id,
        skuNumber: item.sku_number,
        binSerialNumber: item.bin_serial_number,
        asin: item.asin || undefined,
        title: item.title || undefined,
        status: item.status as "in-stock" | "sold" | "reserved" | "damaged" | "ordered",
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
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
          asin: item.asin || null,
          title: item.title || null,
          status: item.status,
          date_added: item.dateAdded,
          date_sold: item.dateSold || null,
          quantity: item.quantity || 1,
          restock_date: item.restockDate || null,
          restock_quantity: item.restockQuantity || null,
          last_restock_date: item.lastRestockDate || null,
          country: selectedCountry,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newItem: SkuInventoryItem = {
        id: (data as any).id,
        skuNumber: (data as any).sku_number,
        binSerialNumber: (data as any).bin_serial_number,
        asin: (data as any).asin || undefined,
        title: (data as any).title || undefined,
        status: (data as any).status as "in-stock" | "sold" | "reserved" | "damaged" | "ordered",
        dateAdded: (data as any).date_added,
        dateSold: (data as any).date_sold || undefined,
        quantity: (data as any).quantity ?? 1,
        restockDate: (data as any).restock_date || undefined,
        restockQuantity: (data as any).restock_quantity || undefined,
        lastRestockDate: (data as any).last_restock_date || undefined,
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

      const { error } = await ((supabase as any)
        .from('sku_inventory')
        .update(updateData)
        .eq('id', id));

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
      const { error } = await ((supabase as any)
        .from('sku_inventory')
        .delete()
        .eq('id', id));

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

      const { error } = await ((supabase as any)
        .from('sku_inventory')
        .update(updateData)
        .eq('id', id));

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
      const { error: updateError } = await ((supabase as any)
        .from('sku_inventory')
        .update({ quantity: newQuantity })
        .eq('id', id));

      if (updateError) throw updateError;

      // Record the stock change with enhanced tracking
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
          change_reason: reason || (changeAmount > 0 ? 'Stock increase' : 'Stock decrease'),
          reference_type: changeAmount > 0 ? 'restock' : 'manual',
          changed_by: user?.id,
          notes: reason,
          metadata: {
            bin_serial_number: item.binSerialNumber,
            sku_number: item.skuNumber
          }
        } as any);

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

  // Bulk add items
  const bulkAdd = async (items: Omit<SkuInventoryItem, 'id'>[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const insertData = items.map(item => ({
        user_id: user.id,
        sku_number: item.skuNumber,
        bin_serial_number: item.binSerialNumber,
        asin: item.asin || null,
        title: item.title || null,
        status: item.status,
        date_added: item.dateAdded,
        date_sold: item.dateSold || null,
        quantity: item.quantity ?? 1,
        restock_date: item.restockDate || null,
        restock_quantity: item.restockQuantity || null,
        last_restock_date: item.lastRestockDate || null,
        country: selectedCountry,
      }));

      const { data, error } = await supabase
        .from('sku_inventory')
        .insert(insertData as any)
        .select();

      if (error) throw error;

      const newItems: SkuInventoryItem[] = ((data as any) || []).map((item: any) => ({
        id: item.id,
        skuNumber: item.sku_number,
        binSerialNumber: item.bin_serial_number,
        asin: item.asin || undefined,
        title: item.title || undefined,
        status: item.status as "in-stock" | "sold" | "reserved" | "damaged" | "ordered",
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        quantity: item.quantity ?? 1,
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

  // Update bin location
  const updateBinLocation = async (id: string, newBinSerial: string) => {
    try {
      const { error } = await ((supabase as any)
        .from('sku_inventory')
        .update({ bin_serial_number: newBinSerial })
        .eq('id', id));

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id 
          ? { ...item, binSerialNumber: newBinSerial }
          : item
      ));

      toast({
        title: "Bin location updated",
        description: "Item bin location has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error updating bin location",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateSku = async (id: string, newSku: string) => {
    if (!selectedCountry) return;
    
    try {
      const { error } = await ((supabase as any)
        .from('sku_inventory')
        .update({ sku_number: newSku, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('country', selectedCountry));

      if (error) throw error;

      setInventory(prev => prev.map(item =>
        item.id === id ? { ...item, skuNumber: newSku } : item
      ));

      toast({
        title: "SKU updated",
        description: "SKU number has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error updating SKU",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const bulkUpdateSkus = async (binSkuPairs: { binSerial: string; sku: string }[]) => {
    if (!selectedCountry) return;
    
    try {
      const updates = [];
      
      for (const pair of binSkuPairs) {
        const { error } = await ((supabase as any)
          .from('sku_inventory')
          .update({ sku_number: pair.sku.trim() || null })
          .eq('bin_serial_number', pair.binSerial)
          .eq('country', selectedCountry));

        if (error) {
          console.error('Error updating SKU for bin:', pair.binSerial, error);
          updates.push({ binSerial: pair.binSerial, success: false, error: error.message });
        } else {
          updates.push({ binSerial: pair.binSerial, success: true });
        }
      }

      // Update local state for successful updates
      const successfulUpdates = updates.filter(update => update.success);
      if (successfulUpdates.length > 0) {
        setInventory(prev => prev.map(item => {
          const update = binSkuPairs.find(pair => pair.binSerial === item.binSerialNumber);
          if (update) {
            return { ...item, skuNumber: update.sku };
          }
          return item;
        }));
      }

      const successCount = successfulUpdates.length;
      const failureCount = updates.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Bulk SKU update completed",
          description: `Successfully updated ${successCount} items${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        });
      } else {
        toast({
          title: "Bulk SKU update failed",
          description: "No items were updated successfully",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error updating SKUs",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateAsin = async (id: string, newAsin: string) => {
    if (!selectedCountry) return;
    
    try {
      const { error } = await ((supabase as any)
        .from('sku_inventory')
        .update({ asin: newAsin || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('country', selectedCountry));

      if (error) throw error;

      setInventory(prev => prev.map(item =>
        item.id === id ? { ...item, asin: newAsin || undefined } : item
      ));

      toast({
        title: "ASIN updated",
        description: "ASIN number has been updated successfully",
      });
    } catch (error: any) {
      throw error; // Re-throw for component to handle
    }
  };

  // Update title for an item
  const updateTitle = async (id: string, newTitle: string) => {
    if (!selectedCountry) return;
    
    try {
      const { error } = await ((supabase as any)
        .from('sku_inventory')
        .update({ title: newTitle.trim() || null })
        .eq('id', id)
        .eq('country', selectedCountry));

      if (error) throw error;

      setInventory(prev => prev.map(item =>
        item.id === id ? { ...item, title: newTitle.trim() || undefined } : item
      ));

      toast({
        title: "Title updated",
        description: "Title has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error updating title",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Bulk update titles for multiple items by SKU Number
  const bulkUpdateTitles = async (skuTitlePairs: { skuNumber: string; title: string }[]) => {
    if (!selectedCountry) return;
    
    try {
      const updates = [];
      
      for (const pair of skuTitlePairs) {
        const { error } = await ((supabase as any)
          .from('sku_inventory')
          .update({ title: pair.title.trim() || null })
          .eq('sku_number', pair.skuNumber)
          .eq('country', selectedCountry));

        if (error) {
          console.error('Error updating title for SKU:', pair.skuNumber, error);
          updates.push({ skuNumber: pair.skuNumber, success: false, error: error.message });
        } else {
          updates.push({ skuNumber: pair.skuNumber, success: true });
        }
      }

      // Update local state for successful updates
      const successfulUpdates = updates.filter(update => update.success);
      if (successfulUpdates.length > 0) {
        setInventory(prev => prev.map(item => {
          const update = skuTitlePairs.find(pair => pair.skuNumber === item.skuNumber);
          if (update) {
            return { ...item, title: update.title.trim() || undefined };
          }
          return item;
        }));
      }

      const successCount = successfulUpdates.length;
      const failureCount = updates.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Bulk title update completed",
          description: `Successfully updated ${successCount} items${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        });
      } else {
        toast({
          title: "Bulk title update failed",
          description: "No items were updated successfully",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error updating titles",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Fetch titles from Sunsky using SKU Numbers
  const fetchTitlesFromSunsky = async () => {
    try {
      // Get items with SKU Numbers but missing titles
      const itemsNeedingTitles = inventory.filter(item => 
        item.skuNumber && item.skuNumber.trim() && !item.title
      );

      if (itemsNeedingTitles.length === 0) {
        toast({
          title: "No Items to Update",
          description: "All items either have titles or are missing SKU numbers",
        });
        return;
      }

      toast({
        title: "Fetching Titles...",
        description: `Fetching titles for ${itemsNeedingTitles.length} items from Sunsky`,
      });

      const titleUpdates: { skuNumber: string; title: string }[] = [];

      for (const item of itemsNeedingTitles) {
        try {
          const { data, error } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'getProductDetails',
              skuCode: item.skuNumber
            }
          });

          if (error) {
            console.warn(`Failed to fetch title for SKU ${item.skuNumber}:`, error);
            continue;
          }

          if (data?.title) {
            titleUpdates.push({
              skuNumber: item.skuNumber,
              title: data.title
            });
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(`Error fetching title for SKU ${item.skuNumber}:`, error);
        }
      }

      if (titleUpdates.length > 0) {
        await bulkUpdateTitles(titleUpdates);
        toast({
          title: "Titles Fetched Successfully",
          description: `Updated titles for ${titleUpdates.length} out of ${itemsNeedingTitles.length} items`,
        });
      } else {
        toast({
          title: "No Titles Found",
          description: "Could not retrieve titles from Sunsky for any items",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error fetching titles from Sunsky:', error);
      toast({
        title: "Error",
        description: "Failed to fetch titles from Sunsky",
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
    updateBinLocation,
    updateSku,
    updateTitle,
    updateAsin,
    bulkUpdateSkus,
    bulkUpdateTitles,
    fetchTitlesFromSunsky,
    refetch: loadInventory,
  };
}