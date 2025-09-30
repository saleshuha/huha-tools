import { supabase } from '@/integrations/supabase/client';

export type InventoryStatus = 'no-stock' | 'in-stock' | 'out-of-stock' | 'sold' | 'reserved' | 'damaged' | 'ordered';

export interface StatusInfo {
  status: InventoryStatus;
  displayLabel: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  hasStockHistory: boolean;
}

/**
 * Determines the correct inventory status based on quantity and stock change history
 */
export async function getInventoryStatus(
  inventoryId: string,
  currentQuantity: number,
  currentStatus: string,
  inventoryType: 'asin' | 'sku'
): Promise<StatusInfo> {
  // If status is manually set to reserved, damaged, or ordered, respect that
  if (['reserved', 'damaged', 'ordered'].includes(currentStatus)) {
    return {
      status: currentStatus as InventoryStatus,
      displayLabel: currentStatus === 'ordered' ? 'Ordered' : currentStatus === 'reserved' ? 'Reserved' : 'Damaged',
      badgeVariant: currentStatus === 'ordered' ? 'secondary' : currentStatus === 'reserved' ? 'outline' : 'destructive',
      hasStockHistory: true // Assume true for these statuses
    };
  }

  // Check if there are any stock changes for this item
  const { data: stockChanges, error } = await supabase
    .from('stock_changes')
    .select('id, change_amount, created_at')
    .eq('inventory_id', inventoryId)
    .eq('inventory_type', inventoryType)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error checking stock history:', error);
    // Fallback to simple logic if we can't check history
    return {
      status: currentQuantity > 0 ? 'in-stock' : 'no-stock',
      displayLabel: currentQuantity > 0 ? 'In Stock' : 'No Stock',
      badgeVariant: currentQuantity > 0 ? 'default' : 'secondary',
      hasStockHistory: false
    };
  }

  const hasStockHistory = stockChanges && stockChanges.length > 0;

  // Determine status based on quantity and stock history
  if (currentQuantity > 0) {
    return {
      status: 'in-stock',
      displayLabel: 'In Stock',
      badgeVariant: 'default',
      hasStockHistory
    };
  }

  // currentQuantity = 0
  if (!hasStockHistory) {
    // No stock changes = item was added but never had stock
    return {
      status: 'no-stock',
      displayLabel: 'No Stock',
      badgeVariant: 'secondary',
      hasStockHistory: false
    };
  }

  // Has stock history and quantity is 0
  // Check if there were any additions (stock was added at some point)
  const hasAdditions = stockChanges.some(sc => sc.change_amount > 0);
  
  if (hasAdditions) {
    // Stock was added and now is 0 = out of stock or sold
    // If explicitly marked as sold, keep it as sold
    if (currentStatus === 'sold') {
      return {
        status: 'sold',
        displayLabel: 'Sold',
        badgeVariant: 'secondary',
        hasStockHistory: true
      };
    }
    
    // Otherwise it's out of stock (stock was depleted)
    return {
      status: 'out-of-stock',
      displayLabel: 'Out of Stock',
      badgeVariant: 'destructive',
      hasStockHistory: true
    };
  }

  // Only reductions in history but never had additions = anomaly, treat as no stock
  return {
    status: 'no-stock',
    displayLabel: 'No Stock',
    badgeVariant: 'secondary',
    hasStockHistory: true
  };
}

/**
 * Determines status synchronously based on available data
 * Use this when you already have stock change information
 */
export function calculateInventoryStatus(
  currentQuantity: number,
  currentStatus: string,
  hasStockChanges: boolean,
  hasStockAdditions: boolean
): StatusInfo {
  // If status is manually set to reserved, damaged, or ordered, respect that
  if (['reserved', 'damaged', 'ordered'].includes(currentStatus)) {
    return {
      status: currentStatus as InventoryStatus,
      displayLabel: currentStatus === 'ordered' ? 'Ordered' : currentStatus === 'reserved' ? 'Reserved' : 'Damaged',
      badgeVariant: currentStatus === 'ordered' ? 'secondary' : currentStatus === 'reserved' ? 'outline' : 'destructive',
      hasStockHistory: hasStockChanges
    };
  }

  if (currentQuantity > 0) {
    return {
      status: 'in-stock',
      displayLabel: 'In Stock',
      badgeVariant: 'default',
      hasStockHistory: hasStockChanges
    };
  }

  // currentQuantity = 0
  if (!hasStockChanges) {
    return {
      status: 'no-stock',
      displayLabel: 'No Stock',
      badgeVariant: 'secondary',
      hasStockHistory: false
    };
  }

  // Has stock history and quantity is 0
  if (hasStockAdditions) {
    if (currentStatus === 'sold') {
      return {
        status: 'sold',
        displayLabel: 'Sold',
        badgeVariant: 'secondary',
        hasStockHistory: true
      };
    }
    
    return {
      status: 'out-of-stock',
      displayLabel: 'Out of Stock',
      badgeVariant: 'destructive',
      hasStockHistory: true
    };
  }

  return {
    status: 'no-stock',
    displayLabel: 'No Stock',
    badgeVariant: 'secondary',
    hasStockHistory: hasStockChanges
  };
}
