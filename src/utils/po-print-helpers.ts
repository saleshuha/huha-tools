// Helper functions for PO printing
import { POOrder } from '@/components/POTracker';
import { supabase } from '@/integrations/supabase/client';

export interface POPrintItem {
  asin: string;
  title: string;
  quantity: number;
  poNumbers: string[];
  priority?: number;
  imageUrl?: string;
  model_number?: string;
  sku_code?: string;
  
  // Stock fulfillment tracking
  fulfilledFromStock?: boolean;
  stockQuantity?: number;         // Quantity from stock
  supplierQuantity?: number;       // Quantity from supplier
  inventorySource?: string;        // "ASIN" | "SKU" | "SKU-ASIN"
  serialNumber?: string;           // Serial/bin numbers used
  fulfillmentNotes?: string;       // Notes about fulfillment
  
  // Inventory availability
  inventoryQty?: number;           // Current in-stock inventory quantity
  inventoryStatus?: string;        // "in-stock" | "ordered" | etc.
  
  // External inventory reference
  shippedQty?: number;             // Total shipped orders quantity for this ASIN
  fbaQty?: number;                 // FBA inventory quantity for this ASIN
  
  // Print tracking
  printedQuantity?: number;        // How many labels already printed
}

/**
 * Aggregate PO items by ASIN, combining quantities and PO numbers
 */
export const aggregatePOItemsByASIN = (orders: POOrder[]): POPrintItem[] => {
  const asinMap = new Map<string, POPrintItem>();
  
  orders.forEach(order => {
    const asinKey = order.asin?.trim() || order.sku_code || order.model_number || `unknown-${order.id}`;
    
    if (asinMap.has(asinKey)) {
      const existing = asinMap.get(asinKey)!;
      existing.quantity += order.quantity;
      existing.printedQuantity = (existing.printedQuantity || 0) + (order.printed_quantity || 0);
      if (!existing.poNumbers.includes(order.po_number)) {
        existing.poNumbers.push(order.po_number);
      }
      // Track highest priority (lowest number)
      if (order.priority && (!existing.priority || order.priority < existing.priority)) {
        existing.priority = order.priority;
      }
    } else {
      asinMap.set(asinKey, {
        asin: order.asin || asinKey,
        title: order.title || 'No Title',
        quantity: order.quantity,
        poNumbers: [order.po_number],
        priority: order.priority || 3,
        model_number: order.model_number,
        sku_code: order.sku_code,
        printedQuantity: order.printed_quantity || 0
      });
    }
  });
  
  return Array.from(asinMap.values());
};

/**
 * Convert individual PO orders to print items
 */
export const convertOrdersToPrintItems = (orders: POOrder[]): POPrintItem[] => {
  return orders.map(order => ({
    asin: order.asin || order.sku_code || order.model_number || 'N/A',
    title: order.title || 'No Title',
    quantity: order.quantity,
    poNumbers: [order.po_number],
    priority: order.priority || 3,
    model_number: order.model_number,
    sku_code: order.sku_code,
    printedQuantity: order.printed_quantity || 0
  }));
};

/**
 * Format PO numbers for display
 */
export const formatPONumbers = (poNumbers: string[]): string => {
  if (poNumbers.length === 1) return poNumbers[0];
  if (poNumbers.length <= 3) return poNumbers.join(', ');
  return `${poNumbers.slice(0, 2).join(', ')} +${poNumbers.length - 2} more`;
};

/**
 * Fetch total printed_quantity per ASIN across ALL PO orders (bypasses filters)
 */
export const fetchTotalPrintedByASIN = async (asins: string[], userId: string): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  if (!asins.length || !userId) return result;

  const uniqueAsins = [...new Set(asins.filter(Boolean))];
  
  const { data, error } = await supabase
    .from('po_orders')
    .select('asin, printed_quantity')
    .eq('user_id', userId)
    .in('asin', uniqueAsins);

  if (error) {
    console.error('Failed to fetch total printed quantities:', error);
    return result;
  }

  (data || []).forEach((row: any) => {
    const asin = row.asin;
    const qty = row.printed_quantity || 0;
    result.set(asin, (result.get(asin) || 0) + qty);
  });

  console.log('📊 fetchTotalPrintedByASIN:', Object.fromEntries(result));
  return result;
};

/**
 * Fetch shipped orders quantity per ASIN
 */
export const fetchShippedQtyByASIN = async (asins: string[], userId: string): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  if (!asins.length || !userId) return result;

  const uniqueAsins = [...new Set(asins.filter(Boolean))];

  const { data, error } = await supabase
    .from('shipped_orders' as any)
    .select('asin, quantity')
    .eq('user_id', userId)
    .in('asin', uniqueAsins);

  if (error) {
    console.error('Failed to fetch shipped quantities:', error);
    return result;
  }

  (data || []).forEach((row: any) => {
    const asin = row.asin;
    const qty = row.quantity || 0;
    result.set(asin, (result.get(asin) || 0) + qty);
  });

  return result;
};

/**
 * Fetch FBA inventory quantity per ASIN
 */
export const fetchFbaQtyByASIN = async (asins: string[], userId: string): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  if (!asins.length || !userId) return result;

  const uniqueAsins = [...new Set(asins.filter(Boolean))];

  const { data, error } = await supabase
    .from('fba_inventory')
    .select('asin, quantity')
    .eq('user_id', userId)
    .in('asin', uniqueAsins);

  if (error) {
    console.error('Failed to fetch FBA quantities:', error);
    return result;
  }

  (data || []).forEach((row: any) => {
    const asin = row.asin;
    const qty = row.quantity || 0;
    result.set(asin, (result.get(asin) || 0) + qty);
  });

  return result;
};
