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
  title?: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged' | 'ordered' | 'no-stock' | 'out-of-stock';
  dateAdded: string;
  dateSold?: string;
  notes?: string;
  quantity: number;
  restockDate?: string;
  restockQuantity?: number;
  lastRestockDate?: string;
  eligible_for_restock?: boolean;
  manual_restock_override?: boolean;
  isActive?: boolean;
  first_stock_added_at?: string;
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
      // First get count to check if we need pagination
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { count, error: countError } = await ((supabase as any)
        .from('asin_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('country', selectedCountry));

      console.log(`📊 Total records in database: ${count}`);

      // Load all records without limit using pagination if needed
      let allData: any[] = [];
      const batchSize = 1000;
      let from = 0;
      
      while (true) {
        const { data: batchData, error: batchError } = await ((supabase as any)
          .from('asin_inventory')
          .select('*')
          .eq('user_id', user.id)
          .eq('country', selectedCountry)
          .order('date_added', { ascending: true })
          .range(from, from + batchSize - 1));

        if (batchError) throw batchError;
        
        if (!batchData || batchData.length === 0) break;
        
        allData = [...allData, ...batchData];
        console.log(`📦 Loaded batch: ${from + 1}-${from + batchData.length}, Total so far: ${allData.length}`);
        
        if (batchData.length < batchSize) break; // Last batch
        from += batchSize;
      }

      const data = allData;
      const error = countError;

      if (error) throw error;
      
      console.log(`🔍 Debug: Loaded ${data?.length || 0} inventory items from database`);
      if (data && data.length >= 1000) {
        console.log('⚠️ Warning: Loaded exactly 1000+ items, might be hitting a limit');
      }

      const formattedData: AsinInventoryItem[] = data.map(item => ({
        id: item.id,
        asin: item.asin,
        serialNumber: item.serial_number,
        sku: item.sku || undefined,
        title: item.title || undefined,
        status: item.status,
        dateAdded: item.date_added,
        dateSold: item.date_sold || undefined,
        notes: item.notes || undefined,
        quantity: item.quantity ?? 1,
        restockDate: item.restock_date || undefined,
        restockQuantity: item.restock_quantity || undefined,
        lastRestockDate: item.last_restock_date || undefined,
        eligible_for_restock: item.eligible_for_restock || false,
        manual_restock_override: item.manual_restock_override || false,
        isActive: item.is_active ?? true,
        first_stock_added_at: item.first_stock_added_at || undefined,
      }));

      // Log status distribution for debugging
      const statusCounts = formattedData.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 Inventory status distribution:', statusCounts);
      console.log('📊 Items with quantity=0 and no-stock status:', 
        formattedData.filter(item => item.quantity === 0 && item.status === 'no-stock').length
      );

      // Remove any remaining duplicates as a safety measure (based on ASIN + serialNumber)
      const uniqueItems = Array.from(
        new Map(formattedData.map(item => [`${item.asin}-${item.serialNumber}`, item])).values()
      );
      
      if (uniqueItems.length < formattedData.length) {
        console.warn(`⚠️ Frontend deduplication removed ${formattedData.length - uniqueItems.length} duplicate(s)`);
      }

      setInventory(uniqueItems);
      
      // Auto-calculate restock eligibility after loading inventory
      setTimeout(() => {
        calculateAutoRestockEligibility(formattedData);
      }, 100);
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
      const { data: existingItems, error: checkError } = await ((supabase as any)
        .from('asin_inventory')
        .select('serial_number, asin')
        .eq('user_id', user.id)
        .eq('serial_number', item.serialNumber));

      if (checkError) throw checkError;

      if (existingItems && existingItems.length > 0) {
        const existingAsin = (existingItems[0] as any).asin;
        throw new Error(`Serial number "${item.serialNumber}" is already used by ASIN "${existingAsin}". Each serial number must be unique across all ASINs.`);
      }

      const { data, error } = await supabase
        .from('asin_inventory')
        .insert({
          user_id: user.id,
          asin: item.asin,
          serial_number: item.serialNumber,
          sku: item.sku || null,
          title: item.title || null,
          status: item.status as any, // Type will be updated after types regenerate
          date_added: item.dateAdded,
          date_sold: item.dateSold || null,
          notes: item.notes || null,
          quantity: item.quantity || 1,
          restock_date: item.restockDate || null,
          restock_quantity: item.restockQuantity || null,
          last_restock_date: item.lastRestockDate || null,
          country: selectedCountry,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newItem: AsinInventoryItem = {
        id: (data as any).id,
        asin: (data as any).asin,
        serialNumber: (data as any).serial_number,
        sku: (data as any).sku,
        title: (data as any).title || undefined,
        status: (data as any).status,
        dateAdded: (data as any).date_added,
        dateSold: (data as any).date_sold || undefined,
        notes: (data as any).notes || undefined,
        quantity: (data as any).quantity ?? 1,
        restockDate: (data as any).restock_date || undefined,
        restockQuantity: (data as any).restock_quantity || undefined,
        lastRestockDate: (data as any).last_restock_date || undefined,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const item = inventory.find(i => i.id === id);
      if (!item) throw new Error('Item not found');

      const updateData: any = { status };
      if (status === 'sold') {
        updateData.date_sold = new Date().toISOString();
      }

      const { error } = await ((supabase as any)
        .from('asin_inventory')
        .update(updateData)
        .eq('id', id));

      if (error) throw error;

      // Record stock change when marking as sold
      if (status === 'sold' && item.quantity > 0) {
        await supabase.from('stock_changes').insert({
          inventory_id: item.id,
          inventory_type: 'asin',
          asin: item.asin,
          sku_number: item.sku || null,
          serial_number: item.serialNumber,
          previous_quantity: item.quantity,
          new_quantity: 0,
          change_amount: -item.quantity,
          change_reason: 'Item marked as sold',
          reference_type: 'sale',
          changed_by: user.id,
          user_id: user.id,
          notes: `Status changed from ${item.status} to sold`
        });
      }

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
        .from('asin_inventory')
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
        .insert(insertData as any) // Type will be updated after types regenerate
        .select();

      if (error) throw error;

      const newItems: AsinInventoryItem[] = (data as any).map((item: any) => ({
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
      // Get current data from database first
      const { data: currentItem, error: fetchError } = await ((supabase as any)
        .from('asin_inventory')
        .select('quantity, asin, sku, serial_number, title, status')
        .eq('id', id)
        .single());

      if (fetchError || !currentItem) {
        throw new Error('Item not found in database');
      }

      const previousQuantity = currentItem.quantity;
      const changeAmount = quantity - previousQuantity;

      const updateData: any = { 
        quantity,
        last_restock_date: new Date().toISOString(),
        restock_quantity: quantity
      };

      // If item was marked as ordered, change status back to in-stock
      if (currentItem.status === 'ordered') {
        updateData.status = 'in-stock';
      }

      const { error } = await ((supabase as any)
        .from('asin_inventory')
        .update(updateData)
        .eq('id', id));

      if (error) throw error;

      // Record the stock change
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('stock_changes')
        .insert({
          user_id: user?.id,
          inventory_type: 'asin',
          inventory_id: id,
          asin: currentItem.asin,
          serial_number: currentItem.serial_number,
          sku_number: currentItem.sku,
          previous_quantity: previousQuantity,
          new_quantity: quantity,
          change_amount: changeAmount,
          change_reason: 'Restock',
          reference_type: 'restock',
          changed_by: user?.id,
          metadata: {
            sku: currentItem.sku,
            title: currentItem.title
          }
        } as any);

      // Refresh inventory
      await loadInventory();

      toast({
        title: "Item restocked",
        description: `Updated from ${previousQuantity} to ${quantity}${currentItem.status === 'ordered' ? ' and status updated to in-stock' : ''}`,
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
      // Get current data from database first to ensure accurate previous_quantity
      const { data: currentItem, error: fetchError } = await ((supabase as any)
        .from('asin_inventory')
        .select('quantity, asin, sku, serial_number, title')
        .eq('id', id)
        .single());

      if (fetchError || !currentItem) {
        throw new Error('Item not found in database');
      }

      const previousQuantity = currentItem.quantity;
      const changeAmount = newQuantity - previousQuantity;

      // Update the inventory quantity (triggers will handle status automatically)
      const { error: updateError } = await ((supabase as any)
        .from('asin_inventory')
        .update({ quantity: newQuantity })
        .eq('id', id));

      if (updateError) throw updateError;

      // Record the stock change with enhanced tracking
      const { data: { user } } = await supabase.auth.getUser();
      const { error: changeError } = await supabase
        .from('stock_changes')
        .insert({
          user_id: user?.id,
          inventory_type: 'asin',
          inventory_id: id,
          asin: currentItem.asin,
          serial_number: currentItem.serial_number,
          sku_number: currentItem.sku,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          change_amount: changeAmount,
          change_reason: reason || (changeAmount > 0 ? 'Stock increase' : 'Stock decrease'),
          reference_type: changeAmount > 0 ? 'restock' : 'manual',
          changed_by: user?.id,
          notes: reason,
          metadata: {
            sku: currentItem.sku,
            title: currentItem.title
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

  const updateBin = async (id: string, binLocation: string) => {
    try {
      const { error } = await ((supabase as any)
        .from('asin_inventory')
        .update({ notes: binLocation })
        .eq('id', id));

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
      const { error } = await ((supabase as any)
        .from('asin_inventory')
        .update({ sku: newSku.trim() || null })
        .eq('id', id)
        .eq('user_id', profile.id));

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

  // Get next available serial number - simplified logic
  const getNextAvailableSerial = async (): Promise<string> => {
    if (!profile) return '';

    try {
      // Single query to get all existing 5-digit serial numbers
      const { data: existingSerials, error } = await ((supabase as any)
        .from('asin_inventory')
        .select('serial_number')
        .eq('user_id', profile.id)
        .like('serial_number', '_____') // 5 digits
        .order('serial_number', { ascending: true }));

      if (error) throw error;

      // Build Set of existing serials for fast lookup
      const serialSet = new Set(
        (existingSerials || [])
          .map((item: any) => item.serial_number)
          .filter((s: string) => s && /^\d{5}$/.test(s))
      );

      // If no serials exist, start at 00001
      if (serialSet.size === 0) {
        return '00001';
      }

      // Convert to numbers and find max
      const serialNumbers = Array.from(serialSet)
        .map((s: string) => parseInt(s, 10));
      const maxSerial = Math.max(...serialNumbers);

      // Strategy 1: Fill gaps first (1 to max)
      for (let i = 1; i <= maxSerial; i++) {
        const candidate = i.toString().padStart(5, '0');
        if (!serialSet.has(candidate)) {
          return candidate; // Found a gap!
        }
      }

      // Strategy 2: No gaps, continue from max
      return (maxSerial + 1).toString().padStart(5, '0');

    } catch (error) {
      console.error('Error getting next serial:', error);
      return '';
    }
  };

  // Update Serial Number for an item with auto-retry - simplified
  const updateSerialNumber = async (id: string, newSerialNumber: string) => {
    if (!profile) return;

    const serial = newSerialNumber.trim();
    let finalSerial = serial;
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check if serial is already in use
        const { data: existingItems, error: checkError } = await ((supabase as any)
          .from('asin_inventory')
          .select('id, asin')
          .eq('user_id', profile.id)
          .eq('serial_number', finalSerial)
          .neq('id', id));

        if (checkError) throw checkError;

        // If duplicate found, increment and retry
        if (existingItems && existingItems.length > 0) {
          const existingAsin = existingItems[0].asin;
          const serialNum = parseInt(finalSerial, 10);
          
          if (isNaN(serialNum) || attempt === maxAttempts) {
            throw new Error(
              `Serial number "${finalSerial}" is already used by ASIN "${existingAsin}".`
            );
          }
          
          finalSerial = (serialNum + 1).toString().padStart(5, '0');
          continue; // Try next serial
        }

        // Serial is available, update it
        const { error } = await ((supabase as any)
          .from('asin_inventory')
          .update({ serial_number: finalSerial })
          .eq('id', id)
          .eq('user_id', profile.id));

        if (error) throw error;

        // Update local state
        setInventory(prev => prev.map(item => 
          item.id === id ? { ...item, serialNumber: finalSerial } : item
        ));

        // Show success toast
        const message = finalSerial !== serial
          ? `Serial adjusted to ${finalSerial} (${serial} was in use)`
          : 'Serial number updated successfully';

        toast({
          title: "Serial Number Updated",
          description: message,
        });

        return; // Success!

      } catch (error) {
        toast({
          title: "Error updating serial number",
          description: error instanceof Error ? error.message : "Failed to update serial number",
          variant: "destructive",
        });
        return;
      }
    }
  };

  // Bulk update SKUs for multiple items by ASIN
  const bulkUpdateSkus = async (asinSkuPairs: { asin: string; sku: string }[]) => {
    if (!profile) return;

    try {
      const updates = [];
      
      for (const pair of asinSkuPairs) {
        const { error } = await ((supabase as any)
          .from('asin_inventory')
          .update({ sku: pair.sku.trim() || null })
          .eq('asin', pair.asin)
          .eq('user_id', profile.id));

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

  // Update title for an item
  const updateTitle = async (id: string, newTitle: string) => {
    if (!profile) return;

    try {
      const { error } = await ((supabase as any)
        .from('asin_inventory')
        .update({ title: newTitle.trim() || null })
        .eq('id', id)
        .eq('user_id', profile.id));

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === id ? { ...item, title: newTitle.trim() || undefined } : item
      ));

      toast({
        title: "Title Updated",
        description: `Title has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive",
      });
    }
  };

  // Bulk update titles for multiple items by ASIN
  const bulkUpdateTitles = async (asinTitlePairs: { asin: string; title: string }[]) => {
    if (!profile) return;

    try {
      const updates = [];
      
      for (const pair of asinTitlePairs) {
        const { error } = await ((supabase as any)
          .from('asin_inventory')
          .update({ title: pair.title.trim() || null })
          .eq('asin', pair.asin)
          .eq('user_id', profile.id));

        if (error) throw error;
        updates.push(pair);
      }

      // Update local state
      setInventory(prev => prev.map(item => {
        const update = asinTitlePairs.find(pair => pair.asin === item.asin);
        return update ? { ...item, title: update.title.trim() || undefined } : item;
      }));

      toast({
        title: "Titles Updated",
        description: `Successfully updated ${updates.length} inventory items`,
      });
    } catch (error) {
      console.error('Error bulk updating titles:', error);
      toast({
        title: "Error",
        description: "Failed to update titles",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Fetch titles from Sunsky using SKUs
  const fetchTitlesFromSunsky = async () => {
    if (!profile) return;

    try {
      // Get items with SKUs but missing titles
      const itemsNeedingTitles = inventory.filter(item => 
        item.sku && item.sku.trim() && !item.title
      );

      if (itemsNeedingTitles.length === 0) {
        toast({
          title: "No Items to Update",
          description: "All items either have titles or are missing SKUs",
        });
        return;
      }

      toast({
        title: "Fetching Titles...",
        description: `Fetching titles for ${itemsNeedingTitles.length} items from Sunsky`,
      });

      const titleUpdates: { asin: string; title: string }[] = [];

      for (const item of itemsNeedingTitles) {
        try {
          const { data, error } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'getProductDetails',
              skuCode: item.sku
            }
          });

          if (error) {
            console.warn(`Failed to fetch title for SKU ${item.sku}:`, error);
            continue;
          }

          if (data?.title) {
            titleUpdates.push({
              asin: item.asin,
              title: data.title
            });
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(`Error fetching title for SKU ${item.sku}:`, error);
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

  // Simplified auto-calculate restock eligibility
  const calculateAutoRestockEligibility = async (items: AsinInventoryItem[]) => {
    if (!items.length) return;
    
    try {
      const updates: { id: string; eligible: boolean }[] = [];
      
      for (const item of items.slice(0, 10)) { // Process only first 10 items to avoid timeout
        // Skip items with manual override
        if (item.manual_restock_override) {
          console.log(`Skipping auto-calc for ${item.asin}: manual override active`);
          continue;
        }
        // Use first_stock_added_at if available, otherwise query stock_changes for first positive change
        let referenceDate = item.first_stock_added_at;
        
        if (!referenceDate) {
          // Fallback: Query first positive stock change
          const { data: firstAddition } = await ((supabase as any)
            .from('stock_changes')
            .select('created_at')
            .eq('inventory_id', item.id)
            .eq('inventory_type', 'asin')
            .gt('change_amount', 0)
            .order('created_at', { ascending: true })
            .limit(1)
            .single());
          
          referenceDate = firstAddition?.created_at || item.dateAdded;
        }
        
        const cutoffDate = new Date(referenceDate);
        cutoffDate.setDate(cutoffDate.getDate() + 90);
        
        const { data: changes } = await ((supabase as any)
          .from('stock_changes')
          .select('id')
          .eq('inventory_id', item.id)
          .lt('change_amount', 0)
          .gte('created_at', referenceDate)
          .lte('created_at', cutoffDate.toISOString())
          .limit(1));

        const shouldBeEligible = Boolean(changes && changes.length > 0);
        
        if (item.eligible_for_restock !== shouldBeEligible) {
          updates.push({ id: item.id, eligible: shouldBeEligible });
        }
      }

      if (updates.length > 0) {
        for (const update of updates) {
          await ((supabase as any)
            .from('asin_inventory')
            .update({ eligible_for_restock: update.eligible })
            .eq('id', update.id));
        }

        setInventory(prev => prev.map(item => {
          const update = updates.find(u => u.id === item.id);
          return update ? { ...item, eligible_for_restock: update.eligible } : item;
        }));
      }
    } catch (error) {
      console.error('Auto-eligibility calculation error:', error);
    }
  };

  // Update restock eligibility (manual override)
  const updateRestockEligibility = async (itemId: string, eligible: boolean) => {
    try {
      const { error } = await ((supabase as any)
        .from('asin_inventory')
        .update({ eligible_for_restock: eligible })
        .eq('id', itemId));

      if (error) throw error;

      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, eligible_for_restock: eligible }
          : item
      ));

      toast({
        title: "Manual Override",
        description: `Item manually ${eligible ? 'enabled' : 'disabled'} for restock`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Toggle item active/inactive status
  const toggleItemActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await ((supabase as any)
        .from('asin_inventory')
        .update({ is_active: isActive })
        .eq('id', id));

      if (error) throw error;

      // Update local state
      setInventory(prev => 
        prev.map(item => 
          item.id === id ? { ...item, isActive } : item
        )
      );

      toast({
        title: isActive ? "Item Enabled" : "Item Disabled",
        description: isActive 
          ? "Item has been enabled and will appear in all operations"
          : "Item has been disabled and will be hidden from exports and restock calculations",
      });
    } catch (error) {
      console.error('Error toggling item status:', error);
      toast({
        title: "Error",
        description: "Failed to update item status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Refetch wrapper that clears cache and reloads
  const refetch = async () => {
    setInventory([]);
    await loadInventory();
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
    updateSerialNumber,
    updateTitle,
    bulkUpdateSkus,
    bulkUpdateTitles,
    fetchTitlesFromSunsky,
    updateRestockEligibility,
    calculateAutoRestockEligibility,
    toggleItemActive,
    loadInventory,
    refetch,
    getNextAvailableSerial,
  };
}