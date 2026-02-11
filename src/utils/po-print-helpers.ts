// Helper functions for PO printing
import { POOrder } from '@/components/POTracker';

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
        sku_code: order.sku_code
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
    sku_code: order.sku_code
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
