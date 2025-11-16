/**
 * Standard column names for different label contexts
 * This ensures consistency across all print dialogs and template mappings
 */
export const LABEL_COLUMNS = {
  // PO-specific columns
  PO: {
    PO_NUMBER: 'PO Number',
    PRIORITY: 'Priority',
    ASIN: 'asin',
    SKU_CODE: 'sku_code',
    MODEL_NUMBER: 'model_number',
    TITLE: 'title',
    QUANTITY: 'quantity',
    SUPPLIER: 'supplier',
    NOTES: 'notes',
    STATUS: 'status',
  },
  
  // Inventory-specific columns
  INVENTORY: {
    ASIN: 'asin',
    SKU: 'sku',
    TITLE: 'title',
    QUANTITY: 'quantity',
    ORDER_ID: 'order_id',
    ORDER_QUANTITY: 'order_quantity',
    PO_NUMBERS: 'po_numbers',
    PRIORITY: 'priority',
    SERIAL_NUMBER: 'serial_number',
    BIN_LOCATION: 'bin_location',
    STATUS: 'status',
  },
  
  // Amazon order columns
  AMAZON_ORDERS: {
    ORDER_ID: 'order_id',
    ASIN: 'asin',
    TITLE: 'title',
    QUANTITY: 'quantity',
    BUYER_NAME: 'buyer_name',
    SHIP_ADDRESS: 'ship_address',
  },

  // Noon order columns
  NOON_ORDERS: {
    ORDER_NR: 'order_nr',
    PURCHASE_ITEM_NR: 'purchase_item_nr',
    SKU: 'sku',
    TITLE: 'title',
    QUANTITY: 'quantity',
    SHIPMENT_NR: 'shipment_nr',
  }
};

/**
 * Helper to create dataset with standard columns
 */
export function createStandardDataset(
  context: 'PO' | 'INVENTORY' | 'AMAZON_ORDERS' | 'NOON_ORDERS',
  items: any[],
  columnMapping: Record<string, (item: any) => string>
): { headers: string[], data: any[][] } {
  const columns = LABEL_COLUMNS[context];
  const headers = Object.values(columns);
  const data = items.map(item => 
    headers.map(header => {
      const key = Object.keys(columns).find(k => columns[k as keyof typeof columns] === header);
      return key && columnMapping[key] ? columnMapping[key](item) : '';
    })
  );
  
  return { headers, data };
}

/**
 * Validate that template column mappings exist in the dataset
 */
export function validateTemplateMapping(
  elements: any[],
  datasetHeaders: string[]
): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  elements.forEach(el => {
    if (el.dataColumn) {
      const found = datasetHeaders.some(h => 
        h.toLowerCase() === el.dataColumn!.toLowerCase()
      );
      
      if (!found) {
        warnings.push(
          `Element "${el.type}" is mapped to column "${el.dataColumn}" ` +
          `which doesn't exist in the dataset. Available columns: ${datasetHeaders.join(', ')}`
        );
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}
