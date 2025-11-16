import { POOrder } from '@/components/POTracker';
import { POPrintItem, aggregatePOItemsByASIN, convertOrdersToPrintItems } from './po-print-helpers';

/**
 * Convert workspace orders to print items
 * Handles both aggregated and individual modes
 */
export function convertWorkspaceOrdersToPrintItems(
  orders: POOrder[], 
  aggregate: boolean = false
): POPrintItem[] {
  // Convert to print items
  let printItems = convertOrdersToPrintItems(orders);
  
  // Apply aggregation if requested
  if (aggregate) {
    printItems = aggregatePOItemsByASIN(orders);
  }
  
  // Enrich with workspace-specific local data
  return printItems.map(item => {
    // Find matching workspace order(s) with local modifications
    const matchingOrders = orders.filter(order => 
      (order.asin && order.asin === item.asin) ||
      (order.sku_code && order.sku_code === item.sku_code)
    );
    
    // Check if any matching order is marked as from stock locally
    const hasLocalStock = matchingOrders.some(o => o._localFromStock);
    const totalLocalStockQty = matchingOrders.reduce((sum, o) => 
      sum + (o._localStockQuantity || 0), 0
    );
    
    // Get image URL from workspace data
    const imageUrl = matchingOrders.find(o => o._workspaceImageUrl)?._workspaceImageUrl;
    
    return {
      ...item,
      priority: item.priority || 3,
      imageUrl: imageUrl,
      fulfilledFromStock: hasLocalStock,
      stockQuantity: totalLocalStockQty,
      supplierQuantity: hasLocalStock ? item.quantity - totalLocalStockQty : item.quantity,
      inventorySource: hasLocalStock ? 'Workspace' : undefined,
      fulfillmentNotes: hasLocalStock ? 'Marked in workspace (not saved to database)' : undefined
    };
  });
}

/**
 * Export workspace data to a simple object for sharing/saving
 */
export function exportWorkspaceState(
  orders: POOrder[],
  settings: {
    printFormat: 'document' | 'label';
    includeImages: boolean;
    bulkAggregate: boolean;
  }
) {
  return {
    timestamp: new Date().toISOString(),
    orderCount: orders.length,
    orders: orders.map(o => ({
      id: o.id,
      po_number: o.po_number,
      asin: o.asin,
      sku_code: o.sku_code,
      title: o.title,
      quantity: o.quantity,
      _localFromStock: o._localFromStock,
      _localStockQuantity: o._localStockQuantity
    })),
    settings
  };
}

/**
 * Import workspace state from exported data
 */
export function importWorkspaceState(data: any): {
  orders: Partial<POOrder>[];
  settings: any;
} {
  return {
    orders: data.orders || [],
    settings: data.settings || {}
  };
}
