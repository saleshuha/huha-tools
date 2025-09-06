import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NoonOrderItem {
  id: string;
  order_nr: string;
  purchase_item_nr: string;
  sku?: string;
  partner_sku?: string;
  title?: string;
  quantity: number;
  item_status: string;
  order_received_at?: string;
  file_name?: string;
}

export interface InventoryItem {
  id: string;
  asin?: string;
  sku?: string;
  sku_number?: string;
  title?: string;
  quantity: number;
  status: string;
  type: 'asin' | 'sku';
  serial_number?: string;
  bin_serial_number?: string;
}

export interface OrderItem {
  id: string;
  order_number: string;
  asin?: string;
  sku?: string;
  item_title?: string;
  quantity_processed: number;
  match_type: string;
  inventory_type: string;
  processed_at: string;
}

export function useInventoryData() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [noonOrders, setNoonOrders] = useState<NoonOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ASIN inventory
      const { data: asinData, error: asinError } = await supabase
        .from('asin_inventory')
        .select('id, asin, sku, quantity, status, serial_number')
        .order('created_at', { ascending: false });

      if (asinError) throw asinError;

      // Fetch SKU inventory
      const { data: skuData, error: skuError } = await supabase
        .from('sku_inventory')
        .select('id, sku_number, quantity, status, bin_serial_number')
        .order('created_at', { ascending: false });

      if (skuError) throw skuError;

      // Combine and format the data
      const combinedInventory: InventoryItem[] = [
        ...(asinData || []).map(item => ({
          ...item,
          type: 'asin' as const,
          title: `ASIN: ${item.asin}${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        })),
        ...(skuData || []).map(item => ({
          ...item,
          type: 'sku' as const,
          sku: item.sku_number,
          title: `SKU: ${item.sku_number}`,
        })),
      ];

      setInventory(combinedInventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchNoonOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('noon_processing_orders')
        .select('id, order_nr, purchase_item_nr, sku, partner_sku, title, quantity, item_status, order_received_at, file_name')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setNoonOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch noon orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessedOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('processed_orders')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getInventoryDataset = () => {
    const headers = ['ID', 'Type', 'ASIN', 'SKU', 'Title', 'Quantity', 'Status', 'Serial/Bin'];
    const data = inventory.map(item => [
      item.id,
      item.type,
      item.asin || '',
      item.sku || item.sku_number || '',
      item.title || '',
      item.quantity.toString(),
      item.status,
      item.serial_number || item.bin_serial_number || '',
    ]);

    return {
      id: 'inventory',
      name: 'Inventory Data',
      description: 'Current inventory with ASIN, SKU, and Title data',
      headers,
      data,
      rowCount: data.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const getNoonOrdersDataset = () => {
    const headers = ['Order Number', 'Purchase Item Number', 'SKU', 'Partner SKU', 'Title', 'Quantity', 'Status', 'Order Date', 'File Name'];
    const data = noonOrders.map(order => [
      order.order_nr || '',
      order.purchase_item_nr || '',
      order.sku || '',
      order.partner_sku || '',
      order.title || '',
      order.quantity.toString(),
      order.item_status || '',
      order.order_received_at ? new Date(order.order_received_at).toLocaleDateString() : '',
      order.file_name || '',
    ]);

    return {
      id: 'noon_orders',
      name: 'Noon Orders',
      description: 'Noon processing orders for label printing',
      headers,
      data,
      rowCount: data.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const getOrdersDataset = () => {
    const headers = ['Order Number', 'ASIN', 'SKU', 'Title', 'Quantity', 'Match Type', 'Inventory Type', 'Processed At'];
    const data = orders.map(order => [
      order.order_number,
      order.asin || '',
      order.sku || '',
      order.item_title || '',
      order.quantity_processed.toString(),
      order.match_type,
      order.inventory_type,
      new Date(order.processed_at).toLocaleDateString(),
    ]);

    return {
      id: 'orders',
      name: 'Processed Orders',
      description: 'Recently processed orders for label printing',
      headers,
      data,
      rowCount: data.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const searchInventory = (searchTerm: string) => {
    if (!searchTerm.trim()) return inventory;
    
    const term = searchTerm.toLowerCase();
    return inventory.filter(item => 
      item.asin?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term) ||
      item.sku_number?.toLowerCase().includes(term) ||
      item.title?.toLowerCase().includes(term)
    );
  };

  const searchNoonOrders = (searchTerm: string) => {
    if (!searchTerm.trim()) return noonOrders;
    
    const term = searchTerm.toLowerCase();
    return noonOrders.filter(order => 
      order.order_nr?.toLowerCase().includes(term) ||
      order.sku?.toLowerCase().includes(term) ||
      order.partner_sku?.toLowerCase().includes(term) ||
      order.title?.toLowerCase().includes(term)
    );
  };

  useEffect(() => {
    fetchInventory();
    fetchProcessedOrders();
    fetchNoonOrders();
  }, []);

  return {
    inventory,
    orders,
    noonOrders,
    loading,
    error,
    fetchInventory,
    fetchProcessedOrders,
    fetchNoonOrders,
    getInventoryDataset,
    getOrdersDataset,
    getNoonOrdersDataset,
    searchInventory,
    searchNoonOrders,
  };
}